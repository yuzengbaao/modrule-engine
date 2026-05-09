/**
 * ModRule Engine - Trigger Listener
 * 
 * Listens to Reddit events and forwards them to the rule engine
 * for evaluation.
 */

import { TriggerType } from '../types';
import { RuleEngine } from './RuleEngine';

export class TriggerListener {
  private engine: RuleEngine;

  constructor(engine: RuleEngine) {
    this.engine = engine;
  }

  /**
   * Handle post creation event
   */
  async handlePostCreated(event: any, context: Devvit.Context): Promise<void> {
    const post = event.post;
    if (!post) return;

    const target = {
      id: post.id,
      title: post.title,
      body: post.body,
      url: post.url,
      flair: post.flair?.text,
      karma: post.score,
      commentCount: post.numberOfComments,
      isOC: post.isOC,
      isSpoiler: post.isSpoiler,
      isNSFW: post.isNSFW,
      author: post.authorName,
      subreddit: post.subredditName,
      createdAt: post.createdAt
    };

    await this.engine.evaluateRules(TriggerType.POST_CREATED, target, context);
  }

  /**
   * Handle comment creation event
   */
  async handleCommentCreated(event: any, context: Devvit.Context): Promise<void> {
    const comment = event.comment;
    if (!comment) return;

    const target = {
      id: comment.id,
      body: comment.body,
      karma: comment.score,
      author: comment.authorName,
      postId: comment.postId,
      parentId: comment.parentId,
      subreddit: comment.subredditName,
      createdAt: comment.createdAt
    };

    await this.engine.evaluateRules(TriggerType.COMMENT_CREATED, target, context);
  }

  /**
   * Handle user joining subreddit
   */
  async handleUserJoined(event: any, context: Devvit.Context): Promise<void> {
    const user = event.user;
    if (!user) return;

    const target = {
      id: user.id,
      name: user.username,
      karma: user.linkKarma + user.commentKarma,
      accountAgeDays: Math.floor((Date.now() - user.createdAt * 1000) / (1000 * 60 * 60 * 24)),
      flair: user.flair?.text,
      isMod: user.isModerator,
      isAdmin: user.isAdmin,
      subreddit: context.reddit.getCurrentSubredditName()
    };

    await this.engine.evaluateRules(TriggerType.USER_JOINED, target, context);
  }

  /**
   * Handle post report event
   */
  async handlePostReported(event: any, context: Devvit.Context): Promise<void> {
    const report = event.report;
    const post = event.post;
    if (!report || !post) return;

    const target = {
      id: post.id,
      title: post.title,
      body: post.body,
      author: post.authorName,
      reportReason: report.reason,
      reportCount: post.reportCount,
      subreddit: post.subredditName
    };

    await this.engine.evaluateRules(TriggerType.REPORT_SUBMITTED, target, context);
  }

  /**
   * Handle comment report event
   */
  async handleCommentReported(event: any, context: Devvit.Context): Promise<void> {
    const report = event.report;
    const comment = event.comment;
    if (!report || !comment) return;

    const target = {
      id: comment.id,
      body: comment.body,
      author: comment.authorName,
      reportReason: report.reason,
      reportCount: comment.reportCount,
      postId: comment.postId,
      subreddit: comment.subredditName
    };

    await this.engine.evaluateRules(TriggerType.REPORT_SUBMITTED, target, context);
  }

  /**
   * Handle modmail received
   */
  async handleModmailReceived(event: any, context: Devvit.Context): Promise<void> {
    const modmail = event.modmail;
    if (!modmail) return;

    const target = {
      id: modmail.id,
      subject: modmail.subject,
      body: modmail.body,
      author: modmail.authorName,
      isNew: modmail.isNew,
      subreddit: modmail.subredditName
    };

    await this.engine.evaluateRules(TriggerType.MODMAIL_RECEIVED, target, context);
  }
}
