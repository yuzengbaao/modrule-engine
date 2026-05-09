/**
 * ModRule Engine - Rule Templates
 * 
 * Pre-built moderation rule templates for common scenarios.
 * Moderators can clone and customize these templates.
 */

import { Rule, TriggerType, ConditionOperator, ActionType, RuleTemplate } from '../types';

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'spam-detection',
    name: 'Spam Detection',
    description: 'Detect and remove posts with common spam keywords or patterns',
    category: 'Content Quality',
    icon: '🛡️',
    trigger: {
      type: TriggerType.POST_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'spam-keywords',
        field: 'post.title',
        operator: ConditionOperator.CONTAINS,
        value: 'spam, scam, click here, limited time, act now, free money',
        negate: false
      },
      {
        id: 'low-karma',
        field: 'user.karma',
        operator: ConditionOperator.LESS_THAN,
        value: '10',
        negate: false
      }
    ],
    actions: [
      {
        id: 'remove-spam',
        type: ActionType.REMOVE_POST,
        config: {
          reason: 'Automated spam detection',
          spam: true
        }
      },
      {
        id: 'notify-mods',
        type: ActionType.SEND_MODMAIL,
        config: {
          modmailSubject: 'Spam auto-removed',
          modmailBody: 'Post by u/{{author}} was automatically removed for spam content.'
        }
      }
    ]
  },

  {
    id: 'troll-prevention',
    name: 'Troll Prevention',
    description: 'Auto-moderate comments from new accounts with negative keywords',
    category: 'Community Safety',
    icon: '🤡',
    trigger: {
      type: TriggerType.COMMENT_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'new-account',
        field: 'user.accountAgeDays',
        operator: ConditionOperator.LESS_THAN,
        value: '7',
        negate: false
      },
      {
        id: 'negative-content',
        field: 'comment.body',
        operator: ConditionOperator.MATCHES_REGEX,
        value: '(idiot|stupid|moron|kill yourself|hate you|dumb)',
        negate: false
      }
    ],
    actions: [
      {
        id: 'remove-comment',
        type: ActionType.REMOVE_COMMENT,
        config: {
          reason: 'Troll detection: new account with hostile content'
        }
      },
      {
        id: 'warn-user',
        type: ActionType.SEND_MODMAIL,
        config: {
          modmailSubject: 'Comment removed',
          modmailBody: 'Your comment was removed for violating community guidelines. Please be respectful.'
        }
      }
    ]
  },

  {
    id: 'nsfw-enforcement',
    name: 'NSFW Enforcement',
    description: 'Auto-flair NSFW posts based on keywords or image detection',
    category: 'Content Moderation',
    icon: '🔞',
    trigger: {
      type: TriggerType.POST_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'nsfw-keywords',
        field: 'post.title',
        operator: ConditionOperator.CONTAINS,
        value: 'nsfw, nude, naked, adult, 18+, explicit',
        negate: false
      }
    ],
    actions: [
      {
        id: 'flair-nsfw',
        type: ActionType.FLAIR_POST,
        config: {
          flairText: 'NSFW',
          flairCSSClass: 'nsfw-tag'
        }
      },
      {
        id: 'mod-note',
        type: ActionType.ADD_NOTE,
        config: {
          note: 'Auto-flaired as NSFW based on title keywords'
        }
      }
    ]
  },

  {
    id: 'karma-gate',
    name: 'Karma Gate',
    description: 'Require minimum karma for posting to reduce spam',
    category: 'Account Requirements',
    icon: '🔒',
    trigger: {
      type: TriggerType.POST_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'low-karma',
        field: 'user.karma',
        operator: ConditionOperator.LESS_THAN,
        value: '50',
        negate: false
      },
      {
        id: 'not-mod',
        field: 'user.isMod',
        operator: ConditionOperator.EQUALS,
        value: 'false',
        negate: false
      }
    ],
    actions: [
      {
        id: 'remove-post',
        type: ActionType.REMOVE_POST,
        config: {
          reason: 'Account karma too low (< 50)'
        }
      },
      {
        id: 'send-message',
        type: ActionType.SEND_MODMAIL,
        config: {
          modmailSubject: 'Post removed: Karma requirement',
          modmailBody: 'Your post was removed because your account needs at least 50 karma to post here. Participate in other communities first!'
        }
      }
    ]
  },

  {
    id: 'report-aggregator',
    name: 'Report Aggregator',
    description: 'Auto-remove content that receives multiple reports',
    category: 'Crowdsourced Moderation',
    icon: '📊',
    trigger: {
      type: TriggerType.REPORT_SUBMITTED,
      config: {}
    },
    conditions: [
      {
        id: 'multiple-reports',
        field: 'report.count',
        operator: ConditionOperator.GREATER_THAN_OR_EQUAL,
        value: '3',
        negate: false
      }
    ],
    actions: [
      {
        id: 'auto-remove',
        type: ActionType.REMOVE_POST,
        config: {
          reason: 'Auto-removed after 3+ reports',
          spam: false
        }
      },
      {
        id: 'add-to-queue',
        type: ActionType.ADD_TO_QUEUE,
        config: {
          reason: 'Multiple reports - please review'
        }
      }
    ]
  },

  {
    id: 'welcome-message',
    name: 'Welcome Message',
    description: 'Send a welcome modmail to new community members',
    category: 'Community Engagement',
    icon: '👋',
    trigger: {
      type: TriggerType.USER_JOINED,
      config: {}
    },
    conditions: [
      {
        id: 'any-user',
        field: 'user.name',
        operator: ConditionOperator.NOT_EQUALS,
        value: '',
        negate: false
      }
    ],
    actions: [
      {
        id: 'welcome-modmail',
        type: ActionType.SEND_MODMAIL,
        config: {
          modmailSubject: 'Welcome to our community!',
          modmailBody: 'Thanks for joining! Please read our rules and enjoy the community. Let us know if you have any questions.'
        }
      }
    ]
  },

  {
    id: 'duplicate-detection',
    name: 'Duplicate Post Detection',
    description: 'Detect and remove reposts of recently submitted content',
    category: 'Content Quality',
    icon: '🔄',
    trigger: {
      type: TriggerType.POST_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'same-url',
        field: 'post.url',
        operator: ConditionOperator.IN_LIST,
        value: '{{recent_urls}}',
        negate: false
      }
    ],
    actions: [
      {
        id: 'remove-repost',
        type: ActionType.REMOVE_POST,
        config: {
          reason: 'Repost: This content was recently shared'
        }
      },
      {
        id: 'send-info',
        type: ActionType.SEND_MODMAIL,
        config: {
          modmailSubject: 'Repost removed',
          modmailBody: 'Your post was removed because it was recently shared. Please check the subreddit before posting.'
        }
      }
    ]
  },

  {
    id: 'modmail-router',
    name: 'Modmail Router',
    description: 'Auto-categorize and route modmail based on content',
    category: 'Workflow Automation',
    icon: '📨',
    trigger: {
      type: TriggerType.MODMAIL_RECEIVED,
      config: {}
    },
    conditions: [
      {
        id: 'appeal-keyword',
        field: 'modmail.subject',
        operator: ConditionOperator.CONTAINS,
        value: 'appeal, ban, unban, mistake',
        negate: false
      }
    ],
    actions: [
      {
        id: 'add-note',
        type: ActionType.ADD_NOTE,
        config: {
          note: 'Ban appeal received - requires senior mod review'
        }
      },
      {
        id: 'flag-urgent',
        type: ActionType.SEND_WEBHOOK,
        config: {
          webhookUrl: '{{mod_discord_webhook}}',
          message: 'URGENT: Ban appeal from u/{{author}}'
        }
      }
    ]
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): RuleTemplate[] {
  return RULE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(RULE_TEMPLATES.map(t => t.category))];
}

/**
 * Convert template to editable rule
 */
export function templateToRule(template: RuleTemplate, createdBy: string): Rule {
  return {
    id: `rule_${Date.now()}`,
    name: template.name,
    description: template.description,
    enabled: false, // Start disabled for safety
    trigger: template.trigger,
    conditions: template.conditions.map(c => ({
      ...c,
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    })),
    actions: template.actions.map(a => ({
      ...a,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
    testMode: true, // Start in test mode
    executionCount: 0
  };
}
