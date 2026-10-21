/**
 * P4 测试：饮食计划模块
 */
const assert = require('assert');
const path = require('path');
const Utils = require(path.join(__dirname, '../js/utils.js'));
const DB = require(path.join(__dirname, '../js/db.js'));
const Store = require(path.join(__dirname, '../js/store.js'));
global.Utils = Utils; global.DB = DB;

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
global.window = { location: { hash: '#/diet', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: mockEl(), modal: mockEl(), body: o.content || mockEl() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};

const DietPage = require(path.join(__dirname, '../js/pages/diet.js'));

console.log('=== P4 饮食计划测试 ===\n');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof DietPage.render, 'function'));
  test('loadDiet 存在', () => assert.strictEqual(typeof DietPage.loadDiet, 'function'));
  test('showFoodModal 存在', () => assert.strictEqual(typeof DietPage.showFoodModal, 'function'));

  console.log('\n--- 渲染逻辑 ---');
  test('escapeHtml 转义', () => assert.strictEqual(DietPage.escapeHtml('<x>'), '&lt;x&gt;'));

  test('renderNutritionBar 包含进度条', () => {
    const html = DietPage.renderNutritionBar('碳水', 150, 200, 75, 'warning', 'g');
    assert.ok(html.includes('碳水'));
    assert.ok(html.includes('150/200g'));
    assert.ok(html.includes('progress-fill'));
  });

  test('renderMealSection 空状态', () => {
    const html = DietPage.renderMealSection('breakfast', []);
    assert.ok(html.includes('早餐'));
    assert.ok(html.includes('还没有记录'));
  });

  test('renderMealSection 有食物', () => {
    const meal = { id: '1', foods: [{ id: 'f1', name: '燕麦', amount: '1碗', calories: 320, carbs: 58, protein: 10, fat: 5 }] };
    const html = DietPage.renderMealSection('breakfast', [meal]);
    assert.ok(html.includes('燕麦'));
    assert.ok(html.includes('320 千卡'));
    assert.ok(html.includes('碳水58g'));
  });

  console.log('\n--- 数据操作 ---');

  await testAsync('添加饮食记录', async () => {
    const meal = await Store.meals.add({
      date: Utils.today(), mealType: 'breakfast',
      foods: [{ name: '燕麦粥', amount: '1碗', calories: 320, carbs: 58, protein: 10, fat: 5 }]
    });
    assert.strictEqual(meal.mealType, 'breakfast');
  });

  await testAsync('添加食物到餐次', async () => {
    const meals = await Store.meals.getByDateAndMealType(Utils.today(), 'breakfast');
    const food = await Store.meals.addFood(meals[0].id, {
      name: '水煮蛋', amount: '2个', calories: 140, carbs: 2, protein: 12, fat: 10
    });
    assert.strictEqual(food.name, '水煮蛋');
  });

  await testAsync('当日营养汇总', async () => {
    const summary = await Store.meals.getDaySummary(Utils.today());
    assert.strictEqual(summary.totals.calories, 460);
    assert.strictEqual(summary.totals.carbs, 60);
    assert.ok(summary.meals.breakfast.length >= 1);
  });

  await testAsync('删除食物', async () => {
    const meals = await Store.meals.getByDateAndMealType(Utils.today(), 'breakfast');
    const meal = meals[0];
    const foodId = meal.foods[0].id;
    await Store.meals.removeFood(meal.id, foodId);
    const updated = await Store.meals.get(meal.id);
    assert.strictEqual(updated.foods.length, 1);
  });

  await testAsync('常用食物增删', async () => {
    const food = await Store.commonFoods.add({ name: '糙米饭', amount: '1碗', calories: 220, carbs: 45, protein: 5, fat: 2 });
    const all = await Store.commonFoods.getAll();
    assert.ok(all.length >= 1);
    await Store.commonFoods.delete(food.id);
  });

  await testAsync('按餐次查询', async () => {
    const breakfasts = await Store.meals.getByDateAndMealType(Utils.today(), 'breakfast');
    assert.ok(breakfasts.length >= 1);
    const dinners = await Store.meals.getByDateAndMealType(Utils.today(), 'dinner');
    assert.strictEqual(dinners.length, 0);
  });

  await testAsync('四餐分区完整', async () => {
    const summary = await Store.meals.getDaySummary(Utils.today());
    assert.ok(summary.meals.breakfast !== undefined);
    assert.ok(summary.meals.lunch !== undefined);
    assert.ok(summary.meals.dinner !== undefined);
    assert.ok(summary.meals.snack !== undefined);
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P4 所有测试通过！');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
