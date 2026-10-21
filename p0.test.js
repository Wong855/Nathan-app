/**
 * P0 测试：基础框架
 * 运行方式：node tests/p0.test.js
 */
const assert = require('assert');
const path = require('path');

// 加载 utils.js
const Utils = require(path.join(__dirname, '../js/utils.js'));

console.log('=== P0 基础框架测试 ===\n');

// ===== Utils 测试 =====
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

console.log('--- Utils.uuid ---');
test('生成唯一ID', () => {
  const id1 = Utils.uuid();
  const id2 = Utils.uuid();
  assert.strictEqual(typeof id1, 'string');
  assert.strictEqual(id1.length, 36);
  assert.notStrictEqual(id1, id2);
});

console.log('\n--- Utils.formatDate ---');
test('格式化日期为 YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 21); // 月份从0开始
  assert.strictEqual(Utils.formatDate(d), '2026-10-21');
});

test('格式化日期字符串输入', () => {
  assert.strictEqual(Utils.formatDate('2026-10-21'), '2026-10-21');
});

console.log('\n--- Utils.formatTime ---');
test('格式化时间为 HH:mm', () => {
  const d = new Date(2026, 9, 21, 14, 30);
  assert.strictEqual(Utils.formatTime(d), '14:30');
});

console.log('\n--- Utils.formatDateTime ---');
test('格式化日期时间', () => {
  const d = new Date(2026, 9, 21, 14, 30);
  assert.strictEqual(Utils.formatDateTime(d), '2026-10-21 14:30');
});

console.log('\n--- Utils.formatDateChinese ---');
test('中文日期格式', () => {
  const d = new Date(2026, 9, 21); // 周三
  assert.strictEqual(Utils.formatDateChinese(d), '2026年10月21日 周三');
});

console.log('\n--- Utils.today ---');
test('获取今天日期', () => {
  const today = Utils.today();
  const expected = Utils.formatDate(new Date());
  assert.strictEqual(today, expected);
});

console.log('\n--- Utils.addDays ---');
test('日期加1天', () => {
  assert.strictEqual(Utils.addDays('2026-10-21', 1), '2026-10-22');
});
test('日期减1天', () => {
  assert.strictEqual(Utils.addDays('2026-10-21', -1), '2026-10-20');
});
test('跨月加天', () => {
  assert.strictEqual(Utils.addDays('2026-10-31', 1), '2026-11-01');
});
test('跨年加天', () => {
  assert.strictEqual(Utils.addDays('2026-12-31', 1), '2027-01-01');
});

console.log('\n--- Utils.getMonthRange ---');
test('获取月份范围', () => {
  const range = Utils.getMonthRange(2026, 10);
  assert.strictEqual(range.first, '2026-10-01');
  assert.strictEqual(range.last, '2026-10-31');
  assert.strictEqual(range.daysInMonth, 31);
});
test('2月闰年', () => {
  const range = Utils.getMonthRange(2024, 2);
  assert.strictEqual(range.daysInMonth, 29);
});
test('2月平年', () => {
  const range = Utils.getMonthRange(2026, 2);
  assert.strictEqual(range.daysInMonth, 28);
});

console.log('\n--- Utils.getWeekDates ---');
test('获取周日期（周三）', () => {
  const week = Utils.getWeekDates('2026-10-21');
  assert.strictEqual(week.length, 7);
  assert.strictEqual(week[0], '2026-10-19'); // 周一
  assert.strictEqual(week[6], '2026-10-25'); // 周日
});
test('获取周日期（周日）', () => {
  const week = Utils.getWeekDates('2026-10-25');
  assert.strictEqual(week[0], '2026-10-19');
  assert.strictEqual(week[6], '2026-10-25');
});
test('获取周日期（周一）', () => {
  const week = Utils.getWeekDates('2026-10-19');
  assert.strictEqual(week[0], '2026-10-19');
});

console.log('\n--- Utils.formatMoney ---');
test('格式化港币金额', () => {
  assert.strictEqual(Utils.formatMoney(1000), 'HK$1,000.00');
});
test('格式化小数金额', () => {
  assert.strictEqual(Utils.formatMoney(45.5), 'HK$45.50');
});
test('格式化0', () => {
  assert.strictEqual(Utils.formatMoney(0), 'HK$0.00');
});
test('格式化负数', () => {
  assert.strictEqual(Utils.formatMoney(-100), 'HK$-100.00');
});

console.log('\n--- Utils.formatNumber ---');
test('格式化数字千分位', () => {
  assert.strictEqual(Utils.formatNumber(1234567), '1,234,567');
});

console.log('\n--- Utils.getGreeting ---');
test('问候语存在', () => {
  const greeting = Utils.getGreeting();
  assert.ok(['早上好', '下午好', '晚上好'].includes(greeting));
});

console.log('\n--- Utils.getPriorityText ---');
test('优先级中文', () => {
  assert.strictEqual(Utils.getPriorityText('high'), '高');
  assert.strictEqual(Utils.getPriorityText('medium'), '中');
  assert.strictEqual(Utils.getPriorityText('low'), '低');
});

