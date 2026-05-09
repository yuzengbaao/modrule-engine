/**
 * ModRule Engine - Condition Evaluator
 * 
 * Evaluates IF conditions against target data.
 * Supports various operators and field types.
 */

import { Condition, ConditionResult, ConditionOperator } from '../types';

export class ConditionEvaluator {
  /**
   * Evaluate a list of conditions against a target object
   */
  async evaluate(
    conditions: Condition[],
    target: any,
    context: Devvit.Context
  ): Promise<ConditionResult[]> {
    const results: ConditionResult[] = [];

    for (const condition of conditions) {
      const result = await this.evaluateSingle(condition, target, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateSingle(
    condition: Condition,
    target: any,
    context: Devvit.Context
  ): Promise<ConditionResult> {
    const { field, operator, value, negate } = condition;

    try {
      // Extract field value from target using dot notation (e.g., "post.title")
      const actualValue = this.getFieldValue(target, field);

      // Handle undefined/null values
      if (actualValue === undefined || actualValue === null) {
        return {
          conditionId: condition.id,
          field,
          operator,
          expectedValue: value,
          actualValue: null,
          matched: negate ? true : false // If negate, undefined matches (not equals)
        };
      }

      let matched = false;

      switch (operator) {
        case ConditionOperator.EQUALS:
          matched = this.equals(actualValue, value);
          break;

        case ConditionOperator.NOT_EQUALS:
          matched = !this.equals(actualValue, value);
          break;

        case ConditionOperator.CONTAINS:
          matched = this.contains(actualValue, value);
          break;

        case ConditionOperator.NOT_CONTAINS:
          matched = !this.contains(actualValue, value);
          break;

        case ConditionOperator.GREATER_THAN:
          matched = this.greaterThan(actualValue, value);
          break;

        case ConditionOperator.LESS_THAN:
          matched = this.lessThan(actualValue, value);
          break;

        case ConditionOperator.GREATER_THAN_OR_EQUAL:
          matched = this.greaterThanOrEqual(actualValue, value);
          break;

        case ConditionOperator.LESS_THAN_OR_EQUAL:
          matched = this.lessThanOrEqual(actualValue, value);
          break;

        case ConditionOperator.MATCHES_REGEX:
          matched = this.matchesRegex(actualValue, value);
          break;

        case ConditionOperator.IN_LIST:
          matched = this.inList(actualValue, value);
          break;

        case ConditionOperator.NOT_IN_LIST:
          matched = !this.inList(actualValue, value);
          break;

        case ConditionOperator.STARTS_WITH:
          matched = this.startsWith(actualValue, value);
          break;

        case ConditionOperator.ENDS_WITH:
          matched = this.endsWith(actualValue, value);
          break;

        default:
          matched = false;
      }

      // Apply negation
      if (negate) {
        matched = !matched;
      }

      return {
        conditionId: condition.id,
        field,
        operator,
        expectedValue: value,
        actualValue,
        matched
      };

    } catch (error) {
      return {
        conditionId: condition.id,
        field,
        operator,
        expectedValue: value,
        actualValue: null,
        matched: false,
        error: error instanceof Error ? error.message : 'Evaluation error'
      };
    }
  }

  /**
   * Get nested field value using dot notation
   */
  private getFieldValue(target: any, field: string): any {
    const parts = field.split('.');
    let value = target;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Compare two values for equality
   */
  private equals(actual: any, expected: any): boolean {
    // Convert to strings for comparison if types differ
    if (typeof actual === 'boolean') {
      return actual === (expected === 'true' || expected === true);
    }
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  }

  /**
   * Check if actual value contains expected value
   */
  private contains(actual: any, expected: any): boolean {
    const actualStr = String(actual).toLowerCase();
    const expectedStr = String(expected).toLowerCase();
    return actualStr.includes(expectedStr);
  }

  /**
   * Check if actual > expected
   */
  private greaterThan(actual: any, expected: any): boolean {
    const actualNum = Number(actual);
    const expectedNum = Number(expected);
    
    if (isNaN(actualNum) || isNaN(expectedNum)) {
      return String(actual).length > String(expected).length;
    }
    
    return actualNum > expectedNum;
  }

  /**
   * Check if actual < expected
   */
  private lessThan(actual: any, expected: any): boolean {
    const actualNum = Number(actual);
    const expectedNum = Number(expected);
    
    if (isNaN(actualNum) || isNaN(expectedNum)) {
      return String(actual).length < String(expected).length;
    }
    
    return actualNum < expectedNum;
  }

  /**
   * Check if actual >= expected
   */
  private greaterThanOrEqual(actual: any, expected: any): boolean {
    return this.greaterThan(actual, expected) || this.equals(actual, expected);
  }

  /**
   * Check if actual <= expected
   */
  private lessThanOrEqual(actual: any, expected: any): boolean {
    return this.lessThan(actual, expected) || this.equals(actual, expected);
  }

  /**
   * Check if actual matches regex pattern
   */
  private matchesRegex(actual: any, expected: any): boolean {
    try {
      const regex = new RegExp(String(expected), 'i');
      return regex.test(String(actual));
    } catch {
      return false;
    }
  }

  /**
   * Check if actual value is in a list
   */
  private inList(actual: any, expected: any): boolean {
    let list: string[];
    
    if (Array.isArray(expected)) {
      list = expected.map(String);
    } else if (typeof expected === 'string') {
      list = expected.split(',').map(s => s.trim().toLowerCase());
    } else {
      list = [String(expected)];
    }
    
    return list.includes(String(actual).toLowerCase());
  }

  /**
   * Check if actual starts with expected
   */
  private startsWith(actual: any, expected: any): boolean {
    return String(actual).toLowerCase().startsWith(String(expected).toLowerCase());
  }

  /**
   * Check if actual ends with expected
   */
  private endsWith(actual: any, expected: any): boolean {
    return String(actual).toLowerCase().endsWith(String(expected).toLowerCase());
  }
}
