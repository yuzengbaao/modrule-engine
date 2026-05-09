/**
 * ModRule Engine - Condition Builder Component
 * @ts-nocheck - Devvit JSX requires special build pipeline
 * 
 * Modular UI component for building individual condition rows
 * in the Visual Rule Builder. Uses Devvit's UI toolkit.
 */

import {
  Condition,
  ConditionOperator,
  AVAILABLE_FIELDS,
  AVAILABLE_TRIGGERS
} from '../types';

/**
 * Available operators grouped by field type for the UI
 */
export const OPERATORS_BY_TYPE: Record<string, { value: ConditionOperator; label: string }[]> = {
  string: [
    { value: ConditionOperator.EQUALS, label: 'is' },
    { value: ConditionOperator.NOT_EQUALS, label: 'is not' },
    { value: ConditionOperator.CONTAINS, label: 'contains' },
    { value: ConditionOperator.NOT_CONTAINS, label: 'does not contain' },
    { value: ConditionOperator.STARTS_WITH, label: 'starts with' },
    { value: ConditionOperator.ENDS_WITH, label: 'ends with' },
    { value: ConditionOperator.MATCHES_REGEX, label: 'matches regex' }
  ],
  number: [
    { value: ConditionOperator.EQUALS, label: 'equals' },
    { value: ConditionOperator.NOT_EQUALS, label: 'not equals' },
    { value: ConditionOperator.GREATER_THAN, label: 'greater than' },
    { value: ConditionOperator.LESS_THAN, label: 'less than' },
    { value: ConditionOperator.GREATER_THAN_OR_EQUAL, label: 'at least' },
    { value: ConditionOperator.LESS_THAN_OR_EQUAL, label: 'at most' }
  ],
  boolean: [
    { value: ConditionOperator.EQUALS, label: 'is' },
    { value: ConditionOperator.NOT_EQUALS, label: 'is not' }
  ],
  list: [
    { value: ConditionOperator.IN_LIST, label: 'is in list' },
    { value: ConditionOperator.NOT_IN_LIST, label: 'is not in list' },
    { value: ConditionOperator.CONTAINS, label: 'contains' }
  ]
};

/**
 * Get the field type for a given field name
 */
export function getFieldType(fieldName: string): string {
  const field = AVAILABLE_FIELDS.find(f => f.name === fieldName);
  return field?.type || 'string';
}

/**
 * Get available operators for a field
 */
export function getOperatorsForField(fieldName: string): { value: ConditionOperator; label: string }[] {
  const type = getFieldType(fieldName);
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
}

/**
 * Create a default condition for a field
 */
export function createDefaultCondition(fieldName: string): Condition {
  const operators = getOperatorsForField(fieldName);
  return {
    id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    field: fieldName,
    operator: operators[0]?.value || ConditionOperator.EQUALS,
    value: '',
    negate: false
  };
}

/**
 * Parse a condition value from form input based on field type
 */
export function parseConditionValue(fieldName: string, rawValue: string): string | number | boolean | string[] {
  const type = getFieldType(fieldName);

  if (type === 'number') {
    const num = Number(rawValue);
    return isNaN(num) ? rawValue : num;
  }

  if (type === 'boolean') {
    return rawValue === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'yes';
  }

  if (type === 'list') {
    return rawValue.split(',').map(s => s.trim()).filter(Boolean);
  }

  return rawValue;
}

/**
 * Build a condition row UI element for Devvit forms
 * 
 * This is designed to be used within a form where each condition
 * has its own set of form fields with indexed names.
 */
export function ConditionRow(
  index: number,
  condition: Condition,
  onRemove: (index: number) => void
): any {
  const operators = getOperatorsForField(condition.field);
  const fieldType = getFieldType(condition.field);

  return (
    <vstack
      key={`cond_${index}`}
      gap="small"
      padding="small"
      backgroundColor="rgba(0,0,0,0.03)"
      cornerRadius="small"
      border="thin"
      borderColor="neutral"
    >
      <hstack gap="small" alignment="center middle">
        <text size="small" weight="bold" color="secondary">
          {index === 0 ? 'IF' : 'AND'}
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

      <hstack gap="small">
        <vstack grow>
          <text size="xsmall" color="secondary">Field</text>
          <select name={`cond_field_${index}`} defaultValue={condition.field}>
            {AVAILABLE_FIELDS.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
        </vstack>

        <vstack grow>
          <text size="xsmall" color="secondary">Operator</text>
          <select name={`cond_op_${index}`} defaultValue={condition.operator}>
            {operators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </vstack>
      </hstack>

      <vstack>
        <text size="xsmall" color="secondary">Value</text>
        {fieldType === 'boolean' ? (
          <select name={`cond_value_${index}`} defaultValue={String(condition.value)}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <textField
            name={`cond_value_${index}`}
            placeholder={fieldType === 'number' ? 'e.g., 10' : 'e.g., spam, scam'}
            defaultValue={String(condition.value)}
          />
        )}
      </vstack>

      <hstack gap="small">
        <select name={`cond_negate_${index}`} defaultValue={condition.negate ? 'true' : 'false'}>
          <option value="false">Must match</option>
          <option value="true">Must NOT match</option>
        </select>
      </hstack>
    </vstack>
  );
}

/**
 * Extract conditions from form data submitted by the visual builder
 * 
 * Form fields are named: cond_field_0, cond_op_0, cond_value_0, cond_negate_0, etc.
 */
export function extractConditionsFromForm(formData: Record<string, any>): Condition[] {
  const conditions: Condition[] = [];
  const indices = new Set<number>();

  // Find all condition indices from form field names
  for (const key of Object.keys(formData)) {
    const match = key.match(/^cond_field_(\d+)$/);
    if (match) {
      indices.add(parseInt(match[1], 10));
    }
  }

  for (const index of Array.from(indices).sort((a, b) => a - b)) {
    const field = formData[`cond_field_${index}`];
    const operator = formData[`cond_op_${index}`] as ConditionOperator;
    const rawValue = formData[`cond_value_${index}`];
    const negate = formData[`cond_negate_${index}`] === 'true';

    if (!field || !operator || rawValue === undefined) {
      continue;
    }

    const value = parseConditionValue(field, String(rawValue));

    conditions.push({
      id: `cond_${Date.now()}_${index}`,
      field,
      operator,
      value,
      negate
    });
  }

  return conditions;
}

/**
 * Get field options grouped by category for better UI organization
 */
export function getFieldOptionsByCategory(): { category: string; fields: { name: string; label: string }[] }[] {
  const categories: Record<string, { name: string; label: string }[]> = {
    'Post': [],
    'Comment': [],
    'User': [],
    'Report': []
  };

  for (const field of AVAILABLE_FIELDS) {
    const category = field.name.split('.')[0];
    const catKey = category.charAt(0).toUpperCase() + category.slice(1);
    if (!categories[catKey]) {
      categories[catKey] = [];
    }
    categories[catKey].push(field);
  }

  return Object.entries(categories)
    .filter(([_, fields]) => fields.length > 0)
    .map(([category, fields]) => ({ category, fields }));
}
