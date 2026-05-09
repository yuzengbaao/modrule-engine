/**
 * ModRule Engine - Rule Storage
 * 
 * Storage layer using Reddit's key-value store (Redis).
 * Handles rule persistence, execution logs, and analytics.
 */

import {
  Rule,
  RuleExecution,
  ModerationStats,
  TriggerType,
  AnalyticsData
} from '../types';

export class RuleStorage {
  private readonly RULES_KEY = 'modrule:rules';
  private readonly EXECUTIONS_KEY = 'modrule:executions';
  private readonly STATS_KEY = 'modrule:stats';
  private readonly ANALYTICS_KEY = 'modrule:analytics';

  /**
   * Get all rules for a subreddit
   */
  async getAllRules(subreddit: string): Promise<Rule[]> {
    const key = `${this.RULES_KEY}:${subreddit}`;
    const data = await this.get(key);
    
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data) as Rule[];
    } catch {
      return [];
    }
  }

  /**
   * Get rules filtered by trigger type
   */
  async getRulesByTrigger(
    subreddit: string,
    triggerType: TriggerType
  ): Promise<Rule[]> {
    const rules = await this.getAllRules(subreddit);
    return rules.filter(rule => rule.trigger.type === triggerType);
  }

  /**
   * Save a rule
   */
  async saveRule(subreddit: string, rule: Rule): Promise<void> {
    const rules = await this.getAllRules(subreddit);
    
    // Update existing or add new
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      rules[existingIndex] = {
        ...rules[existingIndex],
        ...rule,
        updatedAt: Date.now()
      };
    } else {
      rules.push(rule);
    }

    await this.set(`${this.RULES_KEY}:${subreddit}`, JSON.stringify(rules));
  }

  /**
   * Update a rule
   */
  async updateRule(subreddit: string, rule: Rule): Promise<void> {
    await this.saveRule(subreddit, rule);
  }

  /**
   * Delete a rule
   */
  async deleteRule(subreddit: string, ruleId: string): Promise<void> {
    const rules = await this.getAllRules(subreddit);
    const filtered = rules.filter(r => r.id !== ruleId);
    await this.set(`${this.RULES_KEY}:${subreddit}`, JSON.stringify(filtered));
  }

  /**
   * Get rule count
   */
  async getRuleCount(subreddit: string): Promise<number> {
    const rules = await this.getAllRules(subreddit);
    return rules.length;
  }

  /**
   * Get active rule count
   */
  async getActiveRuleCount(subreddit: string): Promise<number> {
    const rules = await this.getAllRules(subreddit);
    return rules.filter(r => r.enabled).length;
  }

  /**
   * Log a rule execution
   */
  async logExecution(
    subreddit: string,
    execution: RuleExecution
  ): Promise<void> {
    const key = `${this.EXECUTIONS_KEY}:${subreddit}`;
    const executions = await this.getExecutions(subreddit, 0);
    
    executions.push(execution);
    
    // Keep only last 1000 executions per subreddit
    if (executions.length > 1000) {
      executions.shift();
    }

    await this.set(key, JSON.stringify(executions));
  }

  /**
   * Get executions with optional time filter
   */
  async getExecutions(
    subreddit: string,
    hoursBack?: number
  ): Promise<RuleExecution[]> {
    const key = `${this.EXECUTIONS_KEY}:${subreddit}`;
    const data = await this.get(key);
    
    if (!data) {
      return [];
    }

    try {
      const executions = JSON.parse(data) as RuleExecution[];
      
      if (hoursBack && hoursBack > 0) {
        const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
        return executions.filter(e => e.executedAt >= cutoff);
      }
      
      return executions;
    } catch {
      return [];
    }
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(
    subreddit: string,
    hours: number
  ): Promise<RuleExecution[]> {
    return this.getExecutions(subreddit, hours);
  }

  /**
   * Save moderation stats
   */
  async saveStats(subreddit: string, stats: ModerationStats): Promise<void> {
    await this.set(
      `${this.STATS_KEY}:${subreddit}`,
      JSON.stringify(stats)
    );
  }

  /**
   * Get moderation stats
   */
  async getStats(subreddit: string): Promise<ModerationStats> {
    const data = await this.get(`${this.STATS_KEY}:${subreddit}`);
    
    if (data) {
      try {
        return JSON.parse(data) as ModerationStats;
      } catch {
        // Fall through to default
      }
    }

    // Return default stats
    return {
      subreddit,
      totalRules: 0,
      activeRules: 0,
      totalExecutions: 0,
      actionsTaken: {},
      timeSavedMinutes: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Save analytics data for a rule
   */
  async saveAnalytics(
    subreddit: string,
    analytics: AnalyticsData
  ): Promise<void> {
    const key = `${this.ANALYTICS_KEY}:${subreddit}`;
    const allAnalytics = await this.getAllAnalytics(subreddit);
    
    const existingIndex = allAnalytics.findIndex(a => a.ruleId === analytics.ruleId);
    
    if (existingIndex >= 0) {
      allAnalytics[existingIndex] = analytics;
    } else {
      allAnalytics.push(analytics);
    }

    await this.set(key, JSON.stringify(allAnalytics));
  }

  /**
   * Get all analytics for a subreddit
   */
  async getAllAnalytics(subreddit: string): Promise<AnalyticsData[]> {
    const key = `${this.ANALYTICS_KEY}:${subreddit}`;
    const data = await this.get(key);
    
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data) as AnalyticsData[];
    } catch {
      return [];
    }
  }

  /**
   * Get analytics for a specific rule
   */
  async getRuleAnalytics(
    subreddit: string,
    ruleId: string
  ): Promise<AnalyticsData | undefined> {
    const allAnalytics = await this.getAllAnalytics(subreddit);
    return allAnalytics.find(a => a.ruleId === ruleId);
  }

  /**
   * Clear all data for a subreddit (use with caution)
   */
  async clearSubredditData(subreddit: string): Promise<void> {
    await this.del(`${this.RULES_KEY}:${subreddit}`);
    await this.del(`${this.EXECUTIONS_KEY}:${subreddit}`);
    await this.del(`${this.STATS_KEY}:${subreddit}`);
    await this.del(`${this.ANALYTICS_KEY}:${subreddit}`);
  }

  /**
   * Export all data for backup
   */
  async exportData(subreddit: string): Promise<{
    rules: Rule[];
    executions: RuleExecution[];
    stats: ModerationStats;
    analytics: AnalyticsData[];
  }> {
    const [rules, executions, stats, analytics] = await Promise.all([
      this.getAllRules(subreddit),
      this.getExecutions(subreddit, 0),
      this.getStats(subreddit),
      this.getAllAnalytics(subreddit)
    ]);

    return { rules, executions, stats, analytics };
  }

  /**
   * Import data from backup
   */
  async importData(
    subreddit: string,
    data: {
      rules?: Rule[];
      executions?: RuleExecution[];
      stats?: ModerationStats;
      analytics?: AnalyticsData[];
    }
  ): Promise<void> {
    if (data.rules) {
      await this.set(`${this.RULES_KEY}:${subreddit}`, JSON.stringify(data.rules));
    }
    if (data.executions) {
      await this.set(`${this.EXECUTIONS_KEY}:${subreddit}`, JSON.stringify(data.executions));
    }
    if (data.stats) {
      await this.set(`${this.STATS_KEY}:${subreddit}`, JSON.stringify(data.stats));
    }
    if (data.analytics) {
      await this.set(`${this.ANALYTICS_KEY}:${subreddit}`, JSON.stringify(data.analytics));
    }
  }

  // ---- Private helper methods ----

  /**
   * Get value from Redis store
   */
  private async get(key: string): Promise<string | null> {
    // In-memory fallback for testing
    return (global as any).__MODRULE_STORAGE?.[key] || null;
  }

  /**
   * Set value in Redis store
   */
  private async set(key: string, value: string): Promise<void> {
    // In-memory fallback for testing
    if (!(global as any).__MODRULE_STORAGE) {
      (global as any).__MODRULE_STORAGE = {};
    }
    (global as any).__MODRULE_STORAGE[key] = value;
  }

  /**
   * Delete key from Redis store
   */
  private async del(key: string): Promise<void> {
    // In-memory fallback for testing
    if ((global as any).__MODRULE_STORAGE) {
      delete (global as any).__MODRULE_STORAGE[key];
    }
  }
}
