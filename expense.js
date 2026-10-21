/**
 * 记账模块
 */
const ExpensePage = {
  currentTab: 'list',
  currentMonth: null,
  chartInstances: [],

  async render(container) {
    const now = new Date();
    this.currentMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };

    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">记账</h1>
          <p class="page-subtitle">记录每一笔收支，掌控财务状况</p>
        </div>
        <div id="expenseContent">加载中...</div>
      </div>
    `;
    await this.loadExpense();
  },

  async loadExpense() {
    const content = document.getElementById('expenseContent');
    if (!content) return;

    const { year, month } = this.currentMonth;
    const stats = await Store.expenses.getMonthStats(year, month);
    const items = await Store.expenses.getByMonth(year, month);

    content.innerHTML = `
      <div class="expense-summary">
        <div class="expense-summary-item">
          <div class="expense-summary-label">本月收入</div>
          <div class="expense-summary-value text-success">${Utils.formatMoney(stats.income)}</div>
        </div>
        <div class="expense-summary-item">
          <div class="expense-summary-label">本月支出</div>
          <div class="expense-summary-value text-danger">${Utils.formatMoney(stats.expense)}</div>
        </div>
        <div class="expense-summary-item">
          <div class="expense-summary-label">结余</div>
          <div class="expense-summary-value">${Utils.formatMoney(stats.balance)}</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div class="tabs">
          <div class="tab ${this.currentTab === 'list' ? 'active' : ''}" data-tab="list">收支明细</div>
          <div class="tab ${this.currentTab === 'stats' ? 'active' : ''}" data-tab="stats">统计分析</div>
        </div>
        <button class="btn btn-primary" id="addExpenseBtn">+ 记一笔</button>
      </div>

      <div id="tabContent">
        ${this.currentTab === 'list' ? this.renderList(items) : this.renderStats(stats)}
      </div>
    `;

    this.bindEvents();

    if (this.currentTab === 'stats') {
      setTimeout(() => this.renderCharts(), 100);
    }
  },

  renderList(items) {
    if (items.length === 0) {
      return UI.emptyState('💰', '本月还没有记录，点击右上角记一笔');
    }

    // 按日期分组
    const groups = {};
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    }

    return Object.entries(groups).map(([date, dayItems]) => `
      <div class="expense-date-group">
        <div class="expense-date-title">${Utils.formatDateChinese(date)}</div>
        ${dayItems.map(item => {
          const cat = Store.expenses.getCategoryInfo(item.category);
          return `
            <div class="expense-item" data-id="${item.id}">
              <div class="expense-icon">${cat.icon}</div>
              <div class="expense-info">
                <div class="expense-category">${cat.name}</div>
                <div class="expense-note">${this.escapeHtml(item.note || '')} <span class="expense-time">${item.time}</span></div>
              </div>
              <div class="expense-amount ${item.type}">
                ${item.type === 'income' ? '+' : '-'}${Utils.formatMoney(item.amount)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  },

  renderStats(stats) {
    const budget = Store.settings.defaults.monthlyBudget || 8000;
    const budgetPct = Math.min(100, Math.round((stats.expense / budget) * 100));

    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">📊 本月概览</div>
        <div style="display:flex; gap:24px; align-items:center;">
          <div style="flex:1;">
            <div style="margin-bottom:8px;">
              <span class="text-secondary">支出预算</span>
              <span class="text-right" style="float:right;">${Utils.formatMoney(stats.expense)} / ${Utils.formatMoney(budget)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${budgetPct >= 100 ? 'danger' : budgetPct >= 70 ? 'warning' : 'success'}" style="width:${budgetPct}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">🥧 支出分类占比</div>
        <canvas id="pieChart" height="200"></canvas>
      </div>

      <div class="chart-container">
        <div class="chart-title">📈 近6个月支出趋势</div>
        <canvas id="lineChart" height="200"></canvas>
      </div>
    `;
  },

  async renderCharts() {
    // 销毁旧图表
    this.chartInstances.forEach(c => { try { c.destroy(); } catch (e) {} });
    this.chartInstances = [];

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js 未加载，跳过图表渲染');
      return;
    }

    const { year, month } = this.currentMonth;
    const stats = await Store.expenses.getMonthStats(year, month);
    const months = await Store.expenses.getRecentMonths(6);

    // 饼图
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
      const labels = [];
      const data = [];
      const colors = ['#E74C3C', '#F39C12', '#27AE60', '#3498DB', '#9B59B6', '#1ABC9C', '#E67E22'];
      Object.entries(stats.categoryStats).forEach(([cat, amount], i) => {
        const info = Store.expenses.getCategoryInfo(cat);
        labels.push(info.name);
        data.push(amount);
      });

      if (data.length > 0) {
        this.chartInstances.push(new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'right' } }
          }
        }));
      }
    }

    // 折线图
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
      this.chartInstances.push(new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: months.map(m => m.label),
          datasets: [{
            label: '支出',
            data: months.map(m => m.expense),
            borderColor: '#E74C3C',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      }));
    }
  },

  bindEvents() {
    const content = document.getElementById('expenseContent');
    if (!content) return;

    // Tab 切换
    content.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        this.currentTab = tab.dataset.tab;
        this.loadExpense();
      };
    });

    // 添加
    const addBtn = document.getElementById('addExpenseBtn');
    if (addBtn) addBtn.onclick = () => this.showExpenseModal();

    // 列表项点击编辑
    content.querySelectorAll('.expense-item').forEach(item => {
      item.onclick = () => this.editExpense(item.dataset.id);
    });
  },

  async editExpense(id) {
    const expense = await Store.expenses.get(id);
    if (!expense) return;
    this.showExpenseModal(expense);
  },

  showExpenseModal(existing = null) {
    const isEdit = !!existing;
    const exp = existing || {
      type: 'expense',
      amount: '',
      category: 'food',
      note: '',
      date: Utils.today(),
      time: Utils.nowTime()
    };

    const categories = Store.expenses.categories[exp.type];

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <div class="segmented" id="typeSegmented">
          <div class="segmented-item ${exp.type === 'expense' ? 'active' : ''}" data-value="expense">支出</div>
          <div class="segmented-item ${exp.type === 'income' ? 'active' : ''}" data-value="income">收入</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">金额 (HKD) *</label>
        <input type="number" class="form-input" id="expAmount" value="${exp.amount}" placeholder="0.00" style="font-size:24px; text-align:center;" />
      </div>
      <div class="form-group">
        <label class="form-label">分类</label>
        <div class="category-grid" id="categoryGrid">
          ${categories.map(c => `
            <div class="category-item ${exp.category === c.id ? 'selected' : ''}" data-cat="${c.id}">
              <div class="category-icon">${c.icon}</div>
              <div class="category-name">${c.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">日期</label>
          <input type="date" class="form-input" id="expDate" value="${exp.date}" />
        </div>
        <div class="form-group">
          <label class="form-label">时间</label>
          <input type="time" class="form-input" id="expTime" value="${exp.time}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input type="text" class="form-input" id="expNote" value="${this.escapeHtml(exp.note)}" placeholder="可选备注" />
      </div>
    `;

    let selectedType = exp.type;
    let selectedCategory = exp.category;

    // 类型切换
    content.querySelector('#typeSegmented').querySelectorAll('.segmented-item').forEach(item => {
      item.onclick = () => {
        content.querySelectorAll('#typeSegmented .segmented-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        selectedType = item.dataset.value;
        // 更新分类列表
        selectedCategory = Store.expenses.categories[selectedType][0].id;
        const grid = content.querySelector('#categoryGrid');
        grid.innerHTML = Store.expenses.categories[selectedType].map(c => `
          <div class="category-item ${selectedCategory === c.id ? 'selected' : ''}" data-cat="${c.id}">
            <div class="category-icon">${c.icon}</div>
            <div class="category-name">${c.name}</div>
          </div>
        `).join('');
        this.bindCategorySelection(content, (cat) => { selectedCategory = cat; });
      };
    });

    this.bindCategorySelection(content, (cat) => { selectedCategory = cat; });

    const footer = document.createElement('div');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = '取消';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = isEdit ? '保存修改' : '添加';
    const deleteBtn = isEdit ? document.createElement('button') : null;
    if (deleteBtn) {
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.textContent = '删除';
      deleteBtn.style.marginRight = 'auto';
    }
    if (deleteBtn) footer.appendChild(deleteBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    const { overlay } = UI.showModal({
      title: isEdit ? '编辑记录' : '记一笔',
      content,
      footer
    });

    const close = () => UI.closeModal(overlay);
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const amount = parseFloat(content.querySelector('#expAmount').value);
      if (!amount || amount <= 0) {
        UI.showToast('请输入有效金额', 'error');
        return;
      }

      const data = {
        type: selectedType,
        amount,
        category: selectedCategory,
        note: content.querySelector('#expNote').value.trim(),
        date: content.querySelector('#expDate').value,
        time: content.querySelector('#expTime').value
      };

      if (isEdit) {
        await Store.expenses.update(existing.id, data);
        UI.showToast('已更新');
      } else {
        await Store.expenses.add(data);
        UI.showToast('已添加');
      }
      close();
      await this.loadExpense();
    };

    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const confirmed = await UI.showConfirm({
          title: '删除记录',
          message: '确定要删除这条记录吗？',
          confirmText: '删除',
          danger: true
        });
        if (confirmed) {
          await Store.expenses.delete(existing.id);
          UI.showToast('已删除');
          close();
          await this.loadExpense();
        }
      };
    }
  },

  bindCategorySelection(content, callback) {
    content.querySelectorAll('#categoryGrid .category-item').forEach(item => {
      item.onclick = () => {
        content.querySelectorAll('#categoryGrid .category-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        callback(item.dataset.cat);
      };
    });
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExpensePage;
}
