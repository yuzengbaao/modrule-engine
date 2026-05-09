/**
 * ModRule Engine - Rule Engine Core
 * 
 * Core engine that evaluates rules against triggers,
 * checks conditions, and executes actions.
 */

import {
  Rule,
  RuleExecution,
  ConditionResult,
  ActionResult,
  TriggerType,
  ActionType,
  AnalyticsData,
  ModerationStats
} from '../types';
import { ConditionEvaluator } from './ConditionEvaluator';
import { ActionExecutor } from './ActionExecutor';
import { RuleStorage } from '../storage/RuleStorage';

export class RuleEngine {
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;
  private storage: RuleStorage;

  constructor(storage: RuleStorage) {
    this.conditionEvaluator = new ConditionEvaluator();
    this.actionExecutor = new ActionExecutor();
    this.storage = storage;
  }

  /**
   * Evaluate all rules for a given trigger event
   */
  async evaluateRules(
    triggerType: TriggerType,
    target: any,
    context: Devvit.Context
  ): Promise<RuleExecution[]> {
    const subreddit = context.reddit.getCurrentSubredditName();
    const rules = await this.storage.getRulesByTrigger(subreddit, triggerType);
    const executions: RuleExecution[] = [];

    for (const rule of rules) {
      if (!rule.enabled || rule.testMode) {
        continue;
      }

      const execution = await this.executeRule(rule, target, context);
      executions.push(execution);

      // Update rule execution count
      rule.executionCount++;
      rule.lastExecutedAt = Date.now();
      await this.storage.updateRule(subreddit, rule);
    }

    return executions;
  }

  /**
   * Execute a single rule against a target
   */
  private async executeRule(
    rule: Rule,
    target: any,
    context: Devvit.Context
  ): Promise<RuleExecution> {
    const startTime = Date.now();
    const executionId = this.generateId();

    try {
      // Evaluate conditions
      const conditionResults = await this.conditionEvaluator.evaluate(
        rule.conditions,
        target,
        context
      );

      const allConditionsMatched = conditionResults.every(r => r.matched);

      let actionResults: ActionResult[] = [];
      let actionsExecuted = false;

      if (allConditionsMatched) {
        // Execute actions
        actionResults = await this.actionExecutor.execute(
          rule.actions,
          target,
          context
        );
        actionsExecuted = actionResults.some(r => r.success);
      }

      const executionTime = Date.now() - startTime;

      // Log execution
      const execution: RuleExecution = {
        id: executionId,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.trigger.type,
        targetId: target.id || target.postId || target.commentId,
        targetAuthor: target.author || target.userName,
        targetSubreddit: context.reddit.getCurrentSubredditName(),
        conditionsMatched: allConditionsMatched,
        conditionsResults: conditionResults,
        actionsExecuted: actionsExecuted,
        actionsResults: actionResults,
        executedAt: Date.now(),
        executionTimeMs: executionTime
      };

      // Save execution log
      await this.storage.logExecution(
        context.reddit.getCurrentSubredditName(),
        execution
      );

      return execution;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        id: executionId,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.trigger.type,
        targetId: target.id || target.postId || target.commentId,
        targetAuthor: target.author || target.userName,
        targetSubreddit: context.reddit.getCurrentSubredditName(),
        conditionsMatched: false,
        conditionsResults: [],
        actionsExecuted: false,
        actionsResults: [],
        executedAt: Date.now(),
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new rule from form data
   */
  async createRule(context: Devvit.Context, formData: any): Promise<Rule> {
    const subreddit = context.reddit.getCurrentSubredditName();
    const now = Date.now();

    const rule: Rule = {
      id: this.generateId(),
      name: formData.name,
      description: formData.description,
      enabled: true,
      trigger: {
        type: formData.trigger as TriggerType,
        config: {}
      },
      conditions: this.parseConditions(formData.conditions),
      actions: this.parseActions(formData.actions),
      createdAt: now,
      updatedAt: now,
      createdBy: context.userId || 'unknown',
      testMode: false,
      executionCount: 0
    };

    await this.storage.saveRule(subreddit, rule);
    return rule;
  }

  /**
   * Parse conditions from form text
   */
  private parseConditions(conditionsText: string): any[] {
    // Simple parser for conditions text
    // Format: "field operator value [AND/OR field operator value]"
    const conditions: any[] = [];
    
    if (!conditionsText) return conditions;

    const lines = conditionsText.split(/\n|AND|OR/i);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Basic parsing: field operator value
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        conditions.push({
          id: this.generateId(),
          field: parts[0],
          operator: parts[1].toLowerCase(),
          value: parts.slice(2).join(' '),
          negate: false
        });
      }
    }

    return conditions;
  }

  /**
   * Parse actions from form text
   */
  private parseActions(actionsText: string): any[] {
    const actions: any[] = [];
    
    if (!actionsText) return actions;

    const lines = actionsText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Basic parsing: action_type [config]
      const parts = trimmed.split(/\s+/);
      const actionType = parts[0].toLowerCase();
      
      const config: any = {};
      
      // Parse config from parentheses if present
      const configMatch = trimmed.match(/\((.*?)\)/);
      if (configMatch) {
        const configText = configMatch[1];
        const configPairs = configText.split(',');
        
        for (const pair of configPairs) {
          const [key, value] = pair.split('=').map(s => s.trim());
          if (key && value) {
            config[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      }

      actions.push({
        id: this.generateId(),
        type: actionType,
        config: config
      });
    }

    return actions;
  }

  /**
   * Get analytics for a subreddit
   */
  async getSubredditStats(context: Devvit.Context): Promise<ModerationStats> {
    const subreddit = context.reddit.getCurrentSubredditName();
    return await this.storage.getStats(subreddit);
  }

  /**
   * Aggregate analytics (runs hourly)
   */
  async aggregateAnalytics(context: Devvit.Context): Promise<void> {
    const subreddit = context.reddit.getCurrentSubredditName();
    const executions = await this.storage.getRecentExecutions(subreddit, 24);
    
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let totalTimeMs = 0;
    const actionCounts: Record<string, number> = {};

    for (const execution of executions) {
      totalExecutions++;
      if (execution.actionsExecuted) {
        successfulExecutions++;
      }
      totalTimeMs += execution.executionTimeMs;
      
      for (const action of execution.actionsResults) {
        if (action.success) {
          actionCounts[action.actionType] = (actionCounts[action.actionType] || 0) + 1;
        }
      }
    }

    const stats: ModerationStats = {
      subreddit,
      totalRules: await this.storage.getRuleCount(subreddit),
      activeRules: await this.storage.getActiveRuleCount(subreddit),
      totalExecutions,
      actionsTaken: actionCounts as Record<ActionType, number>,
      timeSavedMinutes: Math.floor(totalExecutions * 0.5), // Estimate 30s saved per execution
      lastUpdated: Date.now()
    };

    await this.storage.saveStats(subreddit, stats);
  }

  /**
   * Test a rule without executing actions
   */
  async testRule(
    rule: Rule,
    target: any,
    context: Devvit.Context
  ): Promise<{ conditionsMatched: boolean; conditionResults: ConditionResult[] }> {
    const conditionResults = await this.conditionEvaluator.evaluate(
      rule.conditions,
      target,
      context
    );

    return {
      conditionsMatched: conditionResults.every(r => r.matched),
      conditionResults
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
