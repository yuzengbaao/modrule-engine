/**
 * ModRule Engine - Visual Rule Builder Component
 * @ts-nocheck - Devvit JSX requires special build pipeline
 * 
 * The main visual rule builder form that allows moderators to construct
 * rules step-by-step using Devvit's UI toolkit. Features:
 * - Step-by-step wizard: Trigger → Conditions → Actions → Preview
 * - Add/remove conditions and actions dynamically
 * - Live natural language preview
 * - Validation before saving
 */

import { Devvit } from '@devvit/public-api';
import { Rule, TriggerType, AVAILABLE_TRIGGERS } from '../types';
import { RuleEngine } from '../engine/RuleEngine';
import { RuleStorage } from '../storage/RuleStorage';
import {
  generateRuleDescription,
  generateRuleSummary,
  validateRule,
  RulePreviewCard
} from './RulePreview';
import {
  ConditionRow,
  extractConditionsFromForm,
  createDefaultCondition
} from './ConditionBuilder';
import {
  ActionRow,
  extractActionsFromForm,
  createDefaultAction
} from './ActionBuilder';

/**
 * Build the Visual Rule Builder form
 * 
 * This is a multi-step form that collects rule data and shows a preview.
 * Due to Devvit's stateless form model, we use a step-by-step approach
 * where each step submits to the next step.
 */
export function createVisualRuleBuilderForm(
  context: Devvit.Context,
  engine: RuleEngine,
  storage: RuleStorage,
  step: 'trigger' | 'conditions' | 'actions' | 'preview' = 'trigger',
  draftRule?: Partial<Rule>,
  errorMessage?: string
): any {
  const ui = context.ui;

  // Initialize draft if not provided
  const draft = draftRule || {
    id: `draft_${Date.now()}`,
    name: '',
    description: '',
    enabled: false,
    trigger: { type: TriggerType.POST_CREATED, config: {} },
    conditions: [],
    actions: [],
    testMode: true
  };

  switch (step) {
    case 'trigger':
      return buildTriggerStep(context, engine, storage, draft, errorMessage);
    case 'conditions':
      return buildConditionsStep(context, engine, storage, draft, errorMessage);
    case 'actions':
      return buildActionsStep(context, engine, storage, draft, errorMessage);
    case 'preview':
      return buildPreviewStep(context, engine, storage, draft, errorMessage);
    default:
      return buildTriggerStep(context, engine, storage, draft, errorMessage);
  }
}

/**
 * Step 1: Trigger Selection + Rule Basics
 */
