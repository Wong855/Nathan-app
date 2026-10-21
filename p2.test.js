/**
 * P2 测试：今日计划模块
 * 运行方式：node tests/p2.test.js
 */
const assert = require('assert');
const path = require('path');

const Utils = require(path.join(__dirname, '../js/utils.js'));
const DB = require(path.join(__dirname, '../js/db.js'));
const Store = require(path.join(__dirname, '../js/store.js'));

global.Utils = Utils;
global.DB = DB;

// 简易 DOM mock
function createMockElement(tag = 'div') {
  return {
    tagName: tag,
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    style: {},
    dataset: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter(c => c !== child); },
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    focus() {},
    onclick: null
  };
}

const elementCache = {};
global.document = {
  getElementById(id) {
    if (!elementCache[id]) elementCache[id] = createMockElement();
    return elementCache[id];
  },
  createElement(tag) { return createMockElement(tag); },
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  body: createMockElement('body')
};
global.window = {
  location: { hash: '#/tasks', hostname: 'localhost', protocol: 'http:' },
  addEventListener() {}
};
global.localStorage = { getItem: () => null, setItem: () => {} };

global.UI = {
  showModal(options) {
    return { overlay: createMockElement(), modal: createMockElement(), body: options.content || createMockElement() };
  },
  closeModal() {},
  showToast() {},
  showConfirm() { return Promise.resolve(true); },
  showInputConfirm() { return Promise.resolve(true); }
};

const TasksPage = require(path.join(__dirname, '../js/pages/tasks.js'));

