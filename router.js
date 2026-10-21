/**
 * 简单的 Hash 路由
 */
const Router = {
  routes: {},
  currentPage: null,
  defaultRoute: 'home',

  /**
   * 注册路由
   * @param {string} name - 页面名称
   * @param {Object} page - 页面对象，必须包含 render(container) 方法
   */
  register(name, page) {
    this.routes[name] = page;
  },

  /**
   * 初始化路由
   */
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  /**
   * 处理路由变化
   */
  handleRoute() {
    const hash = window.location.hash.replace('#/', '') || this.defaultRoute;
    const pageName = hash.split('?')[0]; // 去掉查询参数
    const page = this.routes[pageName] || this.routes[this.defaultRoute];

    if (!page) {
      console.error(`Page not found: ${pageName}`);
      return;
    }

    const container = document.getElementById('mainContent');
    container.innerHTML = '';

    // 更新侧边栏高亮
    this.updateSidebar(pageName);

    // 渲染页面
    this.currentPage = pageName;
    if (typeof page.render === 'function') {
      page.render(container);
    } else if (typeof page === 'function') {
      page(container);
    }
  },

  /**
   * 更新侧边栏激活状态
   */
  updateSidebar(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  /**
   * 导航到指定页面
   */
  navigate(pageName) {
    window.location.hash = `#/${pageName}`;
  },

  /**
   * 获取当前页面名称
   */
  getCurrentPage() {
    return this.currentPage;
  },

  /**
   * 刷新当前页面
   */
  refresh() {
    this.handleRoute();
  }
};

// 导出用于测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}