console.log('\n--- Utils.getPriorityColor ---');
test('优先级颜色', () => {
  assert.strictEqual(Utils.getPriorityColor('high'), '#E74C3C');
  assert.strictEqual(Utils.getPriorityColor('medium'), '#F39C12');
  assert.strictEqual(Utils.getPriorityColor('low'), '#95A5A6');
});

console.log('\n--- Utils.getMealText ---');
test('餐次中文', () => {
  assert.strictEqual(Utils.getMealText('breakfast'), '早餐');
  assert.strictEqual(Utils.getMealText('lunch'), '午餐');
  assert.strictEqual(Utils.getMealText('dinner'), '晚餐');
  assert.strictEqual(Utils.getMealText('snack'), '加餐');
});

console.log('\n--- Utils.getMealIcon ---');
test('餐次图标', () => {
  assert.strictEqual(Utils.getMealIcon('breakfast'), '🌅');
  assert.strictEqual(Utils.getMealIcon('lunch'), '☀️');
});

console.log('\n--- Utils.safeJsonParse ---');
test('正常JSON解析', () => {
  assert.deepStrictEqual(Utils.safeJsonParse('{"a":1}'), { a: 1 });
});
test('无效JSON返回默认值', () => {
  assert.strictEqual(Utils.safeJsonParse('invalid', null), null);
  assert.strictEqual(Utils.safeJsonParse('invalid', 'fallback'), 'fallback');
});

console.log('\n--- Utils.daysBetween ---');
test('天数差', () => {
  assert.strictEqual(Utils.daysBetween('2026-10-21', '2026-10-28'), 7);
});

console.log('\n--- Utils.isToday ---');
test('是否今天', () => {
  assert.strictEqual(Utils.isToday(Utils.today()), true);
  assert.strictEqual(Utils.isToday('2020-01-01'), false);
});

console.log('\n--- Utils.debounce ---');
test('防抖函数存在', () => {
  const fn = Utils.debounce(() => {}, 100);
  assert.strictEqual(typeof fn, 'function');
});

// ===== Router 测试（mock DOM） =====
console.log('\n--- Router ---');

// Mock 必要的 DOM
global.document = {
  getElementById: () => ({ innerHTML: '', querySelectorAll: () => [] }),
  createElement: () => ({ className: '', innerHTML: '', appendChild: () => {}, style: {} }),
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' }
};
global.window = {
  location: { hash: '#/home', hostname: 'localhost', protocol: 'http:' },
  addEventListener: () => {},
  matchMedia: () => ({ matches: false })
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

const Router = require(path.join(__dirname, '../js/router.js'));

test('Router 注册页面', () => {
  const mockPage = { render: () => {} };
  Router.register('test', mockPage);
  assert.strictEqual(Router.routes.test, mockPage);
});

test('Router 默认路由为 home', () => {
  assert.strictEqual(Router.defaultRoute, 'home');
});

test('Router navigate 生成正确 hash', () => {
  // 模拟 navigate
  Router.navigate('tasks');
  assert.strictEqual(window.location.hash, '#/tasks');
});

// ===== 文件结构检查 =====
console.log('\n--- 文件结构检查 ---');
const fs = require('fs');

const requiredFiles = [
  'index.html',
  'manifest.json',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/pages.css',
  'js/utils.js',
  'js/ui.js',
  'js/router.js',
  'js/app.js',
  'js/db.js',
  'js/store.js',
  'js/pages/home.js',
  'js/pages/tasks.js',
  'js/pages/workout.js',
  'js/pages/diet.js',
  'js/pages/expense.js',
  'js/pages/calendar.js',
  'js/pages/settings.js'
];

for (const file of requiredFiles) {
  test(`文件存在: ${file}`, () => {
    const filePath = path.join(__dirname, '..', file);
    assert.ok(fs.existsSync(filePath), `文件不存在: ${file}`);
  });
}

// ===== HTML 结构检查 =====
console.log('\n--- HTML 结构检查 ---');
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');

test('包含侧边栏', () => {
  assert.ok(htmlContent.includes('id="sidebar"'));
});
test('包含主内容区', () => {
  assert.ok(htmlContent.includes('id="mainContent"'));
});
test('包含模态框容器', () => {
  assert.ok(htmlContent.includes('id="modalContainer"'));
});
test('包含 Toast 容器', () => {
  assert.ok(htmlContent.includes('id="toastContainer"'));
});
test('包含7个导航项', () => {
  const matches = htmlContent.match(/data-page="/g);
  assert.strictEqual(matches ? matches.length : 0, 7);
});
test('引入所有 CSS', () => {
  assert.ok(htmlContent.includes('css/base.css'));
  assert.ok(htmlContent.includes('css/layout.css'));
  assert.ok(htmlContent.includes('css/components.css'));
  assert.ok(htmlContent.includes('css/pages.css'));
});
test('引入所有 JS', () => {
  assert.ok(htmlContent.includes('js/utils.js'));
  assert.ok(htmlContent.includes('js/ui.js'));
  assert.ok(htmlContent.includes('js/router.js'));
  assert.ok(htmlContent.includes('js/app.js'));
});

// ===== 总结 =====
console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 P0 所有测试通过！');
  process.exit(0);
}
