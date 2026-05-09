/**
 * ModRule Engine - Type Definitions
 * Core interfaces for the visual IF-THEN rule engine
 */

export enum TriggerType {
  POST_CREATED = 'post_created',
  COMMENT_CREATED = 'comment_created',
  USER_JOINED = 'user_joined',
  REPORT_SUBMITTED = 'report_submitted',
  POST_EDITED = 'post_edited',
  COMMENT_EDITED = 'comment_edited',
  USER_REPORTED = 'user_reported',
  MODMAIL_RECEIVED = 'modmail_received'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  MATCHES_REGEX = 'matches_regex',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with'
}

export enum ActionType {
  REMOVE_POST = 'remove_post',
  REMOVE_COMMENT = 'remove_comment',
  BAN_USER = 'ban_user',
  MUTE_USER = 'mute_user',
  SEND_MODMAIL = 'send_modmail',
  FLAIR_POST = 'flair_post',
  LOCK_THREAD = 'lock_thread',
  APPROVE_POST = 'approve_post',
  APPROVE_COMMENT = 'approve_comment',
  ADD_TO_QUEUE = 'add_to_queue',
  SEND_WEBHOOK = 'send_webhook',
  ADD_NOTE = 'add_note',
  SHADOWBAN = 'shadowban'
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  testMode: boolean;
  executionCount: number;
  lastExecutedAt?: number;
}

export interface Trigger {
  type: TriggerType;
  config: TriggerConfig;
}

export interface TriggerConfig {
  subreddit?: string;
  postFlair?: string;
  userFlair?: string;
  karmaThreshold?: number;
  accountAgeDays?: number;
  contentType?: 'text' | 'link' | 'image' | 'video' | 'poll';
  isOC?: boolean;
  isSpoiler?: boolean;
  isNSFW?: boolean;
}

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  negate: boolean;
}

export interface Action {
  id: string;
  type: ActionType;
  config: ActionConfig;
  delay?: number; // Delay in seconds
}

export interface ActionConfig {
  message?: string;
  reason?: string;
  duration?: number; // For bans: days
  flairText?: string;
  flairCSSClass?: string;
  webhookUrl?: string;
  note?: string;
  sendModmail?: boolean;
  modmailSubject?: string;
  modmailBody?: string;
  removeReason?: string;
  spam?: boolean;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: TriggerType;
  targetId: string; // Post/comment/user ID
  targetAuthor: string;
  targetSubreddit: string;
  conditionsMatched: boolean;
  conditionsResults: ConditionResult[];
  actionsExecuted: boolean;
  actionsResults: ActionResult[];
  executedAt: number;
  executionTimeMs: number;
  error?: string;
}

export interface ConditionResult {
  conditionId: string;
  field: string;
  operator: ConditionOperator;
  expectedValue: string | number | boolean | string[];
  actualValue: string | number | boolean | string[];
  matched: boolean;
  error?: string;
}

export interface ActionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  result?: string;
  error?: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  icon: string;
}

export interface AnalyticsData {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  topTrigger: TriggerType;
  topAction: ActionType;
}

export interface ModerationStats {
  subreddit: string;
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  actionsTaken: Record<ActionType, number>;
  timeSavedMinutes: number;
  lastUpdated: number;
}

// Field definitions for the condition builder
export const AVAILABLE_FIELDS = [
  { name: 'post.title', label: 'Post Title', type: 'string' },
  { name: 'post.body', label: 'Post Body', type: 'string' },
  { name: 'post.url', label: 'Post URL', type: 'string' },
  { name: 'post.flair', label: 'Post Flair', type: 'string' },
  { name: 'post.karma', label: 'Post Karma', type: 'number' },
  { name: 'post.commentCount', label: 'Comment Count', type: 'number' },
  { name: 'post.isOC', label: 'Is Original Content', type: 'boolean' },
  { name: 'post.isSpoiler', label: 'Is Spoiler', type: 'boolean' },
  { name: 'post.isNSFW', label: 'Is NSFW', type: 'boolean' },
  { name: 'comment.body', label: 'Comment Body', type: 'string' },
  { name: 'comment.karma', label: 'Comment Karma', type: 'number' },
  { name: 'user.name', label: 'Username', type: 'string' },
  { name: 'user.karma', label: 'User Karma', type: 'number' },
  { name: 'user.accountAgeDays', label: 'Account Age (Days)', type: 'number' },
  { name: 'user.flair', label: 'User Flair', type: 'string' },
  { name: 'user.isMod', label: 'Is Moderator', type: 'boolean' },
  { name: 'user.isAdmin', label: 'Is Admin', type: 'boolean' },
  { name: 'report.reason', label: 'Report Reason', type: 'string' },
  { name: 'report.count', label: 'Report Count', type: 'number' }
];

// Action definitions for the action builder
export const AVAILABLE_ACTIONS = [
  { type: ActionType.REMOVE_POST, label: 'Remove Post', icon: 'trash', description: 'Remove the target post' },
  { type: ActionType.REMOVE_COMMENT, label: 'Remove Comment', icon: 'trash', description: 'Remove the target comment' },
  { type: ActionType.BAN_USER, label: 'Ban User', icon: 'ban', description: 'Ban the user from the subreddit' },
  { type: ActionType.MUTE_USER, label: 'Mute User', icon: 'mute', description: 'Mute the user for a period' },
  { type: ActionType.SEND_MODMAIL, label: 'Send Modmail', icon: 'mail', description: 'Send a modmail to the user' },
  { type: ActionType.FLAIR_POST, label: 'Flair Post', icon: 'tag', description: 'Apply a flair to the post' },
  { type: ActionType.LOCK_THREAD, label: 'Lock Thread', icon: 'lock', description: 'Lock the comment thread' },
  { type: ActionType.APPROVE_POST, label: 'Approve Post', icon: 'check', description: 'Approve the post' },
  { type: ActionType.APPROVE_COMMENT, label: 'Approve Comment', icon: 'check', description: 'Approve the comment' },
  { type: ActionType.ADD_TO_QUEUE, label: 'Add to Mod Queue', icon: 'list', description: 'Add to moderation queue for review' },
  { type: ActionType.ADD_NOTE, label: 'Add Mod Note', icon: 'note', description: 'Add a moderator note' }
];

// Trigger definitions
export const AVAILABLE_TRIGGERS = [
  { type: TriggerType.POST_CREATED, label: 'Post Created', description: 'When a new post is submitted' },
  { type: TriggerType.COMMENT_CREATED, label: 'Comment Created', description: 'When a new comment is posted' },
  { type: TriggerType.USER_JOINED, label: 'User Joined', description: 'When a user joins the subreddit' },
  { type: TriggerType.REPORT_SUBMITTED, label: 'Report Submitted', description: 'When a post/comment is reported' },
  { type: TriggerType.POST_EDITED, label: 'Post Edited', description: 'When a post is edited' },
  { type: TriggerType.COMMENT_EDITED, label: 'Comment Edited', description: 'When a comment is edited' },
  { type: TriggerType.MODMAIL_RECEIVED, label: 'Modmail Received', description: 'When modmail is received' }
];
