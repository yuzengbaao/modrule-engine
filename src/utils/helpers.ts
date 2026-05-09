/**
 * Utility helpers for the ModRule Engine
 */

import crypto from 'crypto';

/** Generate a unique ID */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Current unix timestamp in seconds */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Format a unix timestamp for display */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/** Relative time string (e.g., "2 hours ago") */
export function relativeTime(ts: number): string {
  const seconds = now() - ts;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Deep clone a rule (for state management) */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Default condition templates for the IF builder */
export const CONDITION_TEMPLATES = [
  {
    id: 'title_contains',
    label: 'Title contains',
    field: 'title',
    operator: 'contains' as const,
    valueType: 'text' as const,
    description: 'Post title contains keyword(s)',
  },
  {
    id: 'title_regex',
    label: 'Title matches regex',
    field: 'title',
    operator: 'regex_match' as const,
    valueType: 'regex' as const,
    description: 'Post title matches regular expression',
  },
  {
    id: 'body_contains',
    label: 'Body contains',
    field: 'body',
    operator: 'contains' as const,
    valueType: 'text' as const,
    description: 'Post/comment body contains keyword(s)',
  },
  {
    id: 'user_karma_gt',
    label: 'User karma >',
    field: 'karma',
    operator: 'greater_than' as const,
    valueType: 'number' as const,
    description: 'Author has more than N karma',
  },
  {
    id: 'user_karma_lt',
    label: 'User karma <',
    field: 'karma',
    operator: 'less_than' as const,
    valueType: 'number' as const,
    description: 'Author has less than N karma',
  },
  {
    id: 'account_age_gt',
    label: 'Account older than',
    field: 'age',
    operator: 'greater_than' as const,
    valueType: 'duration' as const,
    description: 'Account age in seconds',
  },
  {
    id: 'has_flair',
    label: 'Has flair',
    field: 'flair',
    operator: 'has_flair' as const,
    valueType: 'boolean' as const,
    description: 'Post has a flair assigned',
  },
  {
    id: 'no_flair',
    label: 'No flair',
    field: 'flair',
    operator: 'no_flair' as const,
    valueType: 'boolean' as const,
    description: 'Post has no flair assigned',
  },
  {
    id: 'is_nsfw',
    label: 'NSFW',
    field: 'isNsfw',
    operator: 'is_nsfw' as const,
    valueType: 'boolean' as const,
    description: 'Post is marked NSFW',
  },
  {
    id: 'author_in_list',
    label: 'Author in list',
    field: 'author',
    operator: 'in_list' as const,
    valueType: 'multi_select' as const,
    description: 'Author is in allowlist/blocklist',
  },
  {
    id: 'url_contains',
    label: 'URL contains',
    field: 'url',
    operator: 'contains' as const,
    valueType: 'text' as const,
    description: 'URL contains keyword(s)',
  },
  {
    id: 'domain_matches',
    label: 'Domain in list',
    field: 'url',
    operator: 'regex_match' as const,
    valueType: 'regex' as const,
    description: 'URL matches domain pattern',
  },
];

/** Default action templates for the THEN builder */
export const ACTION_TEMPLATES = [
  {
    id: 'remove_post',
    label: 'Remove',
    type: 'remove' as const,
    description: 'Remove the post/comment',
    configFields: [],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'approve_post',
    label: 'Approve',
    type: 'approve' as const,
    description: 'Approve the post/comment',
    configFields: [],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'lock_thread',
    label: 'Lock',
    type: 'lock' as const,
    description: 'Lock the post/comment',
    configFields: [],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'set_flair',
    label: 'Set flair',
    type: 'set_flair' as const,
    description: 'Assign a specific flair',
    configFields: [
      { name: 'flairId', label: 'Flair ID', type: 'text', required: true, placeholder: 'e.g., 5b4a3c2d-1f8e' },
    ],
    supportedTargets: ['post' as const],
  },
  {
    id: 'add_comment',
    label: 'Add removal comment',
    type: 'add_comment' as const,
    description: 'Reply with a removal notice',
    configFields: [
      { name: 'text', label: 'Comment text', type: 'textarea', required: true, placeholder: 'Your post was removed because...' },
    ],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'ban_user',
    label: 'Ban user',
    type: 'ban_user' as const,
    description: 'Ban the author',
    configFields: [
      { name: 'duration', label: 'Duration (days, leave empty = permanent)', type: 'number', required: false, placeholder: 'e.g., 7' },
      { name: 'reason', label: 'Reason', type: 'text', required: false, placeholder: 'Rule violation' },
    ],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'alert_mods',
    label: 'Alert moderators',
    type: 'alert_mods' as const,
    description: 'Send modmail alert',
    configFields: [
      { name: 'ruleName', label: 'Rule name', type: 'text', required: false },
    ],
    supportedTargets: ['post' as const, 'comment' as const],
  },
  {
    id: 'mark_nsfw',
    label: 'Mark NSFW',
    type: 'mark_nsfw' as const,
    description: 'Mark post as NSFW',
    configFields: [],
    supportedTargets: ['post' as const],
  },
  {
    id: 'log_only',
    label: 'Log only',
    type: 'log_only' as const,
    description: 'Log match without action',
    configFields: [],
    supportedTargets: ['post' as const, 'comment' as const],
  },
];
