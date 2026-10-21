/**
 * 饮食计划模块
 */
const DietPage = {
  currentDate: Utils.today(),

  async render(container) {
    this.currentDate = Utils.today();
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">饮食计划</h1>
          <p class="page-subtitle">记录每一餐，关注营养摄入</p>
        </div>
        <div id="dietContent">加载中...</div>
      </div>
    `;
    await this.loadDiet();
  },

  async loadDiet() {
    const content = document.getElementById('dietContent');
    if (!content) return;

    const summary = await Store.meals.getDaySummary(this.currentDate);
    const goals = {
      calories: await Store.settings.get('dailyCalories') || 1800,
      carbs: await Store.settings.get('dailyCarbs') || 200,
      protein: await Store.settings.get('dailyProtein') || 120,
      fat: await Store.settings.get('dailyFat') || 60
    };

    const isToday = Utils.isToday(this.currentDate);
    const dateText = isToday ? '今天' : Utils.formatDateChinese(this.currentDate);

    content.innerHTML = `
      <div class="tasks-header">
        <div class="tasks-date-nav">
          <button class="btn btn-icon" id="prevDayBtn">‹</button>
          <span class="tasks-date-text">${dateText}</span>
          <button class="btn btn-icon" id="nextDayBtn">›</button>
        </div>
      </div>

      ${this.renderNutritionOverview(summary.totals, goals)}

      <div id="mealSections">
        ${['breakfast', 'lunch', 'dinner', 'snack'].map(type =>
          this.renderMealSection(type, summary.meals[type])
        ).join('')}
      </div>
    `;

    this.bindEvents();
  },

  renderNutritionOverview(totals, goals) {
    const caloriePct = Math.min(100, Math.round((totals.calories / goals.calories) * 100));
    const carbsPct = Math.min(100, Math.round((totals.carbs / goals.carbs) * 100));
    const proteinPct = Math.min(100, Math.round((totals.protein / goals.protein) * 100));
    const fatPct = Math.min(100, Math.round((totals.fat / goals.fat) * 100));

    const carbsClass = carbsPct >= 100 ? 'danger' : carbsPct >= 70 ? 'warning' : 'success';
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (caloriePct / 100) * circumference;

    return `
      <div class="diet-nutrition-overview">
        <div class="calorie-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="10"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 60 60)" style="transition: stroke-dashoffset 0.5s;"/>
          </svg>
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
            <div style="font-size:24px; font-weight:700;">${totals.calories}</div>
            <div style="font-size:11px; color:var(--text-muted);">/ ${goals.calories} 千卡</div>
          </div>
        </div>
        <div class="nutrition-bars">
          ${this.renderNutritionBar('碳水', totals.carbs, goals.carbs, carbsPct, carbsClass, 'g')}
          ${this.renderNutritionBar('蛋白', totals.protein, goals.protein, proteinPct, 'success', 'g')}
          ${this.renderNutritionBar('脂肪', totals.fat, goals.fat, fatPct, 'success', 'g')}
        </div>
      </div>
    `;
  },

  renderNutritionBar(label, current, goal, pct, colorClass, unit) {
    return `
      <div class="nutrition-item">
        <span class="nutrition-label">${label}</span>
        <div class="nutrition-bar-wrap">
          <div class="progress-bar">
            <div class="progress-fill ${colorClass}" style="width:${pct}%"></div>
          </div>
        </div>
        <span class="nutrition-value">${current}/${goal}${unit}</span>
      </div>
    `;
  },

  renderMealSection(mealType, meals) {
    const mealText = Utils.getMealText(mealType);
    const mealIcon = Utils.getMealIcon(mealType);
    const allFoods = meals.flatMap(m => m.foods);
    const totalCalories = allFoods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0);

    return `
      <div class="meal-section">
        <div class="meal-header">
          <div class="meal-title">${mealIcon} ${mealText}</div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="meal-calories">${totalCalories} 千卡</span>
            <button class="btn btn-primary btn-sm" data-action="addFood" data-meal="${mealType}">+ 添加</button>
          </div>
        </div>
        ${allFoods.length === 0 ? `
          <div class="empty-state" style="padding:16px;">
            <div class="empty-state-text">还没有记录，点击添加</div>
          </div>
        ` : allFoods.map(food => `
          <div class="food-item" data-food-id="${food.id}" data-meal-id="${meals.find(m => m.foods.some(mf => mf.id === food.id))?.id}">
            <div>
              <div class="food-name">${this.escapeHtml(food.name)}</div>
              <div class="food-nutrition">${food.amount || ''} · 碳水${food.carbs}g · 蛋白${food.protein}g · 脂肪${food.fat}g</div>
            </div>
            <div style="text-align:right;">
              <div class="fw-bold">${food.calories} 千卡</div>
              <button class="btn btn-icon btn-sm" data-action="deleteFood" data-food-id="${food.id}"
                data-meal-id="${meals.find(m => m.foods.some(mf => mf.id === food.id))?.id}"
                style="color:var(--danger); font-size:12px;">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  bindEvents() {
    const content = document.getElementById('dietContent');
    if (!content) return;

    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');
    if (prevBtn) prevBtn.onclick = () => this.changeDate(-1);
    if (nextBtn) nextBtn.onclick = () => this.changeDate(1);

    content.onclick = (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      if (action === 'addFood') {
        this.showFoodModal(actionEl.dataset.meal);
      } else if (action === 'deleteFood') {
        this.deleteFood(actionEl.dataset.mealId, actionEl.dataset.foodId);
      }
    };
  },

  async changeDate(delta) {
    this.currentDate = Utils.addDays(this.currentDate, delta);
    await this.loadDiet();
  },

  async deleteFood(mealId, foodId) {
    const confirmed = await UI.showConfirm({
      title: '删除食物',
      message: '确定要删除这条食物记录吗？',
      confirmText: '删除',
      danger: true
    });
    if (confirmed) {
      await Store.meals.removeFood(mealId, foodId);
      UI.showToast('已删除');
      await this.loadDiet();
    }
  },

  async showFoodModal(mealType) {
    const commonFoods = await Store.commonFoods.getAll();

    const content = document.createElement('div');
    content.innerHTML = `
      ${commonFoods.length > 0 ? `
        <div class="form-group">
          <label class="form-label">常用食物（点击快速添加）</label>
          <div id="commonFoodList" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
            ${commonFoods.map(f => `
              <button class="btn btn-ghost btn-sm common-food-btn" data-id="${f.id}">
                ${this.escapeHtml(f.name)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">食物名称 *</label>
        <input type="text" class="form-input" id="foodName" placeholder="如：糙米饭" />
      </div>
      <div class="form-group">
        <label class="form-label">份量</label>
        <input type="text" class="form-input" id="foodAmount" placeholder="如：1碗、150g" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">热量 (千卡)</label>
          <input type="number" class="form-input" id="foodCalories" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">碳水 (g)</label>
          <input type="number" class="form-input" id="foodCarbs" placeholder="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">蛋白 (g)</label>
          <input type="number" class="form-input" id="foodProtein" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">脂肪 (g)</label>
          <input type="number" class="form-input" id="foodFat" placeholder="0" />
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="saveCommon" /> 保存为常用食物
        </label>
      </div>
    `;

    // 常用食物快速填充
    content.querySelectorAll('.common-food-btn').forEach(btn => {
      btn.onclick = () => {
        const food = commonFoods.find(f => f.id === btn.dataset.id);
        if (food) {
          content.querySelector('#foodName').value = food.name;
          content.querySelector('#foodAmount').value = food.amount;
          content.querySelector('#foodCalories').value = food.calories;
          content.querySelector('#foodCarbs').value = food.carbs;
          content.querySelector('#foodProtein').value = food.protein;
          content.querySelector('#foodFat').value = food.fat;
        }
      };
    });

    const footer = document.createElement('div');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = '取消';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '添加';
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    const { overlay } = UI.showModal({
      title: `添加${Utils.getMealText(mealType)}`,
      content,
      footer
    });

    const close = () => UI.closeModal(overlay);
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const name = content.querySelector('#foodName').value.trim();
      if (!name) {
        UI.showToast('请输入食物名称', 'error');
        return;
      }

      const foodData = {
        name,
        amount: content.querySelector('#foodAmount').value.trim(),
        calories: Number(content.querySelector('#foodCalories').value) || 0,
        carbs: Number(content.querySelector('#foodCarbs').value) || 0,
        protein: Number(content.querySelector('#foodProtein').value) || 0,
        fat: Number(content.querySelector('#foodFat').value) || 0
      };

      // 查找或创建该餐次记录
      let meals = await Store.meals.getByDateAndMealType(this.currentDate, mealType);
      let mealId;
      if (meals.length === 0) {
        const meal = await Store.meals.add({ date: this.currentDate, mealType, foods: [] });
        mealId = meal.id;
      } else {
        mealId = meals[0].id;
      }

      await Store.meals.addFood(mealId, foodData);

      if (content.querySelector('#saveCommon').checked) {
        await Store.commonFoods.add(foodData);
      }

      UI.showToast('已添加');
      close();
      await this.loadDiet();
    };
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DietPage;
}
