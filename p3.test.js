/**
 * P3 测试：健身计划模块
 */
const assert = require('assert');
const path = require('path');

const Utils = require(path.join(__dirname, '../js/utils.js'));
const DB = require(path.join(__dirname, '../js/db.js'));
const Store = require(path.join(__dirname, '../js/store.js'));

global.Utils = Utils;
global.DB = DB;

function createMockElement(tag = 'div') {
  return {
    tagName: tag, innerHTML: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, children: [],
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); },
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    focus() {}, onclick: null, remove() {}
  };
}

const cache = {};
global.document = {
  getElementById(id) { if (!cache[id]) cache[id] = createMockElement(); return cache[id]; },
  createElement(tag) { return createMockElement(tag); },
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  body: createMockElement('body')
};
global.window = { location: { hash: '#/workout', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: createMockElement(), modal: createMockElement(), body: o.content || createMockElement() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};

const WorkoutPage = require(path.join(__dirname, '../js/pages/workout.js'));

console.log('=== P3 健身计划测试 ===\n');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof WorkoutPage.render, 'function'));
  test('loadWorkout 存在', () => assert.strictEqual(typeof WorkoutPage.loadWorkout, 'function'));
  test('showWorkoutModal 存在', () => assert.strictEqual(typeof WorkoutPage.showWorkoutModal, 'function'));
  test('startWorkout 存在', () => assert.strictEqual(typeof WorkoutPage.startWorkout, 'function'));
  test('endWorkout 存在', () => assert.strictEqual(typeof WorkoutPage.endWorkout, 'function'));

  console.log('\n--- 渲染逻辑 ---');
  test('escapeHtml 转义', () => {
    assert.strictEqual(WorkoutPage.escapeHtml('<b>'), '&lt;b&gt;');
  });

  test('renderExerciseRow 包含输入框', () => {
    const html = WorkoutPage.renderExerciseRow({ name: '卧推', sets: 4, reps: '8-10', weight: '60' }, 0);
    assert.ok(html.includes('卧推'));
    assert.ok(html.includes('ex-name'));
    assert.ok(html.includes('ex-sets'));
    assert.ok(html.includes('ex-weight'));
  });

  test('renderWorkoutDetail 空状态', () => {
    WorkoutPage.selectedDate = Utils.today();
    const html = WorkoutPage.renderWorkoutDetail([]);
    assert.ok(html.includes('没有训练安排'));
    assert.ok(html.includes('addWorkoutBtn'));
  });

  test('renderWorkoutDetail 有训练', () => {
    const w = { id: '1', name: '胸部训练', exercises: [{ name: '卧推', sets: 4, reps: '8', weight: '60' }], notes: '' };
    const html = WorkoutPage.renderWorkoutDetail([w]);
    assert.ok(html.includes('胸部训练'));
    assert.ok(html.includes('卧推'));
    assert.ok(html.includes('开始训练'));
  });

  console.log('\n--- 数据操作 ---');

  await testAsync('添加训练计划', async () => {
    const w = await Store.workouts.add({
      date: Utils.today(), name: '胸部训练',
      exercises: [{ name: '平板卧推', sets: 4, reps: '8-10', weight: '60' }]
    });
    assert.strictEqual(w.name, '胸部训练');
    assert.strictEqual(w.exercises.length, 1);
  });

  await testAsync('获取周训练', async () => {
    const week = await Store.workouts.getWeek(Utils.today());
    assert.ok(week.length >= 1);
  });

  await testAsync('按日期获取训练', async () => {
    const workouts = await Store.workouts.getByDate(Utils.today());
    assert.ok(workouts.length >= 1);
  });

  await testAsync('复制到下周', async () => {
    const workouts = await Store.workouts.getByDate(Utils.today());
    const w = workouts[0];
    const copied = await Store.workouts.copyToNextWeek(w.id);
    assert.strictEqual(copied.name, w.name);
    assert.strictEqual(copied.date, Utils.addDays(w.date, 7));
  });

  await testAsync('更新训练计划', async () => {
    const workouts = await Store.workouts.getByDate(Utils.today());
    const w = workouts[0];
    await Store.workouts.update(w.id, { name: '背部训练' });
    const updated = await Store.workouts.get(w.id);
    assert.strictEqual(updated.name, '背部训练');
  });

  await testAsync('添加训练记录', async () => {
    const r = await Store.workoutRecords.add({
      planId: 'test', date: Utils.today(), name: '胸部训练',
      duration: 45, completionRate: 100
    });
    assert.strictEqual(r.duration, 45);
  });

  await testAsync('获取训练记录', async () => {
    const records = await Store.workoutRecords.getAll();
    assert.ok(records.length >= 1);
  });

  await testAsync('获取最近记录', async () => {
    const recent = await Store.workoutRecords.getRecent(5);
    assert.ok(recent.length <= 5);
  });

  await testAsync('删除训练计划', async () => {
    const workouts = await Store.workouts.getByDate(Utils.today());
    for (const w of workouts) {
      await Store.workouts.delete(w.id);
    }
    const after = await Store.workouts.getByDate(Utils.today());
    assert.strictEqual(after.length, 0);
  });

  console.log('\n--- 训练中模式逻辑 ---');

  test('completeSet 推进组次', () => {
    WorkoutPage.activeWorkout = {
      planId: '1', name: '测试',
      exercises: [{ name: '动作1', sets: 2, reps: '10', actualSets: [] }],
      currentExercise: 0, currentSet: 1, startTime: Date.now()
    };
    WorkoutPage.completeSet();
    assert.strictEqual(WorkoutPage.activeWorkout.currentSet, 2);
    assert.strictEqual(WorkoutPage.activeWorkout.exercises[0].actualSets.length, 1);
  });

  test('completeSet 完成所有组后推进动作', () => {
    WorkoutPage.activeWorkout = {
      planId: '1', name: '测试',
      exercises: [
        { name: '动作1', sets: 1, reps: '10', actualSets: [] },
        { name: '动作2', sets: 3, reps: '12', actualSets: [] }
      ],
      currentExercise: 0, currentSet: 1, startTime: Date.now()
    };
    WorkoutPage.completeSet();
    assert.strictEqual(WorkoutPage.activeWorkout.currentExercise, 1);
    assert.strictEqual(WorkoutPage.activeWorkout.currentSet, 1);
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P3 所有测试通过！');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
