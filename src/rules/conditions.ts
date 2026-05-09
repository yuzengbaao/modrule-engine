import type { Condition, EvaluationContext, PostData, CommentData } from '../types/index.js';

/**
 * Evaluate a single condition against the provided context.
 */
export function evaluateCondition(condition: Condition, ctx: EvaluationContext): boolean {
  const value = extractFieldValue(condition.field, ctx);
  const expected = condition.value;

  let result: boolean;
  switch (condition.operator) {
    case 'equals':
      result = String(value).toLowerCase() === String(expected).toLowerCase();
      break;
    case 'not_equals':
      result = String(value).toLowerCase() !== String(expected).toLowerCase();
      break;
    case 'contains':
      result = String(value).toLowerCase().includes(String(expected).toLowerCase());
      break;
    case 'not_contains':
      result = !String(value).toLowerCase().includes(String(expected).toLowerCase());
      break;
    case 'greater_than':
      result = Number(value) > Number(expected);
      break;
    case 'less_than':
      result = Number(value) < Number(expected);
      break;
    case 'regex_match': {
      const re = new RegExp(String(expected), condition.caseSensitive ? '' : 'i');
      result = re.test(String(value));
      break;
    }
    case 'regex_not_match': {
      const re2 = new RegExp(String(expected), condition.caseSensitive ? '' : 'i');
      result = !re2.test(String(value));
      break;
    }
    case 'starts_with':
      result = String(value).toLowerCase().startsWith(String(expected).toLowerCase());
      break;
    case 'ends_with':
      result = String(value).toLowerCase().endsWith(String(expected).toLowerCase());
      break;
    case 'in_list':
      result = Array.isArray(expected) && expected.map(String).includes(String(value));
      break;
    case 'not_in_list':
      result = Array.isArray(expected) && !expected.map(String).includes(String(value));
      break;
    case 'has_flair':
      result = !!value;
      break;
    case 'no_flair':
      result = !value;
      break;
    case 'is_removed':
      result = value === true;
      break;
    case 'is_not_removed':
      result = value === false;
      break;
    case 'is_locked':
      result = value === true;
      break;
    case 'is_not_locked':
      result = value === false;
      break;
    case 'is_nsfw':
      result = value === true;
      break;
    case 'is_not_nsfw':
      result = value === false;
      break;
    case 'is_spoiler':
      result = value === true;
      break;
    case 'is_not_spoiler':
      result = value === false;
      break;
    case 'user_karma_gt':
      result = Number(value) > Number(expected);
      break;
    case 'user_karma_lt':
      result = Number(value) < Number(expected);
      break;
    case 'user_age_gt':
      result = Number(value) > Number(expected);
      break;
    case 'user_age_lt':
      result = Number(value) < Number(expected);
      break;
    case 'user_in_list':
      result = Array.isArray(expected) && expected.map(String).includes(String(value));
      break;
    case 'user_not_in_list':
      result = Array.isArray(expected) && !expected.map(String).includes(String(value));
      break;
    default:
      result = false;
  }

  return condition.negate ? !result : result;
}

function extractFieldValue(field: string, ctx: EvaluationContext): unknown {
  const post = ctx.post as Record<string, unknown> | undefined;
  const comment = ctx.comment as Record<string, unknown> | undefined;
  const author = ctx.author as Record<string, unknown> | undefined;

  // Post/comment fields
  if (post && field in post) return post[field];
  if (comment && field in comment) return comment[field];

  // Author fields
  if (author && field in author) return author[field];

  // Computed / alias fields
  if (field === 'author' && post) return post.author;
  if (field === 'author' && comment) return comment.author;
  if (field === 'body' && post) return post.body ?? post.title;
  if (field === 'body' && comment) return comment.body;
  if (field === 'karma' && post) return post.karma;
  if (field === 'karma' && comment) return comment.karma;

  return undefined;
}
