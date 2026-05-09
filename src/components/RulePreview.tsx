/**
 * ModRule Engine - Rule Preview Component
 * @ts-nocheck - Devvit JSX requires special build pipeline
 *
 * Generates natural language descriptions of rules
 * for the "Rule Preview" feature before saving.
 */

import { Rule, Condition, Action, TriggerType, ConditionOperator, ActionType } from '../types';

/**
 * Generate a human-readable description of a rule
 */
export function generateRuleDescription(rule: Rule): string {
  const triggerDesc = describeTrigger(rule.trigger.type);
  const conditionsDesc = describeConditions(rule.conditions);
  const actionsDesc = describeActions(rule.actions);

  if (rule.conditions.length === 0) {
    return `When ${triggerDesc}, then ${actionsDesc}.`;
  }

  return `When ${triggerDesc}, if ${conditionsDesc}, then ${actionsDesc}.`;
}

/**
 * Generate a compact one-line summary
 */
export function generateRuleSummary(rule: Rule): string {
  const triggerLabel = getTriggerLabel(rule.trigger.type);
  const actionLabels = rule.actions.map(a => getActionLabel(a.type)).join(', ');
  return `${triggerLabel} → ${actionLabels}`;
}

/**
 * Describe a trigger type in natural language
 */
function describeTrigger(triggerType: TriggerType): string {
  const descriptions: Record<TriggerType, string> = {
    [TriggerType.POST_CREATED]: 'a post is created',
    [TriggerType.COMMENT_CREATED]: 'a comment is created',
    [TriggerType.USER_JOINED]: 'a user joins the subreddit',
    [TriggerType.REPORT_SUBMITTED]: 'a report is submitted',
    [TriggerType.POST_EDITED]: 'a post is edited',
    [TriggerType.COMMENT_EDITED]: 'a comment is edited',
    [TriggerType.USER_REPORTED]: 'a user is reported',
    [TriggerType.MODMAIL_RECEIVED]: 'modmail is received'
  };
  return descriptions[triggerType] || 'an event occurs';
}

/**
 * Get a short label for a trigger type
 */
function getTriggerLabel(triggerType: TriggerType): string {
  const labels: Record<TriggerType, string> = {
    [TriggerType.POST_CREATED]: '📝 Post',
    [TriggerType.COMMENT_CREATED]: '💬 Comment',
    [TriggerType.USER_JOINED]: '👤 Join',
    [TriggerType.REPORT_SUBMITTED]: '🚩 Report',
    [TriggerType.POST_EDITED]: '✏️ Edit',
    [TriggerType.COMMENT_EDITED]: '✏️ Comment Edit',
    [TriggerType.USER_REPORTED]: '🚩 User Report',
    [TriggerType.MODMAIL_RECEIVED]: '📨 Modmail'
  };
  return labels[triggerType] || 'Event';
}

/**
 * Describe conditions in natural language
 */
function describeConditions(conditions: Condition[]): string {
  if (conditions.length === 0) {
    return 'any conditions are met';
  }

  const parts = conditions.map(c => describeCondition(c));

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  // For 3+ conditions, use Oxford comma style
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  return `${rest.join(', ')}, and ${last}`;
}

/**
 * Describe a single condition
 */
function describeCondition(condition: Condition): string {
  const fieldName = getFieldDisplayName(condition.field);
  const operatorDesc = getOperatorDescription(condition.operator);
  const valueDesc = formatValue(condition.value);

  if (condition.negate) {
    return `${fieldName} does NOT ${operatorDesc} ${valueDesc}`;
  }

  // Special grammatical adjustments
  if (condition.operator === ConditionOperator.CONTAINS) {
    return `${fieldName} contains ${valueDesc}`;
  }
  if (condition.operator === ConditionOperator.MATCHES_REGEX) {
    return `${fieldName} matches pattern ${valueDesc}`;
  }
  if (condition.operator === ConditionOperator.STARTS_WITH) {
    return `${fieldName} starts with ${valueDesc}`;
  }
  if (condition.operator === ConditionOperator.ENDS_WITH) {
    return `${fieldName} ends with ${valueDesc}`;
  }
  if (condition.operator === ConditionOperator.IN_LIST) {
    return `${fieldName} is one of ${valueDesc}`;
  }
  if (condition.operator === ConditionOperator.NOT_IN_LIST) {
    return `${fieldName} is not one of ${valueDesc}`;
  }

  return `${fieldName} ${operatorDesc} ${valueDesc}`;
}

/**
 * Get a display name for a field
 */
function getFieldDisplayName(field: string): string {
  const names: Record<string, string> = {
    'post.title': 'Post Title',
    'post.body': 'Post Body',
    'post.url': 'Post URL',
    'post.flair': 'Post Flair',
    'post.karma': 'Post Karma',
    'post.commentCount': 'Comment Count',
    'post.isOC': 'Original Content status',
    'post.isSpoiler': 'Spoiler status',
    'post.isNSFW': 'NSFW status',
    'comment.body': 'Comment Body',
    'comment.karma': 'Comment Karma',
    'user.name': 'Username',
    'user.karma': 'User Karma',
    'user.accountAgeDays': 'Account Age',
    'user.flair': 'User Flair',
    'user.isMod': 'Moderator status',
    'user.isAdmin': 'Admin status',
    'report.reason': 'Report Reason',
    'report.count': 'Report Count'
  };
  return names[field] || field;
}

/**
 * Get natural language description of an operator
 */
