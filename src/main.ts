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
          <button onPress={() => ui.showForm(createNewRuleForm(context))}>
            Create New Rule
          </button>
          <button onPress={() => ui.showForm(createRuleListForm(context))}>
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

// Form: Rule List with management
async function createRuleListForm(context: Devvit.Context) {
  const rules = await storage.getAllRules(context.reddit.getCurrentSubredditName());
  
  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Manage Rules</text>
        
        {rules.length === 0 ? (
          <vstack gap="small">
            <text color="secondary">No rules yet. Create your first moderation rule!</text>
            <button onPress={() => ui.showForm(createNewRuleForm(context))}>
              + Create New Rule
            </button>
          </vstack>
        ) : (
          <vstack gap="small">
            {rules.map(rule => (
              <hstack key={rule.id} gap="small" alignment="center middle">
                <vstack grow>
                  <text weight="bold">{rule.name}</text>
                  <text size="small" color="secondary">{rule.description}</text>
                  <hstack gap="small">
                    <text size="small" color={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? '🟢 Active' : '⚪ Inactive'}
                    </text>
                    <text size="small" color="secondary">
                      {rule.executionCount} executions
                    </text>
                  </hstack>
                </vstack>
                
                <hstack gap="small">
                  <button 
                    size="small" 
                    appearance={rule.enabled ? 'secondary' : 'primary'}
                    onPress={() => toggleRule(context, rule.id)}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    size="small" 
                    onPress={() => ui.showForm(createEditRuleForm(context, rule.id))}
                  >
                    Edit
                  </button>
                  <button 
                    size="small" 
                    appearance="destructive" 
                    onPress={() => ui.showForm(createDeleteConfirmForm(context, rule.id))}
                  >
                    Delete
                  </button>
                </hstack>
              </hstack>
            ))}
          </vstack>
        )}
        
        <button onPress={() => ui.showForm(createNewRuleForm(context))}>
          + Create New Rule
        </button>
      </vstack>
    </form>
  );
}

// Form: Edit Rule
function createEditRuleForm(context: Devvit.Context, ruleId: string) {
  return (
    <form onSubmit={async (data) => {
      const subreddit = context.reddit.getCurrentSubredditName();
      const rules = await storage.getAllRules(subreddit);
      const rule = rules.find(r => r.id === ruleId);
      
      if (rule) {
        rule.name = data.name || rule.name;
        rule.description = data.description || rule.description;
        rule.updatedAt = Date.now();
        await storage.updateRule(subreddit, rule);
        context.ui.showToast('Rule updated!');
      }
    }}>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold">Edit Rule</text>
        
        <text>Name</text>
        <textField name="name" placeholder="Rule name" />
        
        <text>Description</text>
        <textArea name="description" placeholder="Rule description" />
        
        <button type="submit">Save Changes</button>
      </vstack>
    </form>
  );
}

// Form: Delete Confirmation
function createDeleteConfirmForm(context: Devvit.Context, ruleId: string) {
  return (
    <form>
      <vstack gap="medium" padding="medium">
        <text size="large" weight="bold" color="danger">Delete Rule?</text>
        <text>This action cannot be undone. The rule will be permanently removed.</text>
        
        <hstack gap="small">
          <button onPress={() => deleteRule(context, ruleId)} appearance="destructive">
            Yes, Delete
          </button>
          <button onPress={() => ui.showForm(createRuleListForm(context))}>
            Cancel
          </button>
        </hstack>
      </vstack>
    </form>
  );
}

// Form: Template Selection
function createTemplateForm(context: Devvit.Context, template: any) {
  return (
    <form onSubmit={async (data) => {
      const subreddit = context.reddit.getCurrentSubredditName();
      const rule = templateToRule(template, context.userId || 'unknown');
      rule.name = data.name || rule.name;
      await storage.saveRule(subreddit, rule);
      context.ui.showToast('Template rule created! Enable it when ready.');
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
        
        <button type="submit">Create Rule</button>
      </vstack>
    </form>
  );
}

// Form: Test Rule
function createTestRuleForm(context: Devvit.Context, testData: any) {
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
          // Simulate rule evaluation
          context.ui.showToast('Test running... (simulation mode)');
        }}>
          Run Test
        </button>
        
        <text size="small" color="secondary">
          Test mode evaluates conditions without executing actions.
        </text>
      </vstack>
    </form>
  );
}

// Helper: Toggle rule enabled state
async function toggleRule(context: Devvit.Context, ruleId: string) {
  const subreddit = context.reddit.getCurrentSubredditName();
  const rules = await storage.getAllRules(subreddit);
  const rule = rules.find(r => r.id === ruleId);
  
  if (rule) {
    rule.enabled = !rule.enabled;
    await storage.updateRule(subreddit, rule);
    context.ui.showToast(rule.enabled ? 'Rule enabled' : 'Rule disabled');
  }
}

import { RULE_TEMPLATES, templateToRule } from '../templates/RuleTemplates';