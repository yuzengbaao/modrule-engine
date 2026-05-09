import type { Context } from '@devvit/public-api';
import type {
  Rule,
  RuleSet,
  LogEntry,
  EvaluationContext,
  PostData,
  CommentData,
  Condition,
  Action,
  RuleTestResult,
} from '../types/index.js';
import { evaluateCondition } from './conditions.js';
import { executeAction } from './executor.js';
import { generateId, now } from '../utils/helpers.js';

const RULES_KEY = 'modrule:rules';
const LOGS_KEY = 'modrule:logs';
const LOGS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Core rule engine: evaluates posts/comments against configured rules
 * and executes matching actions.
 */
export class ModRuleEngine {
  private _rulesCache: Rule[] | null = null;

  /** Load rules from Redis */
  async loadRules(context: Context): Promise<Rule[]> {
    if (this._rulesCache) return this._rulesCache;
    const raw = await context.redis.get(RULES_KEY);
    if (!raw) return [];
    const set: RuleSet = JSON.parse(raw);
    this._rulesCache = set.rules.sort((a, b) => b.priority - a.priority);
    return this._rulesCache;
  }

  /** Save rules to Redis and invalidate cache */
  async saveRules(context: Context, rules: Rule[]): Promise<void> {
    const set: RuleSet = { rules, version: Date.now() };
    await context.redis.set(RULES_KEY, JSON.stringify(set));
    this._rulesCache = null;
  }

  /** Invalidate cache */
  invalidateCache(): void {
    this._rulesCache = null;
  }

  /** Evaluate a post against all rules */
  async evaluatePost(post: PostData, context: Context): Promise<LogEntry[]> {
    const rules = await this.loadRules(context);
    const evalContext: EvaluationContext = { post };
    const results: LogEntry[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.target === 'comment') continue;

      const log = await this._evaluateRule(rule, evalContext, context);
      if (log) results.push(log);
    }
    return results;
  }

  /** Evaluate a comment against all rules */
  async evaluateComment(comment: CommentData, context: Context): Promise<LogEntry[]> {
    const rules = await this.loadRules(context);
    const evalContext: EvaluationContext = { comment };
    const results: LogEntry[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.target === 'post') continue;

      const log = await this._evaluateRule(rule, evalContext, context);
      if (log) results.push(log);
    }
    return results;
  }

  /** Test a rule against mock data without executing actions */
  async testRule(rule: Rule, evalContext: EvaluationContext): Promise<RuleTestResult> {
    const conditionResults = rule.conditions.map((cond) => ({
      conditionId: cond.id,
      conditionName: `${cond.field} ${cond.operator} ${String(cond.value)}`,
      passed: evaluateCondition(cond, evalContext),
      actualValue: this._getFieldValue(cond.field, evalContext),
      expectedValue: cond.value,
    }));

    const matched =
      rule.conditionLogic === 'all'
        ? conditionResults.every((r) => r.passed)
        : conditionResults.some((r) => r.passed);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      conditionResults,
      actionsThatWouldRun: matched ? rule.actions.map((a) => a.type) : [],
    };
  }

  /** Run a single rule evaluation + optional action execution */
  private async _evaluateRule(
    rule: Rule,
    evalContext: EvaluationContext,
    context: Context
  ): Promise<LogEntry | null> {
    const start = performance.now();
    const matched = this._matchRule(rule, evalContext);

    if (!matched) return null;

    // Update match stats
    rule.matchCount += 1;
    rule.lastMatchAt = now();

    const executed: string[] = [];
    const failed: string[] = [];

    for (const action of rule.actions) {
      try {
        await executeAction(action, evalContext, context);
        executed.push(action.type);
      } catch (err) {
        failed.push(action.type);
        console.error(`Action ${action.type} failed for rule ${rule.name}:`, err);
      }
    }

    const log: LogEntry = {
      id: generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      targetType: rule.target,
      targetId: evalContext.post?.id ?? evalContext.comment?.id ?? 'unknown',
      targetAuthor: evalContext.post?.author ?? evalContext.comment?.author ?? 'unknown',
      matchedConditions: rule.conditions.map((c) => c.id),
      executedActions: executed,
      failedActions: failed,
      timestamp: now(),
      executionTimeMs: Math.round(performance.now() - start),
    };

    await this._persistLog(context, log);
    return log;
  }

  /** Check if a rule matches the evaluation context */
  private _matchRule(rule: Rule, evalContext: EvaluationContext): boolean {
    const results = rule.conditions.map((c) => evaluateCondition(c, evalContext));
    return rule.conditionLogic === 'all' ? results.every(Boolean) : results.some(Boolean);
  }

  /** Retrieve a field value for display/testing */
  private _getFieldValue(field: string, ctx: EvaluationContext): unknown {
    if (ctx.post && field in ctx.post) return (ctx.post as Record<string, unknown>)[field];
    if (ctx.comment && field in ctx.comment) return (ctx.comment as Record<string, unknown>)[field];
    return undefined;
  }

  /** Persist log entry to Redis */
  private async _persistLog(context: Context, log: LogEntry): Promise<void> {
    const key = `${LOGS_KEY}:${log.timestamp}`;
    await context.redis.set(key, JSON.stringify(log), { expiration: LOGS_TTL_SECONDS });
    // Also push to a sorted set for ordered retrieval
    await context.redis.zAdd(LOGS_KEY, { member: log.id, score: log.timestamp });
  }

  /** Retrieve recent logs */
  async getLogs(context: Context, limit: number = 100): Promise<LogEntry[]> {
    const ids = await context.redis.zRange(LOGS_KEY, 0, limit - 1, { by: 'rank', reverse: true });
    if (!ids.length) return [];
    const entries = await Promise.all(
      ids.map(async (id) => {
        const raw = await context.redis.get(`${LOGS_KEY}:${id}`);
        return raw ? (JSON.parse(raw) as LogEntry) : null;
      })
    );
    return entries.filter((e): e is LogEntry => e !== null);
  }

  /** Cleanup old logs (scheduled job) */
  async cleanupLogs(context: Context): Promise<void> {
    const cutoff = now() - LOGS_TTL_SECONDS;
    await context.redis.zRemRangeByScore(LOGS_KEY, 0, cutoff);
  }

  /** Create a blank rule */
  createBlankRule(): Rule {
    return {
      id: generateId(),
      name: 'New Rule',
      description: '',
      enabled: false,
      target: 'post',
      priority: 0,
      conditions: [],
      conditionLogic: 'all',
      actions: [],
      createdAt: now(),
      updatedAt: now(),
      matchCount: 0,
    };
  }
}
