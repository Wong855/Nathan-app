/**
 * 首页总览模块
 */
const HomePage = {
  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div id="homeContent">加载中...</div>
      </div>
    `;
    await this.loadHome();
  },

  async loadHome() {
    const content = document.getElementById('homeContent');
    if (!content) return;

    const today = Utils.today();
    const userName = await Store.settings.get('userName') || '';
    const greeting = Utils.getGreeting();

    // 获取各模块数据
    const tasks = await Store.tasks.getByDate(today);
    const pendingTasks = tasks.filter(t => !t.isCompleted);
    const completedTasks = tasks.filter(t => t.isCompleted);

    const workouts = await Store.workouts.getByDate(today);
    const workoutRecords = await Store.workoutRecords.getRecent(1);
    const lastWorkout = workoutRecords.length > 0 ? workoutRecords[0] : null;

    const mealSummary = await Store.meals.getDaySummary(today);
    const goals = {
      calories: await Store.settings.get('dailyCalories') || 1800,
      carbs: await Store.settings.get('dailyCarbs') || 200
    };

    const now = new Date();
    const expenseStats = await Store.expenses.getMonthStats(now.getFullYear(), now.getMonth() + 1);
    const budget = await Store.settings.get('monthlyBudget') || 8000;
    const budgetPct = Math.min(100, Math.round((expenseStats.expense / budget) * 100));

    const quickNote = await Store.quickNote.get();

    const carbsPct = Math.min(100, Math.round((mealSummary.totals.carbs / goals.carbs) * 100));
    const carbsColor = carbsPct >= 100 ? 'var(--danger)' : carbsPct >= 70 ? 'var(--warning)' : 'var(--text-primary)';

    content.innerHTML = `
      <div class="home-greeting">
        <h1>${greeting}，${userName} 👋</h1>
        <p>${Utils.formatDateChinese(today)} · ${pendingTasks.length}个待办 · ${workouts.length > 0 ? '有训练' : '休息日'} · 已记录${mealSummary.totals.calories > 0 ? Object.values(mealSummary.meals).flat().length : 0}餐</p>
      </div>

      <div class="home-cards">
        <!-- 今日计划卡片 -->
        <div class="card summary-card" data-nav="tasks">
          <div class="summary-card-header">
            <span class="summary-card-title">✅ 今日计划</span>
            <span class="summary-card-icon">📋</span>
          </div>
          <div class="summary-card-value">${pendingTasks.length}<span style="font-size:14px; color:var(--text-muted);"> / ${tasks.length}</span></div>
          <div class="summary-card-sub">${completedTasks.length}项已完成</div>
          <div style="margin-top:12px;">
            ${pendingTasks.slice(0, 3).map(t => `
              <div style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:14px;">
                <div class="checkbox" data-action="toggleTask" data-id="${t.id}" style="width:18px; height:18px;"></div>
                <span style="flex:1; ${t.isCompleted ? 'text-decoration:line-through; opacity:0.5;' : ''}">${this.escapeHtml(t.title)}</span>
              </div>
            `).join('')}
            ${pendingTasks.length === 0 ? '<div class="text-muted" style="font-size:13px;">今天没有待办任务 🎉</div>' : ''}
          </div>
          <div style="margin-top:12px; font-size:13px; color:var(--accent);">查看全部 →</div>
        </div>

        <!-- 今日健身卡片 -->
        <div class="card summary-card" data-nav="workout">
          <div class="summary-card-header">
            <span class="summary-card-title">💪 今日健身</span>
            <span class="summary-card-icon">🏋️</span>
          </div>
          <div class="summary-card-value">${workouts.length > 0 ? workouts[0].name : '休息日'}</div>
          <div class="summary-card-sub">
            ${workouts.length > 0 ? `${workouts[0].exercises.length}个动作` : '好好休息恢复'}
          </div>
          ${lastWorkout ? `
            <div style="margin-top:12px; font-size:13px; color:var(--text-muted);">
              上次训练：${lastWorkout.date} · ${lastWorkout.duration}分钟
            </div>
          ` : ''}
          ${workouts.length > 0 ? `
            <button class="btn btn-success btn-sm mt-md" data-action="startWorkout" data-id="${workouts[0].id}">▶ 开始训练</button>
          ` : ''}
          <div style="margin-top:12px; font-size:13px; color:var(--accent);">查看计划 →</div>
        </div>

        <!-- 今日饮食卡片 -->
        <div class="card summary-card" data-nav="diet">
          <div class="summary-card-header">
            <span class="summary-card-title">🍎 今日饮食</span>
            <span class="summary-card-icon">🥗</span>
          </div>
          <div class="summary-card-value">${mealSummary.totals.calories}<span style="font-size:14px; color:var(--text-muted);"> / ${goals.calories}</span></div>
          <div class="summary-card-sub">千卡</div>
          <div style="margin-top:12px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
              <span>碳水</span>
              <span style="color:${carbsColor}; font-weight:600;">${mealSummary.totals.carbs}/${goals.carbs}g</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${carbsPct >= 100 ? 'danger' : carbsPct >= 70 ? 'warning' : 'success'}" style="width:${carbsPct}%"></div>
            </div>
          </div>
          <div style="margin-top:12px; font-size:13px; color:var(--accent);">记录一餐 →</div>
        </div>
      </div>

      <div class="home-bottom">
        <!-- 本月支出卡片 -->
        <div class="card summary-card" data-nav="expense">
          <div class="summary-card-header">
            <span class="summary-card-title">💰 本月支出</span>
            <span class="summary-card-icon">💳</span>
          </div>
          <div style="display:flex; gap:24px; margin-bottom:12px;">
            <div>
              <div style="font-size:13px; color:var(--text-muted);">支出</div>
              <div style="font-size:20px; font-weight:700; color:var(--danger);">${Utils.formatMoney(expenseStats.expense)}</div>
            </div>
            <div>
              <div style="font-size:13px; color:var(--text-muted);">收入</div>
              <div style="font-size:20px; font-weight:700; color:var(--success);">${Utils.formatMoney(expenseStats.income)}</div>
            </div>
            <div>
              <div style="font-size:13px; color:var(--text-muted);">结余</div>
              <div style="font-size:20px; font-weight:700;">${Utils.formatMoney(expenseStats.balance)}</div>
            </div>
          </div>
          <div style="margin-bottom:4px; font-size:13px;">
            <span>预算进度</span>
            <span style="float:right;">${budgetPct}% / ${Utils.formatMoney(budget)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${budgetPct >= 100 ? 'danger' : budgetPct >= 70 ? 'warning' : 'success'}" style="width:${budgetPct}%"></div>
          </div>
          <div style="margin-top:12px; font-size:13px; color:var(--accent);">查看明细 →</div>
        </div>

        <!-- 快速备忘 -->
        <div class="card">
          <div class="summary-card-header">
            <span class="summary-card-title">📝 快速备忘</span>
            <span class="summary-card-icon">🗒️</span>
          </div>
          <textarea class="quick-note" id="quickNoteInput" placeholder="随手记点什么...">${this.escapeHtml(quickNote)}</textarea>
          <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">自动保存</div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const content = document.getElementById('homeContent');
    if (!content) return;

    // 卡片点击跳转
    content.querySelectorAll('[data-nav]').forEach(card => {
      card.onclick = (e) => {
        // 如果点击的是按钮或复选框，不触发卡片跳转
        if (e.target.closest('[data-action]')) return;
        Router.navigate(card.dataset.nav);
      };
    });

    // 任务打勾
    content.querySelectorAll('[data-action="toggleTask"]').forEach(checkbox => {
      checkbox.onclick = async (e) => {
        e.stopPropagation();
        const id = checkbox.dataset.id;
        await Store.tasks.toggleComplete(id);
        UI.showToast('任务状态已更新');
        await this.loadHome();
      };
    });

    // 开始训练
    const startBtn = content.querySelector('[data-action="startWorkout"]');
    if (startBtn) {
      startBtn.onclick = async (e) => {
        e.stopPropagation();
        Router.navigate('workout');
        // 延迟启动训练
        setTimeout(async () => {
          if (typeof WorkoutPage !== 'undefined') {
            await WorkoutPage.startWorkout(startBtn.dataset.id);
          }
        }, 300);
      };
    }

    // 快速备忘自动保存
    const noteInput = document.getElementById('quickNoteInput');
    if (noteInput) {
      const saveNote = Utils.debounce(async () => {
        await Store.quickNote.set(noteInput.value);
      }, 500);
      noteInput.addEventListener('input', saveNote);
    }
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HomePage;
}
