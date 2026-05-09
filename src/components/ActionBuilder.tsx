/**
 * ModRule Engine - Action Builder Component
 * @ts-nocheck - Devvit JSX requires special build pipeline
 * 
 * Modular UI component for building individual action rows
 * in the Visual Rule Builder. Uses Devvit's UI toolkit.
 */

import { Action, ActionType, ActionConfig, AVAILABLE_ACTIONS } from '../types';

/**
 * Action configuration fields by action type
 * Defines what config options each action type needs
 */
export const ACTION_CONFIG_FIELDS: Record<
  ActionType,
  { name: string; label: string; type: 'text' | 'number' | 'textarea' | 'boolean'; required: boolean; placeholder?: string }[]
> = {
  [ActionType.REMOVE_POST]: [
    { name: 'reason', label: 'Removal Reason', type: 'text', required: false, placeholder: 'e.g., Spam detected' },
    { name: 'spam', label: 'Mark as Spam', type: 'boolean', required: false }
  ],
  [ActionType.REMOVE_COMMENT]: [
    { name: 'reason', label: 'Removal Reason', type: 'text', required: false, placeholder: 'e.g., Off-topic' }
  ],
  [ActionType.BAN_USER]: [
    { name: 'duration', label: 'Duration (days, 0=permanent)', type: 'number', required: false, placeholder: 'e.g., 7' },
    { name: 'reason', label: 'Ban Reason', type: 'text', required: false, placeholder: 'e.g., Repeated spam' },
    { name: 'note', label: 'Mod Note', type: 'text', required: false }
  ],
  [ActionType.MUTE_USER]: [
    { name: 'duration', label: 'Duration (days)', type: 'number', required: false, placeholder: 'e.g., 3' }
  ],
  [ActionType.SEND_MODMAIL]: [
    { name: 'modmailSubject', label: 'Subject', type: 'text', required: true, placeholder: 'e.g., Post removed' },
    { name: 'modmailBody', label: 'Message Body', type: 'textarea', required: true, placeholder: 'Your post was removed because...' }
  ],
  [ActionType.FLAIR_POST]: [
    { name: 'flairText', label: 'Flair Text', type: 'text', required: true, placeholder: 'e.g., NSFW' },
    { name: 'flairCSSClass', label: 'CSS Class', type: 'text', required: false, placeholder: 'e.g., nsfw-tag' }
  ],
  [ActionType.LOCK_THREAD]: [
    // No config needed
  ],
  [ActionType.APPROVE_POST]: [
    // No config needed
  ],
  [ActionType.APPROVE_COMMENT]: [
    // No config needed
  ],
  [ActionType.ADD_TO_QUEUE]: [
    { name: 'reason', label: 'Queue Reason', type: 'text', required: false, placeholder: 'e.g., Needs review' }
  ],
  [ActionType.ADD_NOTE]: [
    { name: 'note', label: 'Note Content', type: 'textarea', required: true, placeholder: 'e.g., Check for ban evasion' }
  ],
  [ActionType.SEND_WEBHOOK]: [
    { name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://discord.com/api/webhooks/...' }
  ],
  [ActionType.SHADOWBAN]: [
    { name: 'reason', label: 'Reason', type: 'text', required: false }
  ]
};

/**
 * Create a default action
 */
export function createDefaultAction(actionType?: ActionType): Action {
  const type = actionType || ActionType.REMOVE_POST;
  return {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    config: {},
    delay: 0
  };
}

/**
 * Build an action row UI element for Devvit forms
 */
export function ActionRow(
  index: number,
  action: Action,
  onRemove: (index: number) => void
): any {
  const configFields = ACTION_CONFIG_FIELDS[action.type] || [];
  const actionLabel = AVAILABLE_ACTIONS.find(a => a.type === action.type)?.label || action.type;

  return (
    <vstack
      key={`action_${index}`}
      gap="small"
      padding="small"
      backgroundColor="rgba(0,0,0,0.03)"
      cornerRadius="small"
      border="thin"
      borderColor="neutral"
    >
      <hstack gap="small" alignment="center middle">
        <text size="small" weight="bold" color="secondary">
          {index === 0 ? 'THEN' : 'AND'}
        </text>
        <spacer />
        <button
          size="small"
          appearance="destructive"
          onPress={() => onRemove(index)}
        >
          ✕
        </button>
      </hstack>

      <vstack>
        <text size="xsmall" color="secondary">Action Type</text>
        <select name={`action_type_${index}`} defaultValue={action.type}>
          {AVAILABLE_ACTIONS.map(a => (
            <option key={a.type} value={a.type}>
              {a.icon} {a.label}
            </option>
          ))}
        </select>
      </vstack>

      {configFields.length > 0 && (
        <vstack gap="small">
          <text size="xsmall" weight="bold" color="secondary">Configuration</text>
          {configFields.map(field => (
            <vstack key={`${action.id}_${field.name}`}>
              <text size="xsmall" color="secondary">
                {field.label}{field.required ? ' *' : ''}
              </text>
              {field.type === 'textarea' ? (
                <textArea
                  name={`action_${index}_config_${field.name}`}
                  placeholder={field.placeholder || ''}
                  defaultValue={action.config[field.name as keyof ActionConfig] || ''}
                />
              ) : field.type === 'boolean' ? (
                <select
                  name={`action_${index}_config_${field.name}`}
                  defaultValue={String(action.config[field.name as keyof ActionConfig] || 'false')}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <textField
                  name={`action_${index}_config_${field.name}`}
                  placeholder={field.placeholder || ''}
                  defaultValue={String(action.config[field.name as keyof ActionConfig] || '')}
                />
              )}
            </vstack>
          ))}
        </vstack>
      )}

      <vstack>
        <text size="xsmall" color="secondary">Delay (seconds, optional)</text>
        <textField
          name={`action_delay_${index}`}
          placeholder="0"
          defaultValue={String(action.delay || 0)}
        />
      </vstack>
    </vstack>
  );
}

/**
 * Extract actions from form data submitted by the visual builder
 * 
 * Form fields are named: action_type_0, action_0_config_reason, action_delay_0, etc.
 */
export function extractActionsFromForm(formData: Record<string, any>): Action[] {
  const actions: Action[] = [];
  const indices = new Set<number>();

  // Find all action indices from form field names
  for (const key of Object.keys(formData)) {
    const match = key.match(/^action_type_(\d+)$/);
    if (match) {
      indices.add(parseInt(match[1], 10));
    }
  }

  for (const index of Array.from(indices).sort((a, b) => a - b)) {
    const type = formData[`action_type_${index}`] as ActionType;
    const delayStr = formData[`action_delay_${index}`];
    const delay = delayStr ? parseInt(String(delayStr), 10) : 0;

    if (!type) {
      continue;
    }

    // Extract config fields for this action type
    const configFields = ACTION_CONFIG_FIELDS[type] || [];
    const config: ActionConfig = {};

    for (const field of configFields) {
      const value = formData[`action_${index}_config_${field.name}`];
      if (value !== undefined && value !== '') {
        if (field.type === 'number') {
          const num = Number(value);
          if (!isNaN(num)) {
            (config as any)[field.name] = num;
          }
        } else if (field.type === 'boolean') {
          (config as any)[field.name] = value === 'true';
        } else {
          (config as any)[field.name] = value;
        }
      }
    }

    actions.push({
      id: `action_${Date.now()}_${index}`,
      type,
      config,
      delay: isNaN(delay) ? 0 : delay
    });
  }

  return actions;
}

/**
 * Get action type description
 */
export function getActionDescription(actionType: ActionType): string {
  const action = AVAILABLE_ACTIONS.find(a => a.type === actionType);
  return action?.description || actionType;
}

/**
 * Group actions by category for better UI organization
 */
export function getActionsByCategory(): { category: string; actions: typeof AVAILABLE_ACTIONS }[] {
  const categories: Record<string, typeof AVAILABLE_ACTIONS> = {
    'Content': [],
    'User': [],
    'Communication': [],
    'Workflow': []
  };

  for (const action of AVAILABLE_ACTIONS) {
    if ([ActionType.REMOVE_POST, ActionType.REMOVE_COMMENT, ActionType.APPROVE_POST, ActionType.APPROVE_COMMENT, ActionType.FLAIR_POST, ActionType.LOCK_THREAD].includes(action.type)) {
      categories['Content'].push(action);
    } else if ([ActionType.BAN_USER, ActionType.MUTE_USER, ActionType.SHADOWBAN].includes(action.type)) {
      categories['User'].push(action);
    } else if ([ActionType.SEND_MODMAIL, ActionType.SEND_WEBHOOK].includes(action.type)) {
      categories['Communication'].push(action);
    } else {
      categories['Workflow'].push(action);
    }
  }

  return Object.entries(categories)
    .filter(([_, actions]) => actions.length > 0)
    .map(([category, actions]) => ({ category, actions }));
}
