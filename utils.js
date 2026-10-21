/**
 * 工具函数库
 */
const Utils = {
  /**
   * 生成唯一 ID
   */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 格式化时间为 HH:mm
   */
  formatTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  /**
   * 格式化日期时间为 YYYY-MM-DD HH:mm
   */
  formatDateTime(date) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  /**
   * 格式化日期为中文显示，如 2026年10月21日 周三
   */
  formatDateChinese(date) {
    const d = date instanceof Date ? date : new Date(date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  },

  /**
   * 获取今天的日期字符串
   */
  today() {
    return this.formatDate(new Date());
  },

  /**
   * 获取当前时间字符串
   */
  nowTime() {
    return this.formatTime(new Date());
  },

  /**
   * 日期加减天数
   */
  addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  },

  /**
   * 获取某月的第一天和最后一天
   */
  getMonthRange(year, month) {
    // month 是 1-12
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    return {
      first: this.formatDate(first),
      last: this.formatDate(last),
      daysInMonth: last.getDate()
    };
  },

  /**
   * 获取某周的周一到周日
   */
  getWeekDates(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=周日
    const diff = day === 0 ? -6 : 1 - day; // 调整到周一
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(this.formatDate(date));
    }
    return week;
  },

  /**
   * 格式化金额（港币）
   */
  formatMoney(amount) {
    const num = Number(amount) || 0;
    return 'HK$' + num.toLocaleString('zh-HK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  /**
   * 格式化数字（千分位）
   */
  formatNumber(num) {
    return Number(num || 0).toLocaleString('zh-HK');
  },

  /**
   * 根据时间获取问候语
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早上好';
    if (hour >= 12 && hour < 18) return '下午好';
    return '晚上好';
  },

  /**
   * 获取优先级中文
   */
  getPriorityText(priority) {
    const map = { high: '高', medium: '中', low: '低' };
    return map[priority] || priority;
  },

  /**
   * 获取优先级对应的 CSS 类
   */
  getPriorityClass(priority) {
    return `badge-${priority}`;
  },

  /**
   * 获取优先级颜色
   */
  getPriorityColor(priority) {
    const map = { high: '#E74C3C', medium: '#F39C12', low: '#95A5A6' };
    return map[priority] || '#95A5A6';
  },

  /**
   * 餐次中文
   */
  getMealText(mealType) {
    const map = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
    return map[mealType] || mealType;
  },

  /**
   * 餐次图标
   */
  getMealIcon(mealType) {
    const map = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
    return map[mealType] || '🍽️';
  },

  /**
   * 安全解析 JSON
   */
  safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * 防抖
   */
  debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 下载文件
   */
  downloadFile(filename, content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * 读取文件为文本
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  /**
   * 计算两个日期之间的天数差
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d2 - d1);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * 判断是否是今天
   */
  isToday(dateStr) {
    return this.formatDate(dateStr) === this.today();
  }
};

// 导出用于测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
