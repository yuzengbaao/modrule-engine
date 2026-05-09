/**
 * ModRule Engine - Main Entry Point
 * @ts-nocheck - Devvit JSX requires special build pipeline
 * 
 * Devvit app that provides a visual IF-THEN rule engine
 * for Reddit moderators to automate moderation tasks.
 */

import { Devvit } from '@devvit/public-api';
import { RuleEngine } from './engine/RuleEngine';
import { RuleStorage } from './storage/RuleStorage';
import { TriggerListener } from './engine/TriggerListener';
import { RULE_TEMPLATES, templateToRule } from './templates/RuleTemplates';
import { createVisualRuleBuilderForm, createRuleBuilderForm } from './components';

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
    ui.showForm(await createRuleBuilderForm(context, storage));
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
    const { ui } = context;
    const stats = await engine.getSubredditStats(context);
    
    return (
      <vstack padding="medium" gap="medium">
        <text size="xlarge" weight="bold">ModRule Engine</text>
        <text size="small" color="secondary">Visual IF-THEN rule builder for automated moderation</text>
        
        {/* Stats Overview */}
        <hstack gap="small">
          <vstack>
            <text size="small" color="secondary">Active Rules</text>
            <text size="large" weight="bold">{stats.activeRules || 0}</text>
          </vstack>
          <vstack>
            <text size="small" color="secondary">Executions</text>
            <text size="large" weight="bold">{stats.totalExecutions || 0}</text>
          </vstack>
          <vstack>
            <text size="small" color="secondary">Time Saved</text>
            <text size="large" weight="bold">{stats.timeSavedMinutes || 0}m</text>
          </vstack>
        </hstack>
        
        {/* Quick Actions */}
        <hstack gap="small">
          <button onPress={() => ui.showForm(createVisualRuleBuilderForm(context, engine, storage, 'trigger'))}>
            Create New Rule
          </button>
          <button onPress={() => ui.showForm(createRuleBuilderForm(context, storage))}>
            Manage Rules
          </button>
        </hstack>
        
        {/* Template Gallery */}
        <text size="small" weight="bold">Quick Start Templates</text>
        <hstack gap="small" wrap>
          {RULE_TEMPLATES.slice(0, 4).map(template => (
            <button 
              key={template.id}
              size="small" 
              appearance="secondary"
              onPress={() => ui.showForm(createTemplateForm(context, template))}
            >
              {template.icon} {template.name}
            </button>
          ))}
        </hstack>
        
        <button appearance="secondary" onPress={() => ui.showForm(createAnalyticsForm(context))}>
          View Full Analytics
        </button>
      </vstack>
    );
  }
});

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
        
        <hstack gap="small">
          <button appearance="secondary" onPress={() => context.ui.showForm(createRuleBuilderForm(context, storage))}>
            ← Back to Rules
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

// Form: Template Selection
function createTemplateForm(context: Devvit.Context, template: any) {
  const { ui } = context;

  return (
    <form onSubmit={async (data) => {
      const subreddit = context.reddit.getCurrentSubredditName();
      const rule = templateToRule(template, context.userId || 'unknown');
      rule.name = data.name || rule.name;
      await storage.saveRule(subreddit, rule);
      ui.showToast('Template rule created! Enable it when ready.');
      ui.showForm(await createRuleBuilderForm(context, storage));
    }}>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Create from Template</text>
        
        <hstack gap="small">
          <text size="xlarge">{template.icon}</text>
          <vstack>
            <text weight="bold">{template.name}</text>
            <text size="small" color="secondary">{template.description}</text>
          </vstack>
        </hstack>
        
        <text>Rule Name (customize)</text>
        <textField name="name" placeholder={template.name} />
        
        <text size="small" color="secondary">
          This will create the rule in test mode. Review and enable when ready.
        </text>
        
        <hstack gap="small">
          <button appearance="secondary" onPress={() => ui.showForm(createRuleBuilderForm(context, storage))}>
            Cancel
          </button>
          <button appearance="primary" type="submit">Create Rule</button>
        </hstack>
      </vstack>
    </form>
  );
}

// Form: Test Rule
function createTestRuleForm(context: Devvit.Context, ruleData: any) {
  const { ui } = context;

  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Test Rule</text>
        
        <text>Enter test data to simulate rule execution:</text>
        
        <text>Post Title</text>
        <textField name="testTitle" placeholder="e.g., Spam post" />
        
        <text>User Karma</text>
        <textField name="testKarma" placeholder="e.g., 5" />
        
        <button onPress={async () => {
          ui.showToast('Test running... (simulation mode)');
        }}>
          Run Test
        </button>
        
        <text size="small" color="secondary">
          Test mode evaluates conditions without executing actions.
        </text>
        
        <button appearance="secondary" onPress={() => ui.showForm(createRuleBuilderForm(context, storage))}>
          ← Back
        </button>
      </vstack>
    </form>
  );
}
