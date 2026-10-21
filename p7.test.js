/**
 * P7 测试：首页总览
 */
const assert = require('assert');
const path = require('path');
const Utils = require(path.join(__dirname, '../js/utils.js'));
const DB = require(path.join(__dirname, '../js/db.js'));
const Store = require(path.join(__dirname, '../js/store.js'));
global.Utils = Utils; global.DB = DB; global.Store = Store;

function mockEl(tag = 'div') {
  return {
    tagName: tag, innerHTML: '', textContent: '', value: '', className: '', style: {},
    dataset: {}, children: [],
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return mockEl(); }, querySelectorAll() { return []; },
    addEventListener() {}, focus() {}, remove() {}
  };
}
const cache = {};
global.document = {
  getElementById(id) { if (!cache[id]) cache[id] = mockEl(); return cache[id]; },
  createElement(t) { return mockEl(t); },
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  body: mockEl('body')
};
global.window = { location: { hash: '#/home', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: mockEl(), modal: mockEl(), body: o.content || mockEl() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};
global.Router = { navigate() {} };

const HomePage = require(path.join(__dirname, '../js/pages/home.js'));

console.log('=== P7 首页总览测试 ===\n');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof HomePage.render, 'function'));
  test('loadHome 存在', () => assert.strictEqual(typeof HomePage.loadHome, 'function'));
  test('escapeHtml 存在', () => assert.strictEqual(typeof HomePage.escapeHtml, 'function'));

  console.log('\n--- 渲染逻辑 ---');
  test('escapeHtml 转义', () => {
    assert.strictEqual(HomePage.escapeHtml('<script>'), '&lt;script&gt;');
  });

  console.log('\n--- 数据集成 ---');

  await testAsync('首页加载各模块数据', async () => {
    // 添加测试数据
    await Store.tasks.add({ title: '首页测试任务', priority: 'high', dueDate: Utils.today() });
    await Store.workouts.add({ date: Utils.today(), name: '胸部训练', exercises: [{ name: '卧推', sets: 4, reps: '8', weight: '60' }] });
    await Store.meals.add({ date: Utils.today(), mealType: 'breakfast', foods: [{ name: '燕麦', calories: 320, carbs: 58, protein: 10, fat: 5 }] });
    await Store.expenses.add({ type: 'expense', amount: 100, category: 'food', date: Utils.today() });
    await Store.quickNote.set('测试备忘内容');

    // 验证数据可查询
    const tasks = await Store.tasks.getToday();
    assert.ok(tasks.length >= 1);

    const workouts = await Store.workouts.getByDate(Utils.today());
    assert.ok(workouts.length >= 1);

    const meals = await Store.meals.getDaySummary(Utils.today());
    assert.ok(meals.totals.calories >= 320);

    const now = new Date();
    const stats = await Store.expenses.getMonthStats(now.getFullYear(), now.getMonth() + 1);
    assert.ok(stats.expense >= 100);

    const note = await Store.quickNote.get();
    assert.strictEqual(note, '测试备忘内容');
  });

  await testAsync('任务完成状态同步', async () => {
    const tasks = await Store.tasks.getToday();
    const task = tasks.find(t => t.title === '首页测试任务');
    assert.ok(task);
    await Store.tasks.toggleComplete(task.id);
    const updated = await Store.tasks.get(task.id);
    assert.strictEqual(updated.isCompleted, true);
  });

  await testAsync('饮食碳水计算正确', async () => {
    const summary = await Store.meals.getDaySummary(Utils.today());
    assert.strictEqual(summary.totals.carbs, 58);
    assert.strictEqual(summary.totals.calories, 320);
  });

  await testAsync('记账月度统计正确', async () => {
    const now = new Date();
    const stats = await Store.expenses.getMonthStats(now.getFullYear(), now.getMonth() + 1);
    assert.ok(stats.expense >= 100);
    assert.ok(stats.categoryStats.food >= 100);
  });

  await testAsync('快速备忘读写', async () => {
    await Store.quickNote.set('新的备忘');
    const note = await Store.quickNote.get();
    assert.strictEqual(note, '新的备忘');
  });

  await testAsync('用户设置读取', async () => {
    const name = await Store.settings.get('userName');
    assert.ok(typeof name === 'string');
    const calories = await Store.settings.get('dailyCalories');
    assert.strictEqual(calories, 1800);
    const budget = await Store.settings.get('monthlyBudget');
    assert.strictEqual(budget, 8000);
  });

  console.log('\n--- 首页要素检查 ---');

  test('问候语函数正常', () => {
    const greeting = Utils.getGreeting();
    assert.ok(['早上好', '下午好', '晚上好'].includes(greeting));
  });

  test('日期格式化正常', () => {
    const dateStr = Utils.formatDateChinese(Utils.today());
    assert.ok(dateStr.includes('年'));
    assert.ok(dateStr.includes('月'));
    assert.ok(dateStr.includes('日'));
  });

  test('金额格式化正常', () => {
    assert.strictEqual(Utils.formatMoney(1000), 'HK$1,000.00');
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P7 所有测试通过！');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