function buildTriggerStep(
  context: Devvit.Context,
  engine: RuleEngine,
  storage: RuleStorage,
  draft: Partial<Rule>,
  errorMessage?: string
): any {
  const ui = context.ui;

  return (
    <form onSubmit={async (data) => {
      const updatedDraft: Partial<Rule> = {
        ...draft,
        name: data.name || draft.name,
        description: data.description || draft.description,
        trigger: {
          type: data.trigger as TriggerType,
          config: {}
        }
      };

      // Validate basics
      if (!updatedDraft.name || updatedDraft.name.trim().length < 3) {
        ui.showForm(createVisualRuleBuilderForm(
          context, engine, storage, 'trigger', updatedDraft,
          'Rule name must be at least 3 characters'
        ));
        return;
      }

      ui.showForm(createVisualRuleBuilderForm(
        context, engine, storage, 'conditions', updatedDraft
      ));
    }}>
      <vstack gap="medium" padding="medium">
        <hstack gap="small" alignment="center middle">
          <text size="xlarge" weight="bold">🛠️ Visual Rule Builder</text>
        </hstack>

        <text size="small" color="secondary">
          Step 1 of 4: Rule Basics & Trigger
        </text>

        {/* Progress indicator */}
        <hstack gap="small">
          <vstack grow padding="small" backgroundColor="brand" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">1. Trigger</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">2. Conditions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">3. Actions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">4. Preview</text>
          </vstack>
        </hstack>

        {errorMessage && (
          <vstack padding="small" backgroundColor="rgba(255,0,0,0.1)" cornerRadius="small">
            <text size="small" color="danger">⚠️ {errorMessage}</text>
          </vstack>
        )}

        <vstack gap="small">
          <text weight="bold">Rule Name *</text>
          <textField
            name="name"
            placeholder="e.g., Spam Detection"
            defaultValue={draft.name || ''}
            required
          />
        </vstack>

        <vstack gap="small">
          <text weight="bold">Description</text>
          <textArea
            name="description"
            placeholder="What does this rule do?"
            defaultValue={draft.description || ''}
          />
        </vstack>

        <vstack gap="small">
          <text weight="bold">When this happens (Trigger) *</text>
          <select name="trigger" required defaultValue={draft.trigger?.type || TriggerType.POST_CREATED}>
            {AVAILABLE_TRIGGERS.map(t => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <text size="xsmall" color="secondary">
            {AVAILABLE_TRIGGERS.find(t => t.type === (draft.trigger?.type || TriggerType.POST_CREATED))?.description}
          </text>
        </vstack>

        <hstack gap="small">
          <button appearance="secondary" onPress={() => ui.showForm(createRuleBuilderForm(context, storage))}>
            Cancel
          </button>
          <button appearance="primary" type="submit">
            Next: Conditions →
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Step 2: Condition Builder
 */
function buildConditionsStep(
  context: Devvit.Context,
  engine: RuleEngine,
  storage: RuleStorage,
  draft: Partial<Rule>,
  errorMessage?: string
): any {
  const ui = context.ui;
  const conditions = draft.conditions || [];

  return (
    <form onSubmit={async (data) => {
      const extractedConditions = extractConditionsFromForm(data);
      const updatedDraft: Partial<Rule> = {
        ...draft,
        conditions: extractedConditions
      };

      ui.showForm(createVisualRuleBuilderForm(
        context, engine, storage, 'actions', updatedDraft
      ));
    }}>
      <vstack gap="medium" padding="medium">
        <hstack gap="small" alignment="center middle">
          <text size="xlarge" weight="bold">🛠️ Visual Rule Builder</text>
        </hstack>

        <text size="small" color="secondary">
          Step 2 of 4: Conditions (IF)
        </text>

        {/* Progress indicator */}
        <hstack gap="small">
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Trigger</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="brand" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">2. Conditions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">3. Actions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">4. Preview</text>
          </vstack>
        </hstack>

        {errorMessage && (
          <vstack padding="small" backgroundColor="rgba(255,0,0,0.1)" cornerRadius="small">
            <text size="small" color="danger">⚠️ {errorMessage}</text>
          </vstack>
        )}

        <vstack gap="small">
          <text weight="bold">IF the following conditions are met:</text>
          <text size="xsmall" color="secondary">
            All conditions must match for the rule to fire (AND logic)
          </text>
        </vstack>

        {/* Condition rows */}
        <vstack gap="small">
          {conditions.map((condition, index) =>
            ConditionRow(index, condition, (idx) => {
              // Remove condition and rebuild form
              const updated = conditions.filter((_, i) => i !== idx);
              const updatedDraft = { ...draft, conditions: updated };
              ui.showForm(createVisualRuleBuilderForm(
                context, engine, storage, 'conditions', updatedDraft
              ));
            })
          )}
        </vstack>

        {/* Add condition button */}
        <button
          appearance="secondary"
          onPress={() => {
            const newCond = createDefaultCondition('post.title');
            const updatedDraft = {
              ...draft,
              conditions: [...conditions, newCond]
            };
            ui.showForm(createVisualRuleBuilderForm(
              context, engine, storage, 'conditions', updatedDraft
            ));
          }}
        >
          + Add Condition
        </button>

        {conditions.length === 0 && (
          <text size="small" color="warning">
            ⚠️ No conditions added. The rule will fire on every trigger.
          </text>
        )}

        <hstack gap="small">
          <button
            appearance="secondary"
            onPress={() => ui.showForm(createVisualRuleBuilderForm(
              context, engine, storage, 'trigger', draft
            ))}
          >
            ← Back
          </button>
          <button appearance="primary" type="submit">
            Next: Actions →
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Step 3: Action Builder
 */
function buildActionsStep(
  context: Devvit.Context,
  engine: RuleEngine,
  storage: RuleStorage,
  draft: Partial<Rule>,
  errorMessage?: string
): any {
  const ui = context.ui;
  const actions = draft.actions || [];

  return (
    <form onSubmit={async (data) => {
      const extractedActions = extractActionsFromForm(data);
      const updatedDraft: Partial<Rule> = {
        ...draft,
        actions: extractedActions
      };

      // Validate that at least one action exists
      if (extractedActions.length === 0) {
        ui.showForm(createVisualRuleBuilderForm(
          context, engine, storage, 'actions', updatedDraft,
          'At least one action is required'
        ));
        return;
      }

      ui.showForm(createVisualRuleBuilderForm(
        context, engine, storage, 'preview', updatedDraft
      ));
    }}>
      <vstack gap="medium" padding="medium">
        <hstack gap="small" alignment="center middle">
          <text size="xlarge" weight="bold">🛠️ Visual Rule Builder</text>
        </hstack>

        <text size="small" color="secondary">
          Step 3 of 4: Actions (THEN)
        </text>

        {/* Progress indicator */}
        <hstack gap="small">
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Trigger</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Conditions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="brand" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">3. Actions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="rgba(0,0,0,0.1)" cornerRadius="small">
            <text size="xsmall" alignment="center">4. Preview</text>
          </vstack>
        </hstack>

        {errorMessage && (
          <vstack padding="small" backgroundColor="rgba(255,0,0,0.1)" cornerRadius="small">
            <text size="small" color="danger">⚠️ {errorMessage}</text>
          </vstack>
        )}

        <vstack gap="small">
          <text weight="bold">THEN execute these actions:</text>
          <text size="xsmall" color="secondary">
            Actions run in order. Critical actions stop execution on failure.
          </text>
        </vstack>

        {/* Action rows */}
        <vstack gap="small">
          {actions.map((action, index) =>
            ActionRow(index, action, (idx) => {
              const updated = actions.filter((_, i) => i !== idx);
              const updatedDraft = { ...draft, actions: updated };
              ui.showForm(createVisualRuleBuilderForm(
                context, engine, storage, 'actions', updatedDraft
              ));
            })
          )}
        </vstack>

        {/* Add action button */}
        <button
          appearance="secondary"
          onPress={() => {
            const newAction = createDefaultAction(ActionType.REMOVE_POST);
            const updatedDraft = {
              ...draft,
              actions: [...actions, newAction]
            };
            ui.showForm(createVisualRuleBuilderForm(
              context, engine, storage, 'actions', updatedDraft
            ));
          }}
        >
          + Add Action
        </button>

        {actions.length === 0 && (
          <text size="small" color="warning">
            ⚠️ No actions added. The rule would do nothing when triggered.
          </text>
        )}

        <hstack gap="small">
          <button
            appearance="secondary"
            onPress={() => ui.showForm(createVisualRuleBuilderForm(
              context, engine, storage, 'conditions', draft
            ))}
          >
            ← Back
          </button>
          <button appearance="primary" type="submit">
            Next: Preview →
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Step 4: Preview & Save
 */
function buildPreviewStep(
  context: Devvit.Context,
  engine: RuleEngine,
  storage: RuleStorage,
  draft: Partial<Rule>,
  errorMessage?: string
): any {
  const ui = context.ui;

  // Build a temporary Rule object for preview
  const previewRule: Rule = {
    id: draft.id || `draft_${Date.now()}`,
    name: draft.name || 'Untitled Rule',
    description: draft.description || '',
    enabled: false,
    trigger: draft.trigger || { type: TriggerType.POST_CREATED, config: {} },
    conditions: draft.conditions || [],
    actions: draft.actions || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: context.userId || 'unknown',
    testMode: true,
    executionCount: 0
  };

  const description = generateRuleDescription(previewRule);
  const summary = generateRuleSummary(previewRule);
  const validationIssues = validateRule(previewRule);

  return (
    <form onSubmit={async (data) => {
      const subreddit = context.reddit.getCurrentSubredditName();
      const now = Date.now();

      const rule: Rule = {
        id: draft.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: draft.name || 'Untitled Rule',
        description: draft.description || '',
        enabled: data.startEnabled === 'true',
        trigger: draft.trigger || { type: TriggerType.POST_CREATED, config: {} },
        conditions: draft.conditions || [],
        actions: draft.actions || [],
        createdAt: now,
        updatedAt: now,
        createdBy: context.userId || 'unknown',
        testMode: data.startEnabled !== 'true', // Start in test mode unless explicitly enabled
        executionCount: 0
      };

      try {
        await storage.saveRule(subreddit, rule);
        ui.showToast(`Rule "${rule.name}" saved successfully!`);
        ui.showForm(createRuleBuilderForm(context, storage));
      } catch (error) {
        ui.showToast('Failed to save rule. Please try again.');
        ui.showForm(createVisualRuleBuilderForm(
          context, engine, storage, 'preview', draft,
          'Failed to save rule'
        ));
      }
    }}>
      <vstack gap="medium" padding="medium">
        <hstack gap="small" alignment="center middle">
          <text size="xlarge" weight="bold">🛠️ Visual Rule Builder</text>
        </hstack>

        <text size="small" color="secondary">
          Step 4 of 4: Preview & Save
        </text>

        {/* Progress indicator */}
        <hstack gap="small">
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Trigger</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Conditions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="success" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">✓ Actions</text>
          </vstack>
          <vstack grow padding="small" backgroundColor="brand" cornerRadius="small">
            <text size="xsmall" color="white" alignment="center">4. Preview</text>
          </vstack>
        </hstack>

        {errorMessage && (
          <vstack padding="small" backgroundColor="rgba(255,0,0,0.1)" cornerRadius="small">
            <text size="small" color="danger">⚠️ {errorMessage}</text>
          </vstack>
        )}

        {/* Rule Preview Card */}
        <vstack
          gap="small"
          padding="medium"
          backgroundColor="rgba(0,0,0,0.05)"
          cornerRadius="medium"
          border="thin"
        >
          <text size="small" weight="bold" color="brand">
            📋 Rule Preview
          </text>

          <text size="large" weight="bold">
            {previewRule.name}
          </text>

          {previewRule.description && (
            <text size="small" color="secondary">
              {previewRule.description}
            </text>
          )}

          <hstack gap="small">
            <vstack padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small" grow>
              <text size="xsmall" color="secondary">Trigger</text>
              <text size="small" weight="bold">{summary.split('→')[0]?.trim()}</text>
            </vstack>
            <text size="large">→</text>
            <vstack padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small" grow>
              <text size="xsmall" color="secondary">Actions</text>
              <text size="small" weight="bold">{summary.split('→')[1]?.trim()}</text>
            </vstack>
          </hstack>

          <vstack padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small">
            <text size="xsmall" weight="bold" color="secondary">Natural Language Description</text>
            <text size="small">{description}</text>
          </vstack>

          {previewRule.conditions.length > 0 && (
            <vstack padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small">
              <text size="xsmall" weight="bold" color="secondary">Conditions ({previewRule.conditions.length})</text>
              {previewRule.conditions.map((c, i) => (
                <text key={c.id} size="small">
                  {i + 1}. {getFieldDisplayName(c.field)} {getOperatorLabel(c.operator)} "{String(c.value)}"
                  {c.negate && ' (NOT)'}
                </text>
              ))}
            </vstack>
          )}

          {previewRule.actions.length > 0 && (
            <vstack padding="small" backgroundColor="rgba(0,0,0,0.05)" cornerRadius="small">
              <text size="xsmall" weight="bold" color="secondary">Actions ({previewRule.actions.length})</text>
              {previewRule.actions.map((a, i) => (
                <text key={a.id} size="small">
                  {i + 1}. {getActionLabel(a.type)}
                  {a.delay > 0 && ` (delay: ${a.delay}s)`}
                </text>
              ))}
            </vstack>
          )}
        </vstack>

        {/* Validation Warnings */}
        {validationIssues.length > 0 && (
          <vstack gap="small">
            {validationIssues.map((issue, i) => (
              <hstack key={`issue_${i}`} gap="small" alignment="center middle">
                <text size="small" color="warning">⚠️ {issue}</text>
              </hstack>
            ))}
          </vstack>
        )}

        {/* Enable option */}
        <vstack gap="small">
          <text weight="bold">Save Options</text>
          <select name="startEnabled" defaultValue="false">
            <option value="false">
              Save in TEST mode (recommended)
            </option>
            <option value="true">
              Save and ENABLE immediately
            </option>
          </select>
          <text size="xsmall" color="secondary">
            Test mode evaluates conditions without executing actions.
          </text>
        </vstack>

        <hstack gap="small">
          <button
            appearance="secondary"
            onPress={() => ui.showForm(createVisualRuleBuilderForm(
              context, engine, storage, 'actions', draft
            ))}
          >
            ← Back
          </button>
          <button appearance="primary" type="submit">
            💾 Save Rule
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Helper: Get field display name
 */
function getFieldDisplayName(field: string): string {
  const names: Record<string, string> = {
    'post.title': 'Post Title',
    'post.body': 'Post Body',
    'post.url': 'Post URL',
    'post.flair': 'Post Flair',
    'post.karma': 'Post Karma',
    'post.commentCount': 'Comment Count',
    'post.isOC': 'Original Content',
    'post.isSpoiler': 'Spoiler',
    'post.isNSFW': 'NSFW',
    'comment.body': 'Comment Body',
    'comment.karma': 'Comment Karma',
    'user.name': 'Username',
    'user.karma': 'User Karma',
    'user.accountAgeDays': 'Account Age',
    'user.flair': 'User Flair',
    'user.isMod': 'Is Moderator',
    'user.isAdmin': 'Is Admin',
    'report.reason': 'Report Reason',
    'report.count': 'Report Count'
  };
  return names[field] || field;
}

/**
 * Helper: Get operator short label
 */
function getOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    'equals': '=',
    'not_equals': '≠',
    'contains': 'contains',
    'not_contains': 'not contains',
    'greater_than': '>',
    'less_than': '<',
    'greater_than_or_equal': '≥',
    'less_than_or_equal': '≤',
    'matches_regex': 'matches',
    'in_list': 'in',
    'not_in_list': 'not in',
    'starts_with': 'starts',
    'ends_with': 'ends'
  };
  return labels[operator] || operator;
}

/**
 * Helper: Get action label
 */
function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'remove_post': '🗑️ Remove Post',
    'remove_comment': '🗑️ Remove Comment',
    'ban_user': '🚫 Ban User',
    'mute_user': '🔇 Mute User',
    'send_modmail': '📧 Send Modmail',
    'flair_post': '🏷️ Flair Post',
    'lock_thread': '🔒 Lock Thread',
    'approve_post': '✅ Approve Post',
    'approve_comment': '✅ Approve Comment',
    'add_to_queue': '📋 Add to Queue',
    'add_note': '📝 Add Note',
    'send_webhook': '🔗 Send Webhook',
    'shadowban': '👤 Shadowban'
  };
  return labels[actionType] || actionType;
}

/**
 * Legacy compatibility: Original Rule Builder form
 * Updated to use the new Visual Rule Builder as primary
 */
export async function createRuleBuilderForm(
  context: Devvit.Context,
  storage: RuleStorage
): Promise<any> {
  const ui = context.ui;
  const rules = await storage.getAllRules(context.reddit.getCurrentSubredditName());

  return (
    <form>
      <vstack gap="medium" padding="medium">
        <hstack gap="small" alignment="center middle">
          <text size="xlarge" weight="bold">📐 ModRule Engine</text>
        </hstack>

        <text size="small" color="secondary">
          Visual IF-THEN rule builder for automated moderation
        </text>

        {/* Stats bar */}
        <hstack gap="medium" alignment="center">
          <vstack alignment="center">
            <text size="xsmall" color="secondary">Rules</text>
            <text size="large" weight="bold">{rules.length}</text>
          </vstack>
          <vstack alignment="center">
            <text size="xsmall" color="secondary">Active</text>
            <text size="large" weight="bold">
              {rules.filter(r => r.enabled).length}
            </text>
          </vstack>
        </hstack>

        <divider />

        {rules.length === 0 ? (
          <vstack gap="medium" alignment="center">
            <text size="small" color="secondary">
              No rules yet. Create your first moderation rule!
            </text>
            <button
              appearance="primary"
              onPress={() => {
                // Initialize engine and storage for visual builder
                const ruleStorage = new RuleStorage();
                const ruleEngine = new RuleEngine(ruleStorage);
                ui.showForm(createVisualRuleBuilderForm(
                  context, ruleEngine, ruleStorage, 'trigger'
                ));
              }}
            >
              🛠️ Create Visual Rule
            </button>
          </vstack>
        ) : (
          <vstack gap="small">
            <text size="small" weight="bold">Your Rules</text>
            {rules.map(rule => (
              <hstack
                key={rule.id}
                gap="small"
                padding="small"
                backgroundColor="rgba(0,0,0,0.03)"
                cornerRadius="small"
                alignment="center middle"
              >
                <vstack grow>
                  <text weight="bold" size="small">{rule.name}</text>
                  <hstack gap="small">
                    <text size="xsmall" color={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? '🟢 Active' : '⚪ Inactive'}
                    </text>
                    {rule.testMode && (
                      <text size="xsmall" color="warning">Test Mode</text>
                    )}
                    <text size="xsmall" color="secondary">
                      {rule.executionCount} runs
                    </text>
                  </hstack>
                </vstack>

                <hstack gap="small">
                  <button
                    size="small"
                    appearance={rule.enabled ? 'secondary' : 'primary'}
                    onPress={async () => {
                      const subreddit = context.reddit.getCurrentSubredditName();
                      rule.enabled = !rule.enabled;
                      await storage.updateRule(subreddit, rule);
                      ui.showToast(rule.enabled ? 'Rule enabled' : 'Rule disabled');
                      ui.showForm(await createRuleBuilderForm(context, storage));
                    }}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    size="small"
                    onPress={() => {
                      const ruleStorage = new RuleStorage();
                      const ruleEngine = new RuleEngine(ruleStorage);
                      ui.showForm(createVisualRuleBuilderForm(
                        context, ruleEngine, ruleStorage, 'trigger',
                        { ...rule }
                      ));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    size="small"
                    appearance="destructive"
                    onPress={() => ui.showForm(createDeleteConfirmForm(context, storage, rule.id))}
                  >
                    Delete
                  </button>
                </hstack>
              </hstack>
            ))}
          </vstack>
        )}

        <divider />

        <hstack gap="small">
          <button
            appearance="primary"
            onPress={() => {
              const ruleStorage = new RuleStorage();
              const ruleEngine = new RuleEngine(ruleStorage);
              ui.showForm(createVisualRuleBuilderForm(
                context, ruleEngine, ruleStorage, 'trigger'
              ));
            }}
          >
            + New Visual Rule
          </button>
          <button
            appearance="secondary"
            onPress={() => ui.showForm(createAnalyticsForm(context))}
          >
            📊 Analytics
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Delete confirmation form
 */
function createDeleteConfirmForm(
  context: Devvit.Context,
  storage: RuleStorage,
  ruleId: string
): any {
  const ui = context.ui;

  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold" color="danger">🗑️ Delete Rule?</text>
        <text size="small">
          This action cannot be undone. The rule and its execution history will be permanently removed.
        </text>

        <hstack gap="small">
          <button
            appearance="destructive"
            onPress={async () => {
              const subreddit = context.reddit.getCurrentSubredditName();
              await storage.deleteRule(subreddit, ruleId);
              ui.showToast('Rule deleted');
              ui.showForm(await createRuleBuilderForm(context, storage));
            }}
          >
            Yes, Delete
          </button>
          <button
            appearance="secondary"
            onPress={() => ui.showForm(createRuleBuilderForm(context, storage))}
          >
            Cancel
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

/**
 * Analytics form (stub - delegates to main.ts implementation)
 */
function createAnalyticsForm(context: Devvit.Context): any {
  // This is a placeholder that should be replaced with the actual analytics form
  // from main.ts to avoid duplication. In practice, the main.ts analytics form
  // should be imported or the menu item should call the main.ts version.
  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">📊 Analytics</text>
        <text size="small" color="secondary">View full analytics from the main menu.</text>
        <button onPress={() => context.ui.showToast('Use the Analytics menu item')}>
          OK
        </button>
      </vstack>
    </form>
  );
}
