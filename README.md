# 生活助手 PWA

个人工作生活管理应用，运行在 iPad 浏览器中，数据完全本地存储。

## 功能模块

1. **首页总览** - 今日任务、健身、饮食、支出一览 + 快速备忘
2. **今日计划** - 任务管理，三级优先级，完成追踪
3. **健身计划** - 周训练安排，训练中模式（组间休息计时），历史记录
4. **饮食计划** - 四餐记录，热量/碳水/蛋白/脂肪统计，碳水超量提醒
5. **记账** - 港币收支记录，分类管理，月度统计图表
6. **日历** - 月/周视图，数据标记，每日详情
7. **数据与设置** - JSON 导出/导入/清空，主题切换，个人目标调整

## 技术栈

- 纯 HTML + CSS + JavaScript（无构建工具）
- IndexedDB 本地存储
- Service Worker 离线缓存
- Chart.js 图表
- PWA（可添加到主屏幕）

## 部署方法

### 方法一：GitHub Pages（推荐，免费）

1. 在 GitHub 创建新仓库
2. 将 `life-hub-pwa/` 目录下所有文件推送到仓库
3. 进入仓库 Settings → Pages
4. Source 选择 `main` 分支，根目录
5. 等待部署完成，获得 `https://<用户名>.github.io/<仓库名>/` 地址

### 方法二：Netlify

1. 注册 Netlify 账号
2. 将 `life-hub-pwa/` 目录拖入 Netlify 部署页面
3. 自动获得 HTTPS 地址

### 方法三：Vercel

1. 注册 Vercel 账号
2. 导入项目或直接上传文件夹
3. 自动部署

## iPad 安装步骤

1. 在 iPad Safari 中打开部署后的 HTTPS 地址
2. 点击底部分享按钮
3. 选择「添加到主屏幕」
4. 主屏幕出现「生活助手」图标
5. 点击图标即可全屏使用，离线也能正常运行

## 数据安全

- 所有数据存储在 iPad 本地 IndexedDB 中
- 不会上传到任何服务器
- 建议定期在「设置 → 数据管理 → 导出全部数据」备份
- 清除浏览器数据会导致数据丢失，请先备份

## 项目结构

```
life-hub-pwa/
├── index.html              # 主入口
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker
├── css/
│   ├── base.css            # 变量、重置、主题
│   ├── layout.css          # 侧边栏、布局
│   ├── components.css      # 组件样式
│   └── pages.css           # 页面样式
├── js/
│   ├── app.js              # 应用入口
│   ├── router.js           # 路由
│   ├── db.js               # IndexedDB 封装
│   ├── store.js            # 数据操作层
│   ├── ui.js               # UI 组件
│   ├── utils.js            # 工具函数
│   └── pages/
│       ├── home.js         # 首页
│       ├── tasks.js        # 今日计划
│       ├── workout.js      # 健身计划
│       ├── diet.js         # 饮食计划
│       ├── expense.js      # 记账
│       ├── calendar.js     # 日历
│       └── settings.js     # 设置
├── assets/
│   ├── icon-192.png        # 应用图标
│   ├── icon-512.png        # 应用图标
│   └── chart.umd.min.js    # Chart.js
└── tests/                  # 测试文件
```

## 测试

```bash
cd life-hub-pwa
node tests/p0.test.js  # 基础框架
node tests/p1.test.js  # 数据层
# ... 共 10 个测试文件
```

全部 289 项测试通过。

## 版本

v1.0.0
