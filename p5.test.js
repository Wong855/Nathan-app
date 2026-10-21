/**
 * P5 测试：记账模块
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
    addEventListener() {}, focus() {}, remove() {}, getContext() { return null; }
  };
}
const cache = {};
global.document = {
  getElementById(id) { if (!cache[id]) cache[id] = mockEl(); return cache[id]; },
  createElement(t) { return mockEl(t); },
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  body: mockEl('body')
};
global.window = { location: { hash: '#/expense', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: mockEl(), modal: mockEl(), body: o.content || mockEl() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};

const ExpensePage = require(path.join(__dirname, '../js/pages/expense.js'));

console.log('=== P5 记账测试 ===\n');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof ExpensePage.render, 'function'));
  test('loadExpense 存在', () => assert.strictEqual(typeof ExpensePage.loadExpense, 'function'));
  test('showExpenseModal 存在', () => assert.strictEqual(typeof ExpensePage.showExpenseModal, 'function'));
  test('renderList 存在', () => assert.strictEqual(typeof ExpensePage.renderList, 'function'));
  test('renderStats 存在', () => assert.strictEqual(typeof ExpensePage.renderStats, 'function'));

  console.log('\n--- 渲染逻辑 ---');
  test('escapeHtml 转义', () => assert.strictEqual(ExpensePage.escapeHtml('<a>'), '&lt;a&gt;'));

  test('renderList 空状态', () => {
    const html = ExpensePage.renderList([]);
    assert.ok(html.includes('还没有记录'));
  });

  test('renderList 有记录', () => {
    const items = [
      { id: '1', type: 'expense', amount: 45, category: 'food', note: '午餐', date: Utils.today(), time: '12:30' }
    ];
    const html = ExpensePage.renderList(items);
    assert.ok(html.includes('餐饮'));
    assert.ok(html.includes('45'));
    assert.ok(html.includes('午餐'));
  });

  test('renderStats 包含图表容器', () => {
    const stats = { income: 8000, expense: 3000, balance: 5000, categoryStats: { food: 1000 } };
    const html = ExpensePage.renderStats(stats);
    assert.ok(html.includes('pieChart'));
    assert.ok(html.includes('lineChart'));
    assert.ok(html.includes('支出分类占比'));
  });

  console.log('\n--- 分类配置 ---');
  test('支出分类7个', () => {
    assert.strictEqual(Store.expenses.categories.expense.length, 7);
  });
  test('收入分类3个', () => {
    assert.strictEqual(Store.expenses.categories.income.length, 3);
  });
  test('获取分类信息', () => {
    const cat = Store.expenses.getCategoryInfo('food');
    assert.strictEqual(cat.name, '餐饮');
    assert.strictEqual(cat.icon, '🍜');
  });

  console.log('\n--- 数据操作 ---');

  await testAsync('添加支出', async () => {
    const e = await Store.expenses.add({
      type: 'expense', amount: 45, category: 'food', note: '午餐', date: Utils.today()
    });
    assert.strictEqual(e.amount, 45);
    assert.strictEqual(e.type, 'expense');
  });

  await testAsync('添加收入', async () => {
    const e = await Store.expenses.add({
      type: 'income', amount: 8000, category: 'salary', note: '工资', date: Utils.today()
    });
    assert.strictEqual(e.type, 'income');
  });

  await testAsync('月度统计', async () => {
    const now = new Date();
    const stats = await Store.expenses.getMonthStats(now.getFullYear(), now.getMonth() + 1);
    assert.ok(stats.income >= 8000);
    assert.ok(stats.expense >= 45);
    assert.strictEqual(stats.balance, stats.income - stats.expense);
    assert.ok(stats.categoryStats.food >= 45);
  });

  await testAsync('近6个月趋势', async () => {
    const months = await Store.expenses.getRecentMonths(6);
    assert.strictEqual(months.length, 6);
    assert.ok(months[0].label);
  });

  await testAsync('更新记录', async () => {
    const all = await Store.expenses.getAll();
    const e = all.find(x => x.type === 'expense');
    await Store.expenses.update(e.id, { amount: 50, note: '午餐(更新)' });
    const updated = await Store.expenses.get(e.id);
    assert.strictEqual(updated.amount, 50);
    assert.strictEqual(updated.note, '午餐(更新)');
  });

  await testAsync('删除记录', async () => {
    const all = await Store.expenses.getAll();
    const e = all.find(x => x.type === 'expense');
    await Store.expenses.delete(e.id);
    const deleted = await Store.expenses.get(e.id);
    assert.strictEqual(deleted, undefined);
  });

  await testAsync('按月查询', async () => {
    const now = new Date();
    const items = await Store.expenses.getByMonth(now.getFullYear(), now.getMonth() + 1);
    assert.ok(items.length >= 1);
    assert.ok(items.every(i => i.date.startsWith(`${now.getFullYear()}-`)));
  });

  await testAsync('金额格式化', () => {
    assert.strictEqual(Utils.formatMoney(1000), 'HK$1,000.00');
    assert.strictEqual(Utils.formatMoney(0), 'HK$0.00');
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P5 所有测试通过！');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