function getOperatorDescription(operator: ConditionOperator): string {
  const descriptions: Record<ConditionOperator, string> = {
    [ConditionOperator.EQUALS]: 'is',
    [ConditionOperator.NOT_EQUALS]: 'is not',
    [ConditionOperator.CONTAINS]: 'contains',
    [ConditionOperator.NOT_CONTAINS]: 'does not contain',
    [ConditionOperator.GREATER_THAN]: 'is greater than',
    [ConditionOperator.LESS_THAN]: 'is less than',
    [ConditionOperator.GREATER_THAN_OR_EQUAL]: 'is at least',
    [ConditionOperator.LESS_THAN_OR_EQUAL]: 'is at most',
    [ConditionOperator.MATCHES_REGEX]: 'matches pattern',
    [ConditionOperator.IN_LIST]: 'is in list',
    [ConditionOperator.NOT_IN_LIST]: 'is not in list',
    [ConditionOperator.STARTS_WITH]: 'starts with',
    [ConditionOperator.ENDS_WITH]: 'ends with'
  };
  return descriptions[operator] || operator;
}

/**
 * Format a value for display
 */
function formatValue(value: string | number | boolean | string[]): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    if (value.length <= 3) {
      return value.map(v => `"${v}"`).join(', ');
    }
    return `"${value[0]}", "${value[1]}" and ${value.length - 2} others`;
  }
  if (typeof value === 'string' && value.includes(',')) {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length <= 3) {
      return items.map(v => `"${v}"`).join(', ');
    }
    return `"${items[0]}", "${items[1]}" and ${items.length - 2} others`;
  }
  return `"${value}"`;
}

/**
 * Describe actions in natural language
 */
function describeActions(actions: Action[]): string {
  if (actions.length === 0) {
    return 'do nothing';
  }

  const parts = actions.map(a => describeAction(a));

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  return `${rest.join(', ')}, and ${last}`;
}

/**
 * Describe a single action
 */
function describeAction(action: Action): string {
  const labels: Record<ActionType, string> = {
    [ActionType.REMOVE_POST]: 'remove the post',
    [ActionType.REMOVE_COMMENT]: 'remove the comment',
    [ActionType.BAN_USER]: 'ban the user',
    [ActionType.MUTE_USER]: 'mute the user',
    [ActionType.SEND_MODMAIL]: 'send a modmail',
    [ActionType.FLAIR_POST]: 'flair the post',
    [ActionType.LOCK_THREAD]: 'lock the thread',
    [ActionType.APPROVE_POST]: 'approve the post',
    [ActionType.APPROVE_COMMENT]: 'approve the comment',
    [ActionType.ADD_TO_QUEUE]: 'add to mod queue',
    [ActionType.ADD_NOTE]: 'add a mod note',
    [ActionType.SEND_WEBHOOK]: 'send a webhook notification',
    [ActionType.SHADOWBAN]: 'shadowban the user'
  };

  let desc = labels[action.type] || action.type;

  // Add config details for certain actions
  if (action.config) {
    if (action.config.reason) {
      desc += ` (reason: "${action.config.reason}")`;
    }
    if (action.config.flairText) {
      desc += ` with flair "${action.config.flairText}"`;
    }
    if (action.config.duration) {
      desc += ` for ${action.config.duration} days`;
    }
    if (action.config.modmailSubject) {
      desc += ` with subject "${action.config.modmailSubject}"`;
    }
  }

  return desc;
}

/**
 * Get a short label for an action type
 */
function getActionLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    [ActionType.REMOVE_POST]: '🗑️ Remove',
    [ActionType.REMOVE_COMMENT]: '🗑️ Remove',
    [ActionType.BAN_USER]: '🚫 Ban',
    [ActionType.MUTE_USER]: '🔇 Mute',
    [ActionType.SEND_MODMAIL]: '📧 Mail',
    [ActionType.FLAIR_POST]: '🏷️ Flair',
    [ActionType.LOCK_THREAD]: '🔒 Lock',
    [ActionType.APPROVE_POST]: '✅ Approve',
    [ActionType.APPROVE_COMMENT]: '✅ Approve',
    [ActionType.ADD_TO_QUEUE]: '📋 Queue',
    [ActionType.ADD_NOTE]: '📝 Note',
    [ActionType.SEND_WEBHOOK]: '🔗 Webhook',
    [ActionType.SHADOWBAN]: '👤 Shadow'
  };
  return labels[actionType] || actionType;
}

/**
 * Generate a preview card element (Devvit UI)
 * This returns JSX-compatible description for use in forms
 */
export function RulePreviewCard(rule: Rule): any {
  const description = generateRuleDescription(rule);
  const summary = generateRuleSummary(rule);

  return (
    <vstack gap="small" padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small">
      <text size="small" weight="bold" color="secondary">Rule Preview</text>
      <text size="small" weight="bold">{rule.name}</text>
      <text size="xsmall" color="secondary">{summary}</text>
      <text size="small">{description}</text>
      {rule.testMode && (
        <text size="xsmall" color="warning">⚠️ This rule is in test mode - actions will not be executed</text>
      )}
    </vstack>
  );
}

/**
 * Validate a rule and return any issues
 */
export function validateRule(rule: Rule): string[] {
  const issues: string[] = [];

  if (!rule.name || rule.name.trim().length === 0) {
    issues.push('Rule name is required');
  }

  if (!rule.trigger || !rule.trigger.type) {
    issues.push('Trigger is required');
  }

  if (rule.conditions.length === 0) {
    issues.push('At least one condition is recommended');
  }

  if (rule.actions.length === 0) {
    issues.push('At least one action is required');
  }

  // Check for potentially dangerous actions
  const dangerousActions = [ActionType.BAN_USER, ActionType.SHADOWBAN];
  const hasDangerous = rule.actions.some(a => dangerousActions.includes(a.type));
  if (hasDangerous && !rule.testMode) {
    issues.push('Warning: This rule includes banning actions. Consider starting in test mode.');
  }

  return issues;
}
