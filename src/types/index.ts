/**
 * Core type definitions for the ModRule Engine
 */

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'regex_match'
  | 'regex_not_match'
  | 'starts_with'
  | 'ends_with'
  | 'in_list'
  | 'not_in_list'
  | 'has_flair'
  | 'no_flair'
  | 'is_removed'
  | 'is_not_removed'
  | 'is_locked'
  | 'is_not_locked'
  | 'is_nsfw'
  | 'is_not_nsfw'
  | 'is_spoiler'
  | 'is_not_spoiler'
  | 'user_karma_gt'
  | 'user_karma_lt'
  | 'user_age_gt'
  | 'user_age_lt'
  | 'user_in_list'
  | 'user_not_in_list';

export type ActionType =
  | 'remove'
  | 'approve'
  | 'lock'
  | 'unlock'
  | 'mark_nsfw'
  | 'unmark_nsfw'
  | 'spoiler'
  | 'unspoiler'
  | 'set_flair'
  | 'remove_flair'
  | 'add_comment'
  | 'send_modmail'
  | 'ban_user'
  | 'mute_user'
  | 'alert_mods'
  | 'log_only'
  | 'crosspost'
  | 'flair_filter';

export type TargetType = 'post' | 'comment' | 'both';

export interface Condition {
  id: string;
  field: string; // e.g., 'title', 'body', 'author', 'flair', 'karma', 'age', 'url'
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  negate?: boolean;
  caseSensitive?: boolean;
}

export interface Action {
  id: string;
  type: ActionType;
  config: Record<string, unknown>; // action-specific configuration
  delay?: number; // delay in seconds before executing
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  target: TargetType;
  priority: number; // higher number = evaluated first
  conditions: Condition[];
  conditionLogic: 'all' | 'any'; // AND or OR between conditions
  actions: Action[];
  createdAt: number;
  updatedAt: number;
  matchCount: number;
  lastMatchAt?: number;
}

export interface RuleSet {
  rules: Rule[];
  version: number;
}

export interface LogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  targetType: TargetType;
  targetId: string;
  targetAuthor: string;
  matchedConditions: string[];
  executedActions: string[];
  failedActions: string[];
  timestamp: number;
  executionTimeMs: number;
}

export interface EvaluationContext {
  post?: PostData;
  comment?: CommentData;
  author?: UserData;
  subreddit?: SubredditData;
}

export interface PostData {
  id: string;
  title: string;
  body?: string;
  url?: string;
  author: string;
  createdAt: number;
  karma: number;
  flair?: string;
  isRemoved: boolean;
  isLocked: boolean;
  isNsfw: boolean;
  isSpoiler: boolean;
  numComments: number;
}

export interface CommentData {
  id: string;
  body: string;
  author: string;
  createdAt: number;
  karma: number;
  postId: string;
  parentId?: string;
  isRemoved: boolean;
  isLocked: boolean;
}

export interface UserData {
  username: string;
  karma: number;
  accountAge: number; // in seconds
  isModerator: boolean;
  isApprovedUser: boolean;
  isBanned: boolean;
}

export interface SubredditData {
  name: string;
  subscriberCount: number;
  settings: Record<string, unknown>;
}

export interface ConditionTemplate {
  id: string;
  name: string;
  description: string;
  field: string;
  operator: ConditionOperator;
  defaultValue?: string | number | boolean | string[];
  valueType: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'regex' | 'duration';
  options?: string[]; // for select/multi_select
  placeholder?: string;
}

export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  type: ActionType;
  configFields: ConfigField[];
  supportedTargets: TargetType[];
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'duration' | 'flair' | 'user';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface RuleTestResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conditionResults: {
    conditionId: string;
    conditionName: string;
    passed: boolean;
    actualValue?: unknown;
    expectedValue?: unknown;
  }[];
  actionsThatWouldRun: string[];
}
