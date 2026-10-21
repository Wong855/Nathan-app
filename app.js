/**
 * 应用入口
 */
const App = {
  /**
   * 初始化应用
   */
  async init() {
    // 初始化主题
    this.initTheme();

    // 初始化数据库
    if (typeof DB !== 'undefined') {
      await DB.init();
    }

    // 初始化默认设置
    if (typeof Store !== 'undefined' && Store.settings) {
      await Store.settings.initDefaults();
    }

    // 注册所有页面
    this.registerPages();

    // 初始化路由
    Router.init();

    // 注册 Service Worker
    this.registerServiceWorker();

    console.log('生活助手 PWA 已启动');
  },

  /**
   * 注册所有页面
   */
  registerPages() {
    const pages = {
      home: HomePage,
      tasks: TasksPage,
      workout: WorkoutPage,
      diet: DietPage,
      expense: ExpensePage,
      calendar: CalendarPage,
      settings: SettingsPage
    };

    for (const [name, page] of Object.entries(pages)) {
      if (page && typeof page.render === 'function') {
        Router.register(name, page);
      }
    }
  },

  /**
   * 初始化主题
   */
  initTheme() {
    let theme = 'light';
    try {
      const saved = localStorage.getItem('app-theme');
      if (saved) {
        theme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }
    } catch (e) {
      // ignore
    }
    this.setTheme(theme);
  },

  /**
   * 设置主题
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('app-theme', theme);
    } catch (e) {
      // ignore
    }
  },

  /**
   * 获取当前主题
   */
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },

  /**
   * 注册 Service Worker
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // 只在 HTTPS 或 localhost 下注册
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';

      if (isLocalhost || isHttps) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('sw.js')
            .then(registration => {
              console.log('ServiceWorker 注册成功:', registration.scope);
            })
            .catch(error => {
              console.log('ServiceWorker 注册失败:', error);
            });
        });
      }
    }
  }
};

// 启动应用
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
}

// 导出用于测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
