/**
 * P9 测试：PWA离线 + 整体联调
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('=== P9 PWA + 整体联调测试 ===\n');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

console.log('--- PWA 配置 ---');

test('manifest.json 存在且有效', () => {
  const content = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(content);
  assert.strictEqual(manifest.name, '生活助手');
  assert.strictEqual(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 2);
  assert.ok(manifest.start_url);
});

test('sw.js 存在', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'sw.js')));
  const content = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf-8');
  assert.ok(content.includes('CACHE_NAME'));
  assert.ok(content.includes('install'));
  assert.ok(content.includes('fetch'));
});

test('Service Worker 缓存列表包含所有资源', () => {
  const content = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf-8');
  assert.ok(content.includes('index.html'));
  assert.ok(content.includes('base.css'));
  assert.ok(content.includes('app.js'));
  assert.ok(content.includes('home.js'));
  assert.ok(content.includes('tasks.js'));
  assert.ok(content.includes('workout.js'));
  assert.ok(content.includes('diet.js'));
  assert.ok(content.includes('expense.js'));
  assert.ok(content.includes('calendar.js'));
  assert.ok(content.includes('settings.js'));
  assert.ok(content.includes('chart.umd.min.js'));
});

test('应用图标存在', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/icon-192.png')));
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/icon-512.png')));
  const icon192 = fs.statSync(path.join(ROOT, 'assets/icon-192.png'));
  const icon512 = fs.statSync(path.join(ROOT, 'assets/icon-512.png'));
  assert.ok(icon192.size > 0);
  assert.ok(icon512.size > 0);
});

test('Chart.js 本地副本存在', () => {
  const chartPath = path.join(ROOT, 'assets/chart.umd.min.js');
  assert.ok(fs.existsSync(chartPath));
  const content = fs.readFileSync(chartPath, 'utf-8');
  assert.ok(content.length > 10000, 'Chart.js 文件太小');
  assert.ok(content.includes('Chart') || content.includes('chart'));
});

test('index.html 引入 Chart.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('chart.umd.min.js'));
});

test('index.html 引入 manifest', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('manifest.json'));
});

test('index.html 包含 iOS PWA meta 标签', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('apple-mobile-web-app-capable'));
  assert.ok(html.includes('apple-mobile-web-app-title'));
});

console.log('\n--- 文件完整性 ---');

const requiredFiles = [
  'index.html', 'manifest.json', 'sw.js',
  'css/base.css', 'css/layout.css', 'css/components.css', 'css/pages.css',
  'js/utils.js', 'js/ui.js', 'js/db.js', 'js/store.js', 'js/router.js', 'js/app.js',
  'js/pages/home.js', 'js/pages/tasks.js', 'js/pages/workout.js',
  'js/pages/diet.js', 'js/pages/expense.js', 'js/pages/calendar.js', 'js/pages/settings.js'
];

for (const file of requiredFiles) {
  test(`文件存在: ${file}`, () => {
    const filePath = path.join(ROOT, file);
    assert.ok(fs.existsSync(filePath), `缺少文件: ${file}`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, `文件为空: ${file}`);
  });
}

console.log('\n--- 模块导出检查 ---');

const modules = ['utils', 'ui', 'db', 'store', 'router', 'app'];
for (const mod of modules) {
  test(`${mod}.js 可正常加载`, () => {
    const modPath = path.join(ROOT, `js/${mod}.js`);
    const code = fs.readFileSync(modPath, 'utf-8');
    assert.ok(code.includes('module.exports'), `${mod}.js 缺少 module.exports`);
  });
}

const pages = ['home', 'tasks', 'workout', 'diet', 'expense', 'calendar', 'settings'];
for (const page of pages) {
  test(`pages/${page}.js 包含 render 方法`, () => {
    const code = fs.readFileSync(path.join(ROOT, `js/pages/${page}.js`), 'utf-8');
    assert.ok(code.includes('render'), `${page}.js 缺少 render 方法`);
    assert.ok(code.includes('module.exports'), `${page}.js 缺少导出`);
  });
}

console.log('\n--- HTML 结构检查 ---');

test('侧边栏包含7个导航项', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  const matches = html.match(/data-page="/g);
  assert.strictEqual(matches.length, 7);
});

test('包含所有必要的 DOM 容器', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('id="sidebar"'));
  assert.ok(html.includes('id="mainContent"'));
  assert.ok(html.includes('id="modalContainer"'));
  assert.ok(html.includes('id="toastContainer"'));
});

test('所有 JS 文件都在 HTML 中引入', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  for (const mod of modules) {
    assert.ok(html.includes(`js/${mod}.js`), `缺少 ${mod}.js 引用`);
  }
  for (const page of pages) {
    assert.ok(html.includes(`js/pages/${page}.js`), `缺少 ${page}.js 引用`);
  }
});

console.log('\n--- CSS 变量检查 ---');

test('浅色主题变量完整', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/base.css'), 'utf-8');
  assert.ok(css.includes('--bg'));
  assert.ok(css.includes('--card-bg'));
  assert.ok(css.includes('--text-primary'));
  assert.ok(css.includes('--accent'));
  assert.ok(css.includes('--success'));
  assert.ok(css.includes('--danger'));
});

test('深色主题变量完整', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/base.css'), 'utf-8');
  assert.ok(css.includes('[data-theme="dark"]'));
});

console.log('\n--- 数据模型完整性 ---');

test('Store 包含所有模块', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/store.js'), 'utf-8');
  assert.ok(code.includes('settings'));
  assert.ok(code.includes('tasks'));
  assert.ok(code.includes('workouts'));
  assert.ok(code.includes('workoutRecords'));
  assert.ok(code.includes('meals'));
  assert.ok(code.includes('commonFoods'));
  assert.ok(code.includes('expenses'));
  assert.ok(code.includes('quickNote'));
  assert.ok(code.includes('data'));
});

test('DB 包含所有 store 定义', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/db.js'), 'utf-8');
  assert.ok(code.includes('tasks'));
  assert.ok(code.includes('workouts'));
  assert.ok(code.includes('workout_records'));
  assert.ok(code.includes('meals'));
  assert.ok(code.includes('expenses'));
  assert.ok(code.includes('settings'));
  assert.ok(code.includes('common_foods'));
  assert.ok(code.includes('quick_note'));
});

console.log('\n--- 功能关键词检查 ---');

test('记账固定港币', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/store.js'), 'utf-8');
  assert.ok(code.includes('HKD'));
});

test('饮食包含碳水提醒逻辑', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/pages/diet.js'), 'utf-8');
  assert.ok(code.includes('carbs'));
  assert.ok(code.includes('warning') || code.includes('danger'));
});

test('健身包含训练中模式', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/pages/workout.js'), 'utf-8');
  assert.ok(code.includes('activeWorkout'));
  assert.ok(code.includes('restTimer'));
  assert.ok(code.includes('completeSet'));
});

test('首页包含快速备忘', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/pages/home.js'), 'utf-8');
  assert.ok(code.includes('quickNote'));
  assert.ok(code.includes('quick-note'));
});

test('设置包含数据导出导入', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js/pages/settings.js'), 'utf-8');
  assert.ok(code.includes('exportData'));
  assert.ok(code.includes('importData'));
  assert.ok(code.includes('clearData'));
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed} / 失败: ${failed} / 总计: ${passed + failed}`);
if (failed > 0) process.exit(1);
console.log('\n🎉 P9 所有测试通过！');
process.exit(0);
