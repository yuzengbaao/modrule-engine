import type { Context } from '@devvit/public-api';
import type { Action, EvaluationContext, PostData, CommentData } from '../types/index.js';

/**
 * Execute a moderation action via the Reddit API.
 */
export async function executeAction(
  action: Action,
  ctx: EvaluationContext,
  context: Context
): Promise<void> {
  const reddit = context.reddit;
  const post = ctx.post;
  const comment = ctx.comment;

  switch (action.type) {
    case 'remove': {
      const target = post ?? comment;
      if (!target) throw new Error('No target for remove action');
      if (post) await reddit.removePost(target.id);
      else await reddit.removeComment(target.id);
      break;
    }

    case 'approve': {
      const target = post ?? comment;
      if (!target) throw new Error('No target for approve action');
      if (post) await reddit.approvePost(target.id);
      else await reddit.approveComment(target.id);
      break;
    }

    case 'lock': {
      const target = post ?? comment;
      if (!target) throw new Error('No target for lock action');
      if (post) await reddit.lockPost(target.id);
      else await reddit.lockComment(target.id);
      break;
    }

    case 'unlock': {
      const target = post ?? comment;
      if (!target) throw new Error('No target for unlock action');
      if (post) await reddit.unlockPost(target.id);
      else await reddit.unlockComment(target.id);
      break;
    }

    case 'mark_nsfw': {
      if (!post) throw new Error('mark_nsfw requires a post');
      await reddit.markPostAsNsfw(post.id);
      break;
    }

    case 'unmark_nsfw': {
      if (!post) throw new Error('unmark_nsfw requires a post');
      await reddit.unmarkPostAsNsfw(post.id);
      break;
    }

    case 'spoiler': {
      if (!post) throw new Error('spoiler requires a post');
      await reddit.markPostAsSpoiler(post.id);
      break;
    }

    case 'unspoiler': {
      if (!post) throw new Error('unspoiler requires a post');
      await reddit.unmarkPostAsSpoiler(post.id);
      break;
    }

    case 'set_flair': {
      const target = post ?? comment;
      if (!target) throw new Error('No target for set_flair');
      const flairId = action.config.flairId as string;
      if (post) await reddit.setPostFlair({ postId: target.id, flairId });
      break;
    }

    case 'remove_flair': {
      if (!post) throw new Error('remove_flair requires a post');
      await reddit.removePostFlair(post.id);
      break;
    }

    case 'add_comment': {
      const parentId = post?.id ?? comment?.id;
      if (!parentId) throw new Error('No target for add_comment');
      const text = action.config.text as string;
      await reddit.submitComment({ id: parentId, text });
      break;
    }

    case 'send_modmail': {
      const subject = action.config.subject as string;
      const body = action.config.body as string;
      const recipients = action.config.recipients as string[] | undefined;
      await reddit.sendPrivateMessage({
        to: recipients?.join(',') ?? 'mods',
        subject,
        text: body,
      });
      break;
    }

    case 'ban_user': {
      const username = (post?.author ?? comment?.author)!;
      const duration = action.config.duration as number | undefined;
      const reason = action.config.reason as string | undefined;
      await reddit.banUser({
        username,
        subredditName: (await reddit.getCurrentSubreddit()).name,
        duration: duration ? String(duration) : undefined,
        reason,
      });
      break;
    }

    case 'mute_user': {
      const username = (post?.author ?? comment?.author)!;
      await reddit.muteUser({
        username,
        subredditName: (await reddit.getCurrentSubreddit()).name,
      });
      break;
    }

    case 'alert_mods': {
      const ruleName = action.config.ruleName as string;
      const targetUrl = action.config.targetUrl as string;
      await reddit.sendPrivateMessage({
        to: 'mods',
        subject: `ModRule Alert: ${ruleName}`,
        text: `Rule "${ruleName}" matched on ${targetUrl}`,
      });
      break;
    }

    case 'log_only':
      // No-op; logging is handled by the engine
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
