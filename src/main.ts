/**
 * ModRule Engine - Main Entry Point
 * 
 * Devvit app that provides a visual IF-THEN rule engine
 * for Reddit moderators to automate moderation tasks.
 */

import { Devvit } from '@devvit/public-api';
import { RuleEngine } from './engine/RuleEngine';
import { RuleStorage } from './storage/RuleStorage';
import { TriggerListener } from './engine/TriggerListener';

// Initialize storage
const storage = new RuleStorage();
const engine = new RuleEngine(storage);
const listener = new TriggerListener(engine);

// Devvit app configuration
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true
});

// Menu item for Rule Builder (visible to moderators)
Devvit.addMenuItem({
  location: 'subreddit',
  forUserType: 'moderator',
  label: 'ModRule Engine - Rule Builder',
  onPress: async (event, context) => {
    const { ui } = context;
    ui.showForm(await createRuleBuilderForm(context));
  }
});

// Menu item for Analytics Dashboard
Devvit.addMenuItem({
  location: 'subreddit',
  forUserType: 'moderator',
  label: 'ModRule Engine - Analytics',
  onPress: async (event, context) => {
    const { ui } = context;
    ui.showForm(await createAnalyticsForm(context));
  }
});

// Trigger: Post Created
Devvit.addTrigger({
  event: 'PostCreate',
  onEvent: async (event, context) => {
    await listener.handlePostCreated(event, context);
  }
});

// Trigger: Comment Created
Devvit.addTrigger({
  event: 'CommentCreate',
  onEvent: async (event, context) => {
    await listener.handleCommentCreated(event, context);
  }
});

// Trigger: Post Reported
Devvit.addTrigger({
  event: 'PostReport',
  onEvent: async (event, context) => {
    await listener.handlePostReported(event, context);
  }
});

// Trigger: Comment Reported
Devvit.addTrigger({
  event: 'CommentReport',
  onEvent: async (event, context) => {
    await listener.handleCommentReported(event, context);
  }
});

// Trigger: User Joined Subreddit
Devvit.addTrigger({
  event: 'SubscriberAdd',
  onEvent: async (event, context) => {
    await listener.handleUserJoined(event, context);
  }
});

// Trigger: Modmail Received
Devvit.addTrigger({
  event: 'ModMail',
  onEvent: async (event, context) => {
    await listener.handleModmailReceived(event, context);
  }
});

// Scheduler: Analytics aggregation (runs every hour)
Devvit.addScheduler({
  name: 'analytics-aggregation',
  interval: 'hourly',
  onRun: async (context) => {
    await engine.aggregateAnalytics(context);
  }
});

// Custom Post Component: Rule Builder UI
Devvit.addCustomPostType({
  name: 'Rule Builder',
  height: 'tall',
  render: async (context) => {
    const { ui, postId } = context;
    
    return (
      <vstack padding="medium" gap="medium">
        <text size="xlarge" weight="bold">ModRule Engine</text>
        <text size="small" color="secondary">Visual IF-THEN rule builder for automated moderation</text>
        
        <hstack gap="small">
          <button onPress={() => ui.showForm(createNewRuleForm(context))}>
            Create New Rule
          </button>
          <button onPress={() => ui.showForm(createRuleListForm(context))}>
            Manage Rules
          </button>
        </hstack>
        
        <button appearance="secondary" onPress={() => ui.showForm(createAnalyticsForm(context))}>
          View Analytics
        </button>
      </vstack>
    );
  }
});

// Form: Rule Builder
async function createRuleBuilderForm(context: Devvit.Context) {
  const rules = await storage.getAllRules(context.reddit.getCurrentSubredditName());
  
  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Rule Builder</text>
        
        {rules.length === 0 ? (
          <text color="secondary">No rules yet. Create your first moderation rule!</text>
        ) : (
          rules.map(rule => (
            <hstack key={rule.id} gap="small" alignment="center middle">
              <text>{rule.name}</text>
              <spacer />
              <text size="small" color={rule.enabled ? 'success' : 'neutral'}>
                {rule.enabled ? 'Active' : 'Inactive'}
              </text>
              <button size="small" onPress={() => ui.showForm(createEditRuleForm(context, rule.id))}>
                Edit
              </button>
              <button size="small" appearance="destructive" onPress={() => deleteRule(context, rule.id)}>
                Delete
              </button>
            </hstack>
          ))
        )}
        
        <button onPress={() => ui.showForm(createNewRuleForm(context))}>
          + Create New Rule
        </button>
      </vstack>
    </form>
  );
}

// Form: New Rule
function createNewRuleForm(context: Devvit.Context) {
  return (
    <form onSubmit={async (data) => {
      const rule = await engine.createRule(context, data);
      await storage.saveRule(context.reddit.getCurrentSubredditName(), rule);
      context.ui.showToast('Rule created successfully!');
    }}>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Create New Rule</text>
        
        <text>Name</text>
        <textField name="name" placeholder="e.g., Spam Detection" required />
        
        <text>Description</text>
        <textArea name="description" placeholder="What does this rule do?" />
        
        <text>Trigger</text>
        <select name="trigger" required>
          <option value="post_created">Post Created</option>
          <option value="comment_created">Comment Created</option>
          <option value="user_joined">User Joined</option>
          <option value="report_submitted">Report Submitted</option>
          <option value="post_edited">Post Edited</option>
          <option value="comment_edited">Comment Edited</option>
          <option value="modmail_received">Modmail Received</option>
        </select>
        
        <text>Conditions (IF)</text>
        <textArea 
          name="conditions" 
          placeholder="e.g., post.title contains 'spam' AND user.karma < 10"
        />
        
        <text>Actions (THEN)</text>
        <textArea 
          name="actions" 
          placeholder="e.g., remove_post, send_modmail('Your post was removed')"
        />
        
        <hstack gap="small">
          <button onPress={() => context.ui.showForm(createTestRuleForm(context, data))}>
            Test Rule
          </button>
          <button appearance="primary" type="submit">
            Save Rule
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

// Form: Analytics Dashboard
async function createAnalyticsForm(context: Devvit.Context) {
  const stats = await engine.getSubredditStats(context);
  
  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">ModRule Analytics</text>
        
        <hstack gap="large">
          <vstack>
            <text size="small" color="secondary">Total Rules</text>
            <text size="xlarge" weight="bold">{stats.totalRules}</text>
          </vstack>
          <vstack>
            <text size="small" color="secondary">Active Rules</text>
            <text size="xlarge" weight="bold">{stats.activeRules}</text>
          </vstack>
          <vstack>
            <text size="small" color="secondary">Total Executions</text>
            <text size="xlarge" weight="bold">{stats.totalExecutions}</text>
          </vstack>
        </hstack>
        
        <text size="small" color="secondary">Time Saved: {stats.timeSavedMinutes} minutes</text>
        
        <button onPress={() => context.ui.navigateTo('https://modrule.dev/analytics')}>
          Detailed Analytics
        </button>
      </vstack>
    </form>
  );
}

// Helper: Delete rule
async function deleteRule(context: Devvit.Context, ruleId: string) {
  const subreddit = context.reddit.getCurrentSubredditName();
  await storage.deleteRule(subreddit, ruleId);
  context.ui.showToast('Rule deleted');
}

// Export for testing
export { engine, storage, listener };