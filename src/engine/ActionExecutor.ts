/**
 * ModRule Engine - Action Executor
 * 
 * Executes moderation actions based on rule configurations.
 * Interfaces with Reddit's moderation API through Devvit.
 */

import { Action, ActionResult, ActionType, ActionConfig } from '../types';

export class ActionExecutor {
  /**
   * Execute a list of actions against a target
   */
  async execute(
    actions: Action[],
    target: any,
    context: Devvit.Context
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      // Handle delay if specified
      if (action.delay && action.delay > 0) {
        await this.sleep(action.delay * 1000);
      }

      const result = await this.executeSingle(action, target, context);
      results.push(result);

      // If a critical action fails, stop executing further actions
      if (!result.success && this.isCriticalAction(action.type)) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeSingle(
    action: Action,
    target: any,
    context: Devvit.Context
  ): Promise<ActionResult> {
    const { type, config } = action;

    try {
      let result: string | undefined;

      switch (type) {
        case ActionType.REMOVE_POST:
          result = await this.removePost(target, config, context);
          break;

        case ActionType.REMOVE_COMMENT:
          result = await this.removeComment(target, config, context);
          break;

        case ActionType.BAN_USER:
          result = await this.banUser(target, config, context);
          break;

        case ActionType.MUTE_USER:
          result = await this.muteUser(target, config, context);
          break;

        case ActionType.SEND_MODMAIL:
          result = await this.sendModmail(target, config, context);
          break;

        case ActionType.FLAIR_POST:
          result = await this.flairPost(target, config, context);
          break;

        case ActionType.LOCK_THREAD:
          result = await this.lockThread(target, config, context);
          break;

        case ActionType.APPROVE_POST:
          result = await this.approvePost(target, config, context);
          break;

        case ActionType.APPROVE_COMMENT:
          result = await this.approveComment(target, config, context);
          break;

        case ActionType.ADD_TO_QUEUE:
          result = await this.addToQueue(target, config, context);
          break;

        case ActionType.ADD_NOTE:
          result = await this.addNote(target, config, context);
          break;

        case ActionType.SEND_WEBHOOK:
          result = await this.sendWebhook(target, config, context);
          break;

        default:
          return {
            actionId: action.id,
            actionType: type,
            success: false,
            error: `Unknown action type: ${type}`
          };
      }

      return {
        actionId: action.id,
        actionType: type,
        success: true,
        result
      };

    } catch (error) {
      return {
        actionId: action.id,
        actionType: type,
        success: false,
        error: error instanceof Error ? error.message : 'Action execution failed'
      };
    }
  }

  /**
   * Remove a post
   */
  private async removePost(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const postId = target.id || target.postId;

    if (!postId) {
      throw new Error('No post ID found in target');
    }

    await reddit.remove(postId, config.spam || false);

    if (config.reason) {
      await reddit.addRemovalReason(postId, config.reason);
    }

    return `Post ${postId} removed`;
  }

  /**
   * Remove a comment
   */
  private async removeComment(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const commentId = target.id || target.commentId;

    if (!commentId) {
      throw new Error('No comment ID found in target');
    }

    await reddit.remove(commentId, config.spam || false);
    return `Comment ${commentId} removed`;
  }

  /**
   * Ban a user
   */
  private async banUser(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const username = target.author || target.userName || target.name;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (!username) {
      throw new Error('No username found in target');
    }

    const duration = config.duration || 999; // Permanent by default
    const reason = config.reason || 'Automated ban by ModRule Engine';

    await reddit.banUser({
      username,
      subredditName: subreddit,
      duration,
      reason,
      note: config.note
    });

    return `User ${username} banned for ${duration} days`;
  }

  /**
   * Mute a user
   */
  private async muteUser(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const username = target.author || target.userName || target.name;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (!username) {
      throw new Error('No username found in target');
    }

    const duration = config.duration || 3; // 3 days by default

    await reddit.muteUser({
      username,
      subredditName: subreddit,
      duration
    });

    return `User ${username} muted for ${duration} days`;
  }

  /**
   * Send modmail to user
   */
  private async sendModmail(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const username = target.author || target.userName || target.name;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (!username) {
      throw new Error('No username found in target');
    }

    const subject = config.modmailSubject || 'Moderation Notification';
    const body = config.modmailBody || config.message || 'Your content was moderated by an automated rule.';

    await reddit.sendPrivateMessage({
      to: username,
      subject,
      text: body,
      subredditName: subreddit
    });

    return `Modmail sent to ${username}`;
  }

  /**
   * Apply flair to post
   */
  private async flairPost(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const postId = target.id || target.postId;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (!postId) {
      throw new Error('No post ID found in target');
    }

    if (!config.flairText) {
      throw new Error('No flair text specified');
    }

    await reddit.setFlair({
      postId,
      subredditName: subreddit,
      text: config.flairText,
      cssClass: config.flairCSSClass
    });

    return `Flair "${config.flairText}" applied to post ${postId}`;
  }

  /**
   * Lock a thread
   */
  private async lockThread(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const postId = target.id || target.postId || target.commentId;

    if (!postId) {
      throw new Error('No post/comment ID found in target');
    }

    await reddit.lock(postId);
    return `Thread ${postId} locked`;
  }

  /**
   * Approve a post
   */
  private async approvePost(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const postId = target.id || target.postId;

    if (!postId) {
      throw new Error('No post ID found in target');
    }

    await reddit.approve(postId);
    return `Post ${postId} approved`;
  }

  /**
   * Approve a comment
   */
  private async approveComment(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const commentId = target.id || target.commentId;

    if (!commentId) {
      throw new Error('No comment ID found in target');
    }

    await reddit.approve(commentId);
    return `Comment ${commentId} approved`;
  }

  /**
   * Add to moderation queue
   */
  private async addToQueue(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    // In Devvit, adding to queue is implicit when content is reported
    // or can be done by sending a modmail to the subreddit
    const { reddit } = context;
    const postId = target.id || target.postId || target.commentId;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (postId) {
      // Send modmail to mods about this item
      await reddit.sendPrivateMessage({
        to: `/r/${subreddit}`,
        subject: 'Item added to mod queue',
        text: `Item ${postId} requires moderator review.\n\nReason: ${config.reason || 'Added by ModRule Engine'}`
      });
    }

    return `Added to moderation queue`;
  }

  /**
   * Add moderator note
   */
  private async addNote(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    const { reddit } = context;
    const postId = target.id || target.postId || target.commentId;
    const subreddit = target.subreddit || context.reddit.getCurrentSubredditName();

    if (!postId) {
      throw new Error('No target ID found');
    }

    const note = config.note || 'Note added by ModRule Engine';

    // Use wiki or send modmail as note mechanism
    await reddit.sendPrivateMessage({
      to: `/r/${subreddit}`,
      subject: `Mod Note: ${postId}`,
      text: note
    });

    return `Note added to ${postId}`;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    target: any,
    config: ActionConfig,
    context: Devvit.Context
  ): Promise<string> {
    if (!config.webhookUrl) {
      throw new Error('No webhook URL specified');
    }

    const payload = {
      target,
      action: 'modrule_triggered',
      timestamp: Date.now(),
      subreddit: target.subreddit || context.reddit.getCurrentSubredditName()
    };

    // Use Devvit's HTTP capability
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return `Webhook sent to ${config.webhookUrl}`;
  }

  /**
   * Check if an action is critical (should stop execution on failure)
   */
  private isCriticalAction(type: ActionType): boolean {
    return [
      ActionType.BAN_USER,
      ActionType.SHADOWBAN,
      ActionType.REMOVE_POST,
      ActionType.REMOVE_COMMENT
    ].includes(type);
  }

  /**
   * Sleep helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
