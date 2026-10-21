/**
 * P8 测试：数据与设置
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
    dataset: {}, children: [], files: [],
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return mockEl(); }, querySelectorAll() { return []; },
    addEventListener() {}, focus() {}, remove() {}, click() {}
  };
}
const cache = {};
global.document = {
  getElementById(id) { if (!cache[id]) cache[id] = mockEl(); return cache[id]; },
  createElement(t) { return mockEl(t); },
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  body: mockEl('body')
};
global.window = { location: { hash: '#/settings', hostname: 'localhost', protocol: 'http:' }, addEventListener() {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.UI = {
  showModal(o) { return { overlay: mockEl(), modal: mockEl(), body: o.content || mockEl() }; },
  closeModal() {}, showToast() {}, showConfirm() { return Promise.resolve(true); },
  showInputConfirm() { return Promise.resolve(true); },
  emptyState(i, t) { return `<div>${t}</div>`; }
};
global.App = { setTheme() {} };

const SettingsPage = require(path.join(__dirname, '../js/pages/settings.js'));

console.log('=== P8 数据与设置测试 ===\n');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch(e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; } }

async function run() {
  await DB.init();
  await Store.settings.initDefaults();

  console.log('--- 页面方法 ---');
  test('render 存在', () => assert.strictEqual(typeof SettingsPage.render, 'function'));
  test('loadSettings 存在', () => assert.strictEqual(typeof SettingsPage.loadSettings, 'function'));
  test('exportData 存在', () => assert.strictEqual(typeof SettingsPage.exportData, 'function'));
  test('importData 存在', () => assert.strictEqual(typeof SettingsPage.importData, 'function'));
  test('clearData 存在', () => assert.strictEqual(typeof SettingsPage.clearData, 'function'));

  console.log('\n--- 设置读写 ---');

  await testAsync('读取默认设置', async () => {
    assert.strictEqual(await Store.settings.get('dailyCalories'), 1800);
    assert.strictEqual(await Store.settings.get('dailyCarbs'), 200);
    assert.strictEqual(await Store.settings.get('dailyProtein'), 120);
    assert.strictEqual(await Store.settings.get('dailyFat'), 60);
    assert.strictEqual(await Store.settings.get('monthlyBudget'), 8000);
    assert.strictEqual(await Store.settings.get('restSeconds'), 90);
  });

  await testAsync('更新设置', async () => {
    await Store.settings.set('dailyCalories', 2000);
    assert.strictEqual(await Store.settings.get('dailyCalories'), 2000);
    await Store.settings.set('dailyCalories', 1800);
  });

  await testAsync('主题设置', async () => {
    await Store.settings.set('theme', 'dark');
    assert.strictEqual(await Store.settings.get('theme'), 'dark');
    await Store.settings.set('theme', 'light');
  });

  await testAsync('获取所有设置', async () => {
    const all = await Store.settings.getAll();
    assert.ok(all.dailyCalories);
    assert.ok(all.dailyCarbs);
    assert.ok(all.monthlyBudget);
    assert.ok(all.restSeconds);
  });

  console.log('\n--- 数据导出/导入 ---');

  await testAsync('导出数据格式正确', async () => {
    const data = await Store.data.exportAll();
    assert.strictEqual(data.app, 'LifeHub');
    assert.strictEqual(data.version, 1);
    assert.ok(data.exportedAt);
    assert.ok(data.data);
    assert.ok(data.data.tasks);
    assert.ok(data.data.settings);
    assert.ok(data.data.expenses);
  });

  await testAsync('导入数据恢复', async () => {
    // 添加测试数据
    await Store.tasks.add({ title: '导出测试', priority: 'high', dueDate: Utils.today() });
    const exportData = await Store.data.exportAll();

    // 清空
    await DB.clearAll();
    const tasksAfterClear = await Store.tasks.getAll();
    assert.strictEqual(tasksAfterClear.length, 0);

    // 导入
    await Store.data.importAll(exportData);
    const tasksAfterImport = await Store.tasks.getAll();
    assert.ok(tasksAfterImport.length >= 1);
    assert.ok(tasksAfterImport.find(t => t.title === '导出测试'));
  });

  await testAsync('导入无效数据报错', async () => {
    try {
      await Store.data.importAll({ invalid: true });
      assert.fail('应该抛出错误');
    } catch (e) {
      assert.ok(e.message.includes('无效') || e.message.includes('format'));
    }
  });

  console.log('\n--- 数据清空 ---');

  await testAsync('清空数据后恢复默认设置', async () => {
    await Store.tasks.add({ title: '待清空', priority: 'low', dueDate: Utils.today() });
    await Store.data.clearAll();

    const tasks = await Store.tasks.getAll();
    assert.strictEqual(tasks.length, 0);

    // 默认设置应恢复
    const calories = await Store.settings.get('dailyCalories');
    assert.strictEqual(calories, 1800);
  });

  await testAsync('数据统计', async () => {
    const stats = await Store.data.getStats();
    assert.ok(stats.tasks !== undefined);
    assert.ok(stats.expenses !== undefined);
    assert.ok(stats.settings !== undefined);
    assert.strictEqual(typeof stats.tasks, 'number');
  });

  console.log('\n--- 工具函数 ---');

  test('downloadFile 函数存在', () => {
    assert.strictEqual(typeof Utils.downloadFile, 'function');
  });

  test('readFileAsText 函数存在', () => {
    assert.strictEqual(typeof Utils.readFileAsText, 'function');
  });

  test('safeJsonParse 处理无效JSON', () => {
    assert.strictEqual(Utils.safeJsonParse('invalid', null), null);
    assert.deepStrictEqual(Utils.safeJsonParse('{"a":1}'), { a: 1 });
  });

  await DB.clearAll();
  await Store.settings.initDefaults();

  console.log('\n=== 测试结果 ===');
  console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
  console.log('\n🎉 P8 所有测试通过！');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
