/**
 * P6 测试：日历模块
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
global.window = { location: { hash: '#/calendar', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: mockEl(), modal: mockEl(), body: o.content || mockEl() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};

const CalendarPage = require(path.join(__dirname, '../js/pages/calendar.js'));

console.log('=== P6 日历测试 ===\n');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof CalendarPage.render, 'function'));
  test('loadCalendar 存在', () => assert.strictEqual(typeof CalendarPage.loadCalendar, 'function'));
  test('renderMonthView 存在', () => assert.strictEqual(typeof CalendarPage.renderMonthView, 'function'));
  test('renderWeekView 存在', () => assert.strictEqual(typeof CalendarPage.renderWeekView, 'function'));
  test('renderDateDetail 存在', () => assert.strictEqual(typeof CalendarPage.renderDateDetail, 'function'));

  console.log('\n--- 日历计算 ---');
  test('月份范围计算', () => {
    const range = Utils.getMonthRange(2026, 10);
    assert.strictEqual(range.first, '2026-10-01');
    assert.strictEqual(range.last, '2026-10-31');
    assert.strictEqual(range.daysInMonth, 31);
  });

  test('周日期计算', () => {
    const week = Utils.getWeekDates('2026-10-21');
    assert.strictEqual(week[0], '2026-10-19');
    assert.strictEqual(week[6], '2026-10-25');
    assert.strictEqual(week.length, 7);
  });

  console.log('\n--- 渲染逻辑 ---');
  test('renderMonthView 包含星期标题', () => {
    CalendarPage.currentYear = 2026;
    CalendarPage.currentMonth = 10;
    const html = CalendarPage.renderMonthView({ daysInMonth: 31, startOffset: 3, dateMap: {} });
    assert.ok(html.includes('一'));
    assert.ok(html.includes('日'));
    assert.ok(html.includes('calendar-days'));
  });

  test('renderMonthView 包含日期', () => {
    const html = CalendarPage.renderMonthView({ daysInMonth: 31, startOffset: 3, dateMap: {} });
    assert.ok(html.includes('1'));
    assert.ok(html.includes('31'));
    assert.ok(html.includes('calendar-day'));
  });

  test('renderMonthView 数据标记点', () => {
    const dateMap = {
      '2026-10-21': { hasTasks: true, hasWorkout: true, hasMeal: false, hasExpense: true }
    };
    const html = CalendarPage.renderMonthView({ daysInMonth: 31, startOffset: 3, dateMap });
    assert.ok(html.includes('calendar-dot'));
    assert.ok(html.includes('#3498DB')); // 任务蓝
    assert.ok(html.includes('#27AE60')); // 健身绿
    assert.ok(html.includes('#E74C3C')); // 记账红
  });

  test('renderWeekView 包含7天', () => {
    CalendarPage.selectedDate = '2026-10-21';
    const html = CalendarPage.renderWeekView();
    assert.ok(html.includes('周一'));
    assert.ok(html.includes('周日'));
  });

  test('renderDateDetail 包含各模块', async () => {
    const html = await CalendarPage.renderDateDetail(Utils.today());
    assert.ok(html.includes('今日计划'));
    assert.ok(html.includes('健身'));
    assert.ok(html.includes('饮食'));
    assert.ok(html.includes('记账'));
  });

  test('renderDateDetail 空状态', async () => {
    const html = await CalendarPage.renderDateDetail('2099-01-01');
    assert.ok(html.includes('无任务'));
    assert.ok(html.includes('休息日'));
    assert.ok(html.includes('未记录'));
  });

  console.log('\n--- 数据标记 ---');

  await testAsync('有任务的日期标记', async () => {
    await Store.tasks.add({ title: '测试', priority: 'high', dueDate: '2026-10-21' });
    const data = await CalendarPage.getMonthData(2026, 10);
    assert.strictEqual(data.dateMap['2026-10-21'].hasTasks, true);
  });

  await testAsync('有健身的日期标记', async () => {
    await Store.workouts.add({ date: '2026-10-22', name: '测试', exercises: [] });
    const data = await CalendarPage.getMonthData(2026, 10);
    assert.strictEqual(data.dateMap['2026-10-22'].hasWorkout, true);
  });

  await testAsync('有饮食的日期标记', async () => {
    await Store.meals.add({ date: '2026-10-23', mealType: 'lunch', foods: [] });
    const data = await CalendarPage.getMonthData(2026, 10);
    assert.strictEqual(data.dateMap['2026-10-23'].hasMeal, true);
  });

  await testAsync('有记账的日期标记', async () => {
    await Store.expenses.add({ type: 'expense', amount: 100, category: 'food', date: '2026-10-24' });
    const data = await CalendarPage.getMonthData(2026, 10);
    assert.strictEqual(data.dateMap['2026-10-24'].hasExpense, true);
  });

  await testAsync('无数据日期不标记', async () => {
    const data = await CalendarPage.getMonthData(2026, 10);
    assert.strictEqual(data.dateMap['2026-10-15'].hasTasks, false);
    assert.strictEqual(data.dateMap['2026-10-15'].hasWorkout, false);
  });

  console.log('\n--- 导航逻辑 ---');
  test('changeMonth 前进', () => {
    CalendarPage.currentYear = 2026;
    CalendarPage.currentMonth = 10;
    CalendarPage.changeMonth(1);
    assert.strictEqual(CalendarPage.currentMonth, 11);
    assert.strictEqual(CalendarPage.currentYear, 2026);
  });

  test('changeMonth 跨年', () => {
    CalendarPage.currentYear = 2026;
    CalendarPage.currentMonth = 12;
    CalendarPage.changeMonth(1);
    assert.strictEqual(CalendarPage.currentMonth, 1);
    assert.strictEqual(CalendarPage.currentYear, 2027);
  });

  test('changeMonth 后退跨年', () => {
    CalendarPage.currentYear = 2026;
    CalendarPage.currentMonth = 1;
    CalendarPage.changeMonth(-1);
    assert.strictEqual(CalendarPage.currentMonth, 12);
    assert.strictEqual(CalendarPage.currentYear, 2025);
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P6 所有测试通过！');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