console.log('=== P2 今日计划测试 ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

async function runTests() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  await testAsync('render 方法存在', async () => {
    assert.strictEqual(typeof TasksPage.render, 'function');
  });
  await testAsync('loadTasks 方法存在', async () => {
    assert.strictEqual(typeof TasksPage.loadTasks, 'function');
  });
  await testAsync('showTaskModal 方法存在', async () => {
    assert.strictEqual(typeof TasksPage.showTaskModal, 'function');
  });

  console.log('\n--- HTML 渲染逻辑 ---');
  test('escapeHtml 转义特殊字符', () => {
    assert.strictEqual(TasksPage.escapeHtml('<script>'), '&lt;script&gt;');
    assert.strictEqual(TasksPage.escapeHtml('a&b'), 'a&amp;b');
    assert.strictEqual(TasksPage.escapeHtml(''), '');
    assert.strictEqual(TasksPage.escapeHtml(null), '');
  });

  test('renderTaskItem 包含任务标题', () => {
    const task = { id: '1', title: '测试任务', priority: 'high', isCompleted: false, note: '', dueTime: '' };
    const html = TasksPage.renderTaskItem(task);
    assert.ok(html.includes('测试任务'));
    assert.ok(html.includes('data-id="1"'));
    assert.ok(html.includes('badge-high'));
  });

  test('renderTaskItem 已完成状态', () => {
    const task = { id: '1', title: '已完成', priority: 'low', isCompleted: true, note: '', dueTime: '' };
    const html = TasksPage.renderTaskItem(task);
    assert.ok(html.includes('checkbox checked'));
  });

  test('renderTaskItem 显示时间', () => {
    const task = { id: '1', title: '任务', priority: 'medium', isCompleted: false, note: '', dueTime: '14:30' };
    const html = TasksPage.renderTaskItem(task);
    assert.ok(html.includes('14:30'));
  });

  test('renderPriorityGroup 空任务返回空', () => {
    assert.strictEqual(TasksPage.renderPriorityGroup('高', 'high', []), '');
  });

  test('renderPriorityGroup 非空包含标题', () => {
    const task = { id: '1', title: '任务', priority: 'high', isCompleted: false, note: '', dueTime: '' };
    const html = TasksPage.renderPriorityGroup('高优先级', 'high', [task]);
    assert.ok(html.includes('高优先级'));
    assert.ok(html.includes('(1)'));
  });

  test('renderCompletedGroup 空返回空', () => {
    assert.strictEqual(TasksPage.renderCompletedGroup([]), '');
  });

  test('renderCompletedGroup 非空包含已完成', () => {
    const task = { id: '1', title: '完成', priority: 'low', isCompleted: true, note: '', dueTime: '' };
    const html = TasksPage.renderCompletedGroup([task]);
    assert.ok(html.includes('已完成'));
    assert.ok(html.includes('(1)'));
  });

  console.log('\n--- 数据操作集成测试 ---');

  await testAsync('添加任务后可查询到', async () => {
    const task = await Store.tasks.add({
      title: 'P2测试任务',
      priority: 'high',
      dueDate: Utils.today()
    });
    const today = await Store.tasks.getToday();
    const found = today.find(t => t.id === task.id);
    assert.ok(found, '添加的任务应在今日列表中');
    assert.strictEqual(found.title, 'P2测试任务');
    await Store.tasks.delete(task.id);
  });

  await testAsync('任务完成状态切换', async () => {
    const task = await Store.tasks.add({
      title: '完成测试',
      priority: 'medium',
      dueDate: Utils.today()
    });
    let updated = await Store.tasks.toggleComplete(task.id);
    assert.strictEqual(updated.isCompleted, true);
    updated = await Store.tasks.toggleComplete(task.id);
    assert.strictEqual(updated.isCompleted, false);
    await Store.tasks.delete(task.id);
  });

  await testAsync('按优先级筛选任务', async () => {
    const t1 = await Store.tasks.add({ title: '高', priority: 'high', dueDate: Utils.today() });
    const t2 = await Store.tasks.add({ title: '中', priority: 'medium', dueDate: Utils.today() });
    const t3 = await Store.tasks.add({ title: '低', priority: 'low', dueDate: Utils.today() });

    const tasks = await Store.tasks.getByDate(Utils.today());
    const high = tasks.filter(t => t.priority === 'high' && !t.isCompleted);
    const medium = tasks.filter(t => t.priority === 'medium' && !t.isCompleted);
    const low = tasks.filter(t => t.priority === 'low' && !t.isCompleted);

    assert.ok(high.length >= 1, '高优先级任务应存在');
    assert.ok(medium.length >= 1, '中优先级任务应存在');
    assert.ok(low.length >= 1, '低优先级任务应存在');

    await Store.tasks.delete(t1.id);
    await Store.tasks.delete(t2.id);
    await Store.tasks.delete(t3.id);
  });

  await testAsync('日期切换查询不同天任务', async () => {
    const today = Utils.today();
    const tomorrow = Utils.addDays(today, 1);

    const t1 = await Store.tasks.add({ title: '今天的任务', priority: 'high', dueDate: today });
    const t2 = await Store.tasks.add({ title: '明天的任务', priority: 'low', dueDate: tomorrow });

    const todayTasks = await Store.tasks.getByDate(today);
    const tomorrowTasks = await Store.tasks.getByDate(tomorrow);

    assert.ok(todayTasks.find(t => t.title === '今天的任务'), '今天应包含今天的任务');
    assert.ok(tomorrowTasks.find(t => t.title === '明天的任务'), '明天应包含明天的任务');
    assert.ok(!todayTasks.find(t => t.title === '明天的任务'), '今天不应包含明天的任务');

    await Store.tasks.delete(t1.id);
    await Store.tasks.delete(t2.id);
  });

  await testAsync('任务统计', async () => {
    const t1 = await Store.tasks.add({ title: '待办1', priority: 'high', dueDate: Utils.today() });
    const t2 = await Store.tasks.add({ title: '待办2', priority: 'medium', dueDate: Utils.today() });
    await Store.tasks.toggleComplete(t2.id);

    const stats = await Store.tasks.getStatsByDate(Utils.today());
    assert.ok(stats.total >= 2);
    assert.ok(stats.completed >= 1);
    assert.ok(stats.pending >= 1);

    await Store.tasks.delete(t1.id);
    await Store.tasks.delete(t2.id);
  });

  await testAsync('编辑更新任务', async () => {
    const task = await Store.tasks.add({ title: '原标题', priority: 'low', dueDate: Utils.today() });
    await Store.tasks.update(task.id, { title: '新标题', priority: 'high' });
    const updated = await Store.tasks.get(task.id);
    assert.strictEqual(updated.title, '新标题');
    assert.strictEqual(updated.priority, 'high');
    await Store.tasks.delete(task.id);
  });

  console.log('\n--- 页面状态 ---');
  test('currentDate 为有效日期格式', () => {
    assert.ok(TasksPage.currentDate.match(/^\d{4}-\d{2}-\d{2}$/));
  });
  test('showCompleted 为布尔值', () => {
    assert.strictEqual(typeof TasksPage.showCompleted, 'boolean');
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 P2 所有测试通过！');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('测试运行出错:', e);
  process.exit(1);
});
