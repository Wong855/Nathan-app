/**
 * P1 测试：数据层
 * 运行方式：node tests/p1.test.js
 */
const assert = require('assert');
const path = require('path');

// 加载依赖
const Utils = require(path.join(__dirname, '../js/utils.js'));
const DB = require(path.join(__dirname, '../js/db.js'));
const Store = require(path.join(__dirname, '../js/store.js'));

// 让全局可访问（store.js 依赖全局 Utils 和 DB）
global.Utils = Utils;
global.DB = DB;

console.log('=== P1 数据层测试 ===\n');

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
  // 初始化数据库（Node 环境下使用内存模式）
  await DB.init();

  console.log('--- DB 基础操作 ---');

  await testAsync('DB 初始化成功', async () => {
    assert.ok(DB.db, '数据库未初始化');
  });

  await testAsync('添加数据', async () => {
    await DB.add('settings', { key: 'test_key', value: 'test_value' });
    const item = await DB.get('settings', 'test_key');
    assert.strictEqual(item.value, 'test_value');
  });

  await testAsync('更新数据', async () => {
    await DB.put('settings', { key: 'test_key', value: 'updated' });
    const item = await DB.get('settings', 'test_key');
    assert.strictEqual(item.value, 'updated');
  });

  await testAsync('获取所有数据', async () => {
    await DB.add('settings', { key: 'key2', value: 'val2' });
    const all = await DB.getAll('settings');
    assert.ok(all.length >= 2);
  });

  await testAsync('删除数据', async () => {
    await DB.delete('settings', 'key2');
    const item = await DB.get('settings', 'key2');
    assert.strictEqual(item, undefined);
  });

  await testAsync('清空 store', async () => {
    await DB.clear('settings');
    const all = await DB.getAll('settings');
    assert.strictEqual(all.length, 0);
  });

  console.log('\n--- 设置 Store ---');

  await testAsync('初始化默认设置', async () => {
    await Store.settings.initDefaults();
    const theme = await Store.settings.get('theme');
    assert.strictEqual(theme, 'light');
  });

  await testAsync('获取默认热量目标', async () => {
    const calories = await Store.settings.get('dailyCalories');
    assert.strictEqual(calories, 1800);
  });

  await testAsync('获取默认碳水目标', async () => {
    const carbs = await Store.settings.get('dailyCarbs');
    assert.strictEqual(carbs, 200);
  });

  await testAsync('获取默认月度预算', async () => {
    const budget = await Store.settings.get('monthlyBudget');
    assert.strictEqual(budget, 8000);
  });

  await testAsync('更新设置', async () => {
    await Store.settings.set('dailyCalories', 2000);
    const calories = await Store.settings.get('dailyCalories');
    assert.strictEqual(calories, 2000);
    // 恢复默认
    await Store.settings.set('dailyCalories', 1800);
  });

  await testAsync('获取所有设置', async () => {
    const all = await Store.settings.getAll();
    assert.ok(all.theme);
    assert.ok(all.dailyCalories);
    assert.ok(all.dailyCarbs);
  });

  console.log('\n--- 任务 Store ---');

  let testTaskId = null;

  await testAsync('添加任务', async () => {
    const task = await Store.tasks.add({
      title: '测试任务',
      priority: 'high',
      dueDate: Utils.today()
    });
    testTaskId = task.id;
    assert.strictEqual(task.title, '测试任务');
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.isCompleted, false);
  });

  await testAsync('获取任务', async () => {
    const task = await Store.tasks.get(testTaskId);
    assert.strictEqual(task.title, '测试任务');
  });

  await testAsync('获取今日任务', async () => {
    const today = await Store.tasks.getToday();
    assert.ok(today.length >= 1);
  });

  await testAsync('切换任务完成状态', async () => {
    const task = await Store.tasks.toggleComplete(testTaskId);
    assert.strictEqual(task.isCompleted, true);
    assert.ok(task.completedAt);
    // 切回来
    await Store.tasks.toggleComplete(testTaskId);
  });

  await testAsync('更新任务', async () => {
    await Store.tasks.update(testTaskId, { title: '更新后的任务' });
    const task = await Store.tasks.get(testTaskId);
    assert.strictEqual(task.title, '更新后的任务');
  });

  await testAsync('任务统计', async () => {
    const stats = await Store.tasks.getStatsByDate(Utils.today());
    assert.ok(stats.total >= 1);
    assert.strictEqual(typeof stats.completed, 'number');
    assert.strictEqual(typeof stats.pending, 'number');
  });

  await testAsync('删除任务', async () => {
    await Store.tasks.delete(testTaskId);
    const task = await Store.tasks.get(testTaskId);
    assert.strictEqual(task, undefined);
  });

  console.log('\n--- 健身计划 Store ---');

  let testWorkoutId = null;

  await testAsync('添加训练计划', async () => {
    const workout = await Store.workouts.add({
      date: Utils.today(),
      name: '胸部训练',
      exercises: [
        { name: '平板卧推', sets: 4, reps: '8-10', weight: 60 }
      ]
    });
    testWorkoutId = workout.id;
    assert.strictEqual(workout.name, '胸部训练');
    assert.strictEqual(workout.exercises.length, 1);
  });

  await testAsync('获取训练计划', async () => {
    const workout = await Store.workouts.get(testWorkoutId);
    assert.strictEqual(workout.name, '胸部训练');
  });

  await testAsync('按日期获取训练', async () => {
    const workouts = await Store.workouts.getByDate(Utils.today());
    assert.ok(workouts.length >= 1);
  });

  await testAsync('获取周训练', async () => {
    const week = await Store.workouts.getWeek(Utils.today());
    assert.ok(week.length >= 1);
  });

  await testAsync('复制到下周', async () => {
    const copied = await Store.workouts.copyToNextWeek(testWorkoutId);
    assert.strictEqual(copied.name, '胸部训练');
    assert.strictEqual(copied.date, Utils.addDays(Utils.today(), 7));
  });

  await testAsync('更新训练计划', async () => {
    await Store.workouts.update(testWorkoutId, { name: '背部训练' });
    const workout = await Store.workouts.get(testWorkoutId);
    assert.strictEqual(workout.name, '背部训练');
  });

  console.log('\n--- 健身记录 Store ---');

  await testAsync('添加训练记录', async () => {
    const record = await Store.workoutRecords.add({
      planId: testWorkoutId,
      date: Utils.today(),
      name: '胸部训练',
      duration: 45,
      completionRate: 100
    });
    assert.strictEqual(record.duration, 45);
  });

  await testAsync('获取所有训练记录', async () => {
    const records = await Store.workoutRecords.getAll();
    assert.ok(records.length >= 1);
  });

  await testAsync('获取最近训练记录', async () => {
    const recent = await Store.workoutRecords.getRecent(5);
    assert.ok(recent.length <= 5);
  });

  console.log('\n--- 饮食 Store ---');

  let testMealId = null;

  await testAsync('添加饮食记录', async () => {
    const meal = await Store.meals.add({
      date: Utils.today(),
      mealType: 'breakfast',
      foods: [
        { name: '燕麦粥', amount: '1碗', calories: 320, carbs: 58, protein: 10, fat: 5 }
      ]
    });
    testMealId = meal.id;
    assert.strictEqual(meal.mealType, 'breakfast');
  });

  await testAsync('添加食物到餐次', async () => {
    const food = await Store.meals.addFood(testMealId, {
      name: '水煮蛋', amount: '2个', calories: 140, carbs: 2, protein: 12, fat: 10
    });
    assert.strictEqual(food.name, '水煮蛋');
  });

  await testAsync('获取当日饮食汇总', async () => {
    const summary = await Store.meals.getDaySummary(Utils.today());
    assert.ok(summary.meals.breakfast.length >= 1);
    assert.strictEqual(summary.totals.calories, 460); // 320 + 140
    assert.strictEqual(summary.totals.carbs, 60); // 58 + 2
  });

  await testAsync('删除食物', async () => {
    const meal = await Store.meals.get(testMealId);
    const foodId = meal.foods[0].id;
    await Store.meals.removeFood(testMealId, foodId);
    const updated = await Store.meals.get(testMealId);
    assert.strictEqual(updated.foods.length, 1);
  });

  await testAsync('按餐次查询', async () => {
    const breakfasts = await Store.meals.getByDateAndMealType(Utils.today(), 'breakfast');
    assert.ok(breakfasts.length >= 1);
  });

  console.log('\n--- 常用食物 Store ---');

  await testAsync('添加常用食物', async () => {
    const food = await Store.commonFoods.add({
      name: '糙米饭', amount: '1碗', calories: 220, carbs: 45, protein: 5, fat: 2
    });
    assert.strictEqual(food.name, '糙米饭');
  });

  await testAsync('获取所有常用食物', async () => {
    const foods = await Store.commonFoods.getAll();
    assert.ok(foods.length >= 1);
  });

  console.log('\n--- 记账 Store ---');

  let testExpenseId = null;

  await testAsync('添加支出记录', async () => {
    const expense = await Store.expenses.add({
      type: 'expense',
      amount: 45,
      category: 'food',
      note: '午餐',
      date: Utils.today()
    });
    testExpenseId = expense.id;
    assert.strictEqual(expense.amount, 45);
    assert.strictEqual(expense.type, 'expense');
  });

  await testAsync('添加收入记录', async () => {
    const income = await Store.expenses.add({
      type: 'income',
      amount: 8000,
      category: 'salary',
      note: '10月工资',
      date: Utils.today()
    });
    assert.strictEqual(income.type, 'income');
  });

  await testAsync('获取记录', async () => {
    const expense = await Store.expenses.get(testExpenseId);
    assert.strictEqual(expense.note, '午餐');
  });

  await testAsync('获取所有记录（按日期排序）', async () => {
    const all = await Store.expenses.getAll();
    assert.ok(all.length >= 2);
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

  await testAsync('获取分类信息', async () => {
    const cat = Store.expenses.getCategoryInfo('food');
    assert.strictEqual(cat.name, '餐饮');
    assert.strictEqual(cat.icon, '🍜');
  });

  await testAsync('分类配置完整', async () => {
    assert.strictEqual(Store.expenses.categories.expense.length, 7);
    assert.strictEqual(Store.expenses.categories.income.length, 3);
  });

  await testAsync('更新记录', async () => {
    await Store.expenses.update(testExpenseId, { amount: 50 });
    const expense = await Store.expenses.get(testExpenseId);
    assert.strictEqual(expense.amount, 50);
  });

  await testAsync('删除记录', async () => {
    await Store.expenses.delete(testExpenseId);
    const expense = await Store.expenses.get(testExpenseId);
    assert.strictEqual(expense, undefined);
  });

  console.log('\n--- 快速备忘 Store ---');

  await testAsync('设置和获取备忘', async () => {
    await Store.quickNote.set('这是测试备忘');
    const note = await Store.quickNote.get();
    assert.strictEqual(note, '这是测试备忘');
  });

  await testAsync('空备忘返回空字符串', async () => {
    await DB.clear('quick_note');
    const note = await Store.quickNote.get();
    assert.strictEqual(note, '');
  });

  console.log('\n--- 数据导出/导入 ---');

  await testAsync('导出所有数据', async () => {
    const exportData = await Store.data.exportAll();
    assert.strictEqual(exportData.app, 'LifeHub');
    assert.strictEqual(exportData.version, 1);
    assert.ok(exportData.data);
    assert.ok(exportData.data.tasks);
    assert.ok(exportData.data.settings);
  });

  await testAsync('数据统计', async () => {
    const stats = await Store.data.getStats();
    assert.ok(stats.tasks !== undefined);
    assert.ok(stats.expenses !== undefined);
  });

  await testAsync('导入数据（覆盖）', async () => {
    const exportData = await Store.data.exportAll();
    // 清空再导入
    await DB.clearAll();
    await Store.data.importAll(exportData);
    const settings = await Store.settings.get('theme');
    assert.strictEqual(settings, 'light');
  });

  await testAsync('清空所有数据', async () => {
    await Store.data.clearAll();
    const tasks = await Store.tasks.getAll();
    assert.strictEqual(tasks.length, 0);
    // 默认设置应恢复
    const theme = await Store.settings.get('theme');
    assert.strictEqual(theme, 'light');
  });

  // ===== 总结 =====
  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 P1 所有测试通过！');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('测试运行出错:', e);
  process.exit(1);
});
