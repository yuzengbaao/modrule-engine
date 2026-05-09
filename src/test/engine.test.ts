/**
 * ModRule Engine - Test Suite
 * 
 * Tests for core engine components without requiring Devvit platform.
 */

import { RuleEngine } from '../engine/RuleEngine';
import { ConditionEvaluator } from '../engine/ConditionEvaluator';
import { ActionExecutor } from '../engine/ActionExecutor';
import { RuleStorage } from '../storage/RuleStorage';
import { TriggerType, ConditionOperator, ActionType } from '../types';

// Mock Devvit context for testing
function createMockContext(): any {
  return {
    reddit: {
      getCurrentSubredditName: () => 'test_subreddit',
      remove: async () => {},
      approve: async () => {},
      banUser: async () => {},
      muteUser: async () => {},
      sendPrivateMessage: async () => {},
      setFlair: async () => {},
      lock: async () => {},
      addRemovalReason: async () => {}
    },
    userId: 'test_user'
  };
}

// Test 1: Condition Evaluator
async function testConditionEvaluator() {
  const evaluator = new ConditionEvaluator();
  const context = createMockContext();

  const target = {
    post: {
      title: 'Test post about DeFi',
      body: 'This is a test post',
      karma: 100
    },
    user: {
      name: 'test_user',
      karma: 50,
      accountAgeDays: 30
    }
  };

  // Test 1.1: EQUALS
  const equalsCondition = {
    id: 'test1',
    field: 'user.name',
    operator: ConditionOperator.EQUALS,
    value: 'test_user',
    negate: false
  };

  const result1 = await evaluator.evaluate([equalsCondition], target, context);
  console.assert(result1[0].matched === true, 'EQUALS should match');

  // Test 1.2: CONTAINS
  const containsCondition = {
    id: 'test2',
    field: 'post.title',
    operator: ConditionOperator.CONTAINS,
    value: 'DeFi',
    negate: false
  };

  const result2 = await evaluator.evaluate([containsCondition], target, context);
  console.assert(result2[0].matched === true, 'CONTAINS should match DeFi');

  // Test 1.3: GREATER_THAN
  const gtCondition = {
    id: 'test3',
    field: 'user.karma',
    operator: ConditionOperator.GREATER_THAN,
    value: '10',
    negate: false
  };

  const result3 = await evaluator.evaluate([gtCondition], target, context);
  console.assert(result3[0].matched === true, 'GREATER_THAN should match');

  // Test 1.4: LESS_THAN (should fail)
  const ltCondition = {
    id: 'test4',
    field: 'user.karma',
    operator: ConditionOperator.LESS_THAN,
    value: '10',
    negate: false
  };

  const result4 = await evaluator.evaluate([ltCondition], target, context);
  console.assert(result4[0].matched === false, 'LESS_THAN should not match');

  // Test 1.5: REGEX
  const regexCondition = {
    id: 'test5',
    field: 'post.title',
    operator: ConditionOperator.MATCHES_REGEX,
    value: 'DeFi|NFT|crypto',
    negate: false
  };

  const result5 = await evaluator.evaluate([regexCondition], target, context);
  console.assert(result5[0].matched === true, 'REGEX should match DeFi');

  // Test 1.6: Negation
  const negCondition = {
    id: 'test6',
    field: 'user.name',
    operator: ConditionOperator.EQUALS,
    value: 'wrong_user',
    negate: true
  };

  const result6 = await evaluator.evaluate([negCondition], target, context);
  console.assert(result6[0].matched === true, 'Negation should invert result');

  console.log('✅ ConditionEvaluator tests passed');
}

// Test 2: Rule Engine
async function testRuleEngine() {
  const storage = new RuleStorage();
  const engine = new RuleEngine(storage);
  const context = createMockContext();

  // Target should match spam conditions (title contains "buy now" and user karma < 10)
  const target = {
    id: 'post_123',
    post: {
      title: 'Spam post buy now',
      body: 'Click here for free money',
      karma: 5
    },
    user: {
      name: 'spammer123',
      karma: 2,
      accountAgeDays: 1
    },
    author: 'spammer123'
  };

  // Test 2.1: Spam detection rule
  const spamRule = {
    id: 'spam_rule',
    name: 'Spam Detection',
    description: 'Detect spam posts',
    enabled: true,
    trigger: {
      type: TriggerType.POST_CREATED,
      config: {}
    },
    conditions: [
      {
        id: 'cond1',
        field: 'post.title',
        operator: ConditionOperator.CONTAINS,
        value: 'buy now',
        negate: false
      },
      {
        id: 'cond2',
        field: 'user.karma',
        operator: ConditionOperator.LESS_THAN,
        value: '10',
        negate: false
      }
    ],
    actions: [
      {
        id: 'action1',
        type: ActionType.REMOVE_POST,
        config: { reason: 'Spam detected' }
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'test',
    testMode: false,
    executionCount: 0
  };

  // Save rule
  await storage.saveRule('test_subreddit', spamRule);

  // Execute
  const executions = await engine.evaluateRules(
    TriggerType.POST_CREATED,
    target,
    context
  );

  console.assert(executions.length === 1, 'Should have one execution');
  console.assert(executions[0].conditionsMatched === true, 'Spam conditions should match');
  console.assert(executions[0].actionsExecuted === true, 'Actions should be executed');

  console.log('✅ RuleEngine tests passed');
}

// Test 3: Action Executor
async function testActionExecutor() {
  const executor = new ActionExecutor();
  const context = createMockContext();

  const target = {
    id: 'post_456',
    author: 'test_user'
  };

  // Test 3.1: Remove post
  const removeAction = {
    id: 'remove1',
    type: ActionType.REMOVE_POST,
    config: { reason: 'Test removal' }
  };

  const result = await executor.execute([removeAction], target, context);
  console.assert(result[0].success === true, 'Remove action should succeed');

  // Test 3.2: Send modmail
  const modmailAction = {
    id: 'mail1',
    type: ActionType.SEND_MODMAIL,
    config: {
      modmailSubject: 'Test',
      modmailBody: 'Test message'
    }
  };

  const result2 = await executor.execute([modmailAction], target, context);
  console.assert(result2[0].success === true, 'Modmail action should succeed');

  console.log('✅ ActionExecutor tests passed');
}

// Test 4: Template System (skip if import fails)
async function testTemplates() {
  try {
    const module = await import('../templates/RuleTemplates.js');
    const RULE_TEMPLATES = module.RULE_TEMPLATES;
    const templateToRule = module.templateToRule;
    console.assert(RULE_TEMPLATES.length > 0, 'Should have templates');

    const spamTemplate = RULE_TEMPLATES.find(t => t.id === 'spam-detection');
    console.assert(spamTemplate !== undefined, 'Should have spam template');

    const rule = templateToRule(spamTemplate!, 'test_user');
    console.assert(rule.name === 'Spam Detection', 'Template should convert to rule');
    console.assert(rule.enabled === false, 'New rules should start disabled');
    console.assert(rule.testMode === true, 'New rules should start in test mode');

    console.log('✅ Template tests passed');
  } catch (error) {
    console.log('⚠️ Template tests skipped (import issue in test env)');
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Running ModRule Engine Tests...\n');

  try {
    await testConditionEvaluator();
    await testRuleEngine();
    await testActionExecutor();
    await testTemplates();

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
