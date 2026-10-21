/**
 * 日历模块
 */
const CalendarPage = {
  currentYear: null,
  currentMonth: null,
  selectedDate: null,
  viewMode: 'month', // month or week

  async render(container) {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.selectedDate = Utils.today();

    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">日历</h1>
          <p class="page-subtitle">一览每日安排与记录</p>
        </div>
        <div id="calendarContent">加载中...</div>
      </div>
    `;
    await this.loadCalendar();
  },

  async loadCalendar() {
    const content = document.getElementById('calendarContent');
    if (!content) return;

    const monthData = await this.getMonthData(this.currentYear, this.currentMonth);

    content.innerHTML = `
      <div class="calendar-grid">
        <div class="calendar-header">
          <button class="btn btn-icon" id="prevMonthBtn">‹</button>
          <div class="calendar-title">${this.currentYear}年${this.currentMonth}月</div>
          <button class="btn btn-icon" id="nextMonthBtn">›</button>
          <div style="display:flex; gap:8px; margin-left:16px;">
            <button class="btn btn-ghost btn-sm ${this.viewMode === 'month' ? 'active' : ''}" id="monthViewBtn">月</button>
            <button class="btn btn-ghost btn-sm ${this.viewMode === 'week' ? 'active' : ''}" id="weekViewBtn">周</button>
            <button class="btn btn-primary btn-sm" id="todayBtn">今天</button>
          </div>
        </div>

        ${this.viewMode === 'month' ? this.renderMonthView(monthData) : this.renderWeekView()}
      </div>

      <div id="calendarDetail">
        ${await this.renderDateDetail(this.selectedDate)}
      </div>
    `;

    this.bindEvents();
  },

  async getMonthData(year, month) {
    const { first, last, daysInMonth } = Utils.getMonthRange(year, month);
    const firstDay = new Date(first).getDay(); // 0=周日
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // 转为周一起始

    // 获取当月所有数据
    const allTasks = await Store.tasks.getAll();
    const allWorkouts = await Store.workouts.getAll();
    const allMeals = await Store.meals.getAll();
    const allExpenses = await Store.expenses.getAll();

    const dateMap = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dateMap[date] = {
        hasTasks: allTasks.some(t => t.dueDate === date),
        hasWorkout: allWorkouts.some(w => w.date === date),
        hasMeal: allMeals.some(m => m.date === date),
        hasExpense: allExpenses.some(e => e.date === date)
      };
    }

    return { daysInMonth, startOffset, dateMap };
  },

  renderMonthView(monthData) {
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    const { daysInMonth, startOffset, dateMap } = monthData;

    let daysHtml = '';

    // 前置空白
    for (let i = 0; i < startOffset; i++) {
      daysHtml += `<div class="calendar-day other-month"></div>`;
    }

    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = dateMap[date] || {};
      const isToday = Utils.isToday(date);
      const isSelected = date === this.selectedDate;

      const dots = [];
      if (data.hasTasks) dots.push('<span class="calendar-dot" style="background:#3498DB;"></span>');
      if (data.hasWorkout) dots.push('<span class="calendar-dot" style="background:#27AE60;"></span>');
      if (data.hasMeal) dots.push('<span class="calendar-dot" style="background:#E67E22;"></span>');
      if (data.hasExpense) dots.push('<span class="calendar-dot" style="background:#E74C3C;"></span>');

      daysHtml += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${date}">
          ${day}
          ${dots.length > 0 ? `<div class="calendar-dots">${dots.join('')}</div>` : ''}
        </div>
      `;
    }

    return `
      <div class="calendar-weekdays">
        ${weekdays.map(d => `<div>${d}</div>`).join('')}
      </div>
      <div class="calendar-days">${daysHtml}</div>
    `;
  },

  renderWeekView() {
    const weekDates = Utils.getWeekDates(this.selectedDate);
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

    return `
      <div class="calendar-weekdays">
        ${weekdays.map((d, i) => {
          const date = weekDates[i];
          const dayNum = new Date(date).getDate();
          const isToday = Utils.isToday(date);
          return `<div style="${isToday ? 'color:var(--accent); font-weight:700;' : ''}">周${d} ${dayNum}</div>`;
        }).join('')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; min-height:200px;">
        ${weekDates.map(date => `
          <div class="calendar-day ${Utils.isToday(date) ? 'today' : ''} ${date === this.selectedDate ? 'selected' : ''}"
            data-date="${date}" style="aspect-ratio:auto; min-height:180px; flex-direction:column; justify-content:flex-start; padding-top:8px;">
            <div style="font-weight:600;">${new Date(date).getDate()}</div>
            <div id="week-events-${date}" style="width:100%; margin-top:8px;"></div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async renderDateDetail(date) {
    const tasks = await Store.tasks.getByDate(date);
    const workouts = await Store.workouts.getByDate(date);
    const mealSummary = await Store.meals.getDaySummary(date);
    const expenses = (await Store.expenses.getAll()).filter(e => e.date === date);

    const dateText = Utils.isToday(date) ? '今天' : Utils.formatDateChinese(date);
    const totalExpense = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    return `
      <div class="calendar-detail">
        <div class="calendar-detail-title">📅 ${dateText}</div>

        <div class="calendar-detail-item">
          <span style="font-size:20px;">✅</span>
          <div style="flex:1;">
            <div class="fw-bold">今日计划</div>
            <div class="text-muted" style="font-size:13px;">
              ${tasks.length > 0 ? `${tasks.filter(t=>!t.isCompleted).length}项待办 · ${tasks.filter(t=>t.isCompleted).length}项已完成` : '无任务'}
            </div>
          </div>
          ${tasks.length > 0 ? `<span class="text-secondary">›</span>` : ''}
        </div>

        <div class="calendar-detail-item">
          <span style="font-size:20px;">💪</span>
          <div style="flex:1;">
            <div class="fw-bold">健身</div>
            <div class="text-muted" style="font-size:13px;">
              ${workouts.length > 0 ? workouts.map(w => w.name).join('、') : '休息日'}
            </div>
          </div>
        </div>

        <div class="calendar-detail-item">
          <span style="font-size:20px;">🍎</span>
          <div style="flex:1;">
            <div class="fw-bold">饮食</div>
            <div class="text-muted" style="font-size:13px;">
              ${mealSummary.totals.calories > 0
                ? `已记录${Object.values(mealSummary.meals).flat().length}餐 · ${mealSummary.totals.calories}千卡 · 碳水${mealSummary.totals.carbs}g`
                : '未记录'}
            </div>
          </div>
        </div>

        <div class="calendar-detail-item">
          <span style="font-size:20px;">💰</span>
          <div style="flex:1;">
            <div class="fw-bold">记账</div>
            <div class="text-muted" style="font-size:13px;">
              ${expenses.length > 0 ? `${expenses.length}笔记录 · 支出${Utils.formatMoney(totalExpense)}` : '无记录'}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    const content = document.getElementById('calendarContent');
    if (!content) return;

    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    if (prevBtn) prevBtn.onclick = () => this.changeMonth(-1);
    if (nextBtn) nextBtn.onclick = () => this.changeMonth(1);

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) todayBtn.onclick = () => this.goToday();

    const monthBtn = document.getElementById('monthViewBtn');
    const weekBtn = document.getElementById('weekViewBtn');
    if (monthBtn) monthBtn.onclick = () => { this.viewMode = 'month'; this.loadCalendar(); };
    if (weekBtn) weekBtn.onclick = () => { this.viewMode = 'week'; this.loadCalendar(); };

    // 日期点击
    content.querySelectorAll('.calendar-day[data-date]').forEach(day => {
      day.onclick = async () => {
        this.selectedDate = day.dataset.date;
        const detail = document.getElementById('calendarDetail');
        if (detail) {
          detail.innerHTML = await this.renderDateDetail(this.selectedDate);
        }
        // 更新选中样式
        content.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        day.classList.add('selected');
      };
    });
  },

  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }
    this.loadCalendar();
  },

  goToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.selectedDate = Utils.today();
    this.loadCalendar();
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarPage;
}
