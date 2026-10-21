/**
 * 健身计划模块
 */
const WorkoutPage = {
  currentWeekStart: null,
  selectedDate: null,
  activeWorkout: null,
  restTimer: null,
  restSeconds: 0,

  async render(container) {
    const today = Utils.today();
    const weekDates = Utils.getWeekDates(today);
    this.currentWeekStart = weekDates[0];
    this.selectedDate = today;

    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">健身计划</h1>
          <p class="page-subtitle">安排训练，记录每一次进步</p>
        </div>
        <div id="workoutContent">加载中...</div>
      </div>
    `;
    await this.loadWorkout();
  },

  async loadWorkout() {
    const content = document.getElementById('workoutContent');
    if (!content) return;

    const weekDates = Utils.getWeekDates(this.currentWeekStart);
    const weekWorkouts = await Store.workouts.getWeek(this.currentWeekStart);
    const selectedWorkouts = weekWorkouts.filter(w => w.date === this.selectedDate);
    const records = await Store.workoutRecords.getRecent(10);

    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

    content.innerHTML = `
      <div class="workout-week-bar" id="weekBar">
        <button class="btn btn-icon btn-sm" id="prevWeekBtn">‹</button>
        ${weekDates.map((date, i) => {
          const d = new Date(date);
          const hasWorkout = weekWorkouts.some(w => w.date === date);
          const isSelected = date === this.selectedDate;
          const isToday = Utils.isToday(date);
          return `
            <div class="week-day ${isSelected ? 'active' : ''}" data-date="${date}">
              <div class="week-day-name">周${weekdays[i]}${isToday ? ' · 今天' : ''}</div>
              <div class="week-day-num">${d.getDate()}</div>
              <div class="week-day-has-workout">${hasWorkout ? '💪' : ''}</div>
            </div>
          `;
        }).join('')}
        <button class="btn btn-icon btn-sm" id="nextWeekBtn">›</button>
      </div>

      <div id="selectedDayWorkout">
        ${this.renderWorkoutDetail(selectedWorkouts)}
      </div>

      <div class="card mt-md">
        <div class="card-title">📋 历史记录</div>
        ${records.length === 0 ? UI.emptyState('🏋️', '还没有训练记录，开始你的第一次训练吧') : `
          ${records.map(r => `
            <div class="list-item" data-record-id="${r.id}">
              <div style="flex:1;">
                <div class="fw-bold">${this.escapeHtml(r.name)}</div>
                <div class="text-muted" style="font-size:13px;">${r.date} · ${r.duration}分钟 · 完成度${r.completionRate}%</div>
              </div>
              <span class="text-secondary">›</span>
            </div>
          `).join('')}
        `}
      </div>
    `;

    this.bindEvents();
  },

  renderWorkoutDetail(workouts) {
    if (workouts.length === 0) {
      const dateText = Utils.isToday(this.selectedDate) ? '今天' : Utils.formatDateChinese(this.selectedDate);
      return `
        <div class="card">
          <div class="card-title">📅 ${dateText}</div>
          ${UI.emptyState('💤', '这一天没有训练安排')}
          <div style="text-align:center; margin-top:16px;">
            <button class="btn btn-primary" id="addWorkoutBtn">+ 安排训练</button>
          </div>
        </div>
      `;
    }

    return workouts.map(w => `
      <div class="card" data-workout-id="${w.id}">
        <div class="card-title">
          💪 ${this.escapeHtml(w.name)}
          <span class="text-muted" style="font-size:13px; font-weight:normal;">${w.exercises.length}个动作</span>
        </div>
        ${w.exercises.map((ex, i) => `
          <div class="exercise-item">
            <div>
              <div class="exercise-name">${i + 1}. ${this.escapeHtml(ex.name)}</div>
              <div class="exercise-detail">${ex.sets}组 × ${ex.reps}次${ex.weight ? ` · ${ex.weight}kg` : ''}</div>
            </div>
          </div>
        `).join('')}
        ${w.notes ? `<p class="text-muted" style="margin-top:8px; font-size:13px;">📝 ${this.escapeHtml(w.notes)}</p>` : ''}
        <div class="workout-actions">
          <button class="btn btn-success" data-action="start" data-id="${w.id}">▶ 开始训练</button>
          <button class="btn btn-ghost" data-action="edit" data-id="${w.id}">编辑</button>
          <button class="btn btn-ghost" data-action="copy" data-id="${w.id}">复制到下周</button>
          <button class="btn btn-ghost text-danger" data-action="delete" data-id="${w.id}">删除</button>
        </div>
      </div>
    `).join('');
  },

  bindEvents() {
    const content = document.getElementById('workoutContent');
    if (!content) return;

    const prevWeek = document.getElementById('prevWeekBtn');
    const nextWeek = document.getElementById('nextWeekBtn');
    if (prevWeek) prevWeek.onclick = () => this.changeWeek(-7);
    if (nextWeek) nextWeek.onclick = () => this.changeWeek(7);

    // 周天选择
    content.querySelectorAll('.week-day').forEach(day => {
      day.onclick = () => {
        this.selectedDate = day.dataset.date;
        this.loadWorkout();
      };
    });

    // 添加训练
    const addBtn = document.getElementById('addWorkoutBtn');
    if (addBtn) addBtn.onclick = () => this.showWorkoutModal();

    // 训练操作
    content.onclick = (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;

      if (action === 'start') this.startWorkout(id);
      else if (action === 'edit') this.editWorkout(id);
      else if (action === 'copy') this.copyWorkout(id);
      else if (action === 'delete') this.deleteWorkout(id);
    };
  },

  async changeWeek(delta) {
    this.currentWeekStart = Utils.addDays(this.currentWeekStart, delta);
    const weekDates = Utils.getWeekDates(this.currentWeekStart);
    if (!weekDates.includes(this.selectedDate)) {
      this.selectedDate = weekDates[0];
    }
    await this.loadWorkout();
  },

  async deleteWorkout(id) {
    const workout = await Store.workouts.get(id);
    if (!workout) return;
    const confirmed = await UI.showConfirm({
      title: '删除训练计划',
      message: `确定要删除「${workout.name}」吗？`,
      confirmText: '删除',
      danger: true
    });
    if (confirmed) {
      await Store.workouts.delete(id);
      UI.showToast('训练计划已删除');
      await this.loadWorkout();
    }
  },

  async copyWorkout(id) {
    await Store.workouts.copyToNextWeek(id);
    UI.showToast('已复制到下周');
    await this.loadWorkout();
  },

  async editWorkout(id) {
    const workout = await Store.workouts.get(id);
    if (!workout) return;
    this.showWorkoutModal(workout);
  },

  showWorkoutModal(existingWorkout = null) {
    const isEdit = !!existingWorkout;
    const workout = existingWorkout || {
      name: '',
      date: this.selectedDate,
      exercises: [{ name: '', sets: 3, reps: '10', weight: '' }],
      notes: ''
    };

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">训练名称 *</label>
        <input type="text" class="form-input" id="workoutName" value="${this.escapeHtml(workout.name)}" placeholder="如：胸部训练" />
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input type="date" class="form-input" id="workoutDate" value="${workout.date}" />
      </div>
      <div class="form-group">
        <label class="form-label">动作列表</label>
        <div id="exerciseList">
          ${workout.exercises.map((ex, i) => this.renderExerciseRow(ex, i)).join('')}
        </div>
        <button class="btn btn-ghost btn-sm mt-sm" id="addExerciseBtn">+ 添加动作</button>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="workoutNotes" placeholder="可选">${this.escapeHtml(workout.notes)}</textarea>
      </div>
    `;

    let exerciseCount = workout.exercises.length;

    const addExerciseRow = () => {
      const list = content.querySelector('#exerciseList');
      const row = document.createElement('div');
      row.innerHTML = this.renderExerciseRow({ name: '', sets: 3, reps: '10', weight: '' }, exerciseCount);
      list.appendChild(row);
      exerciseCount++;
      this.bindExerciseRowEvents(content);
    };

    content.querySelector('#addExerciseBtn').onclick = addExerciseRow;
    this.bindExerciseRowEvents(content);

    const footer = document.createElement('div');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = '取消';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = isEdit ? '保存修改' : '添加训练';
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    const { overlay } = UI.showModal({
      title: isEdit ? '编辑训练' : '新建训练',
      content,
      footer
    });

    const close = () => UI.closeModal(overlay);
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const name = content.querySelector('#workoutName').value.trim();
      const date = content.querySelector('#workoutDate').value;
      const notes = content.querySelector('#workoutNotes').value.trim();

      if (!name) {
        UI.showToast('请输入训练名称', 'error');
        return;
      }

      const exercises = [];
      content.querySelectorAll('.exercise-row').forEach(row => {
        const exName = row.querySelector('.ex-name').value.trim();
        if (exName) {
          exercises.push({
            name: exName,
            sets: parseInt(row.querySelector('.ex-sets').value) || 3,
            reps: row.querySelector('.ex-reps').value.trim() || '10',
            weight: row.querySelector('.ex-weight').value.trim()
          });
        }
      });

      const data = { name, date, exercises, notes };

      if (isEdit) {
        await Store.workouts.update(existingWorkout.id, data);
        UI.showToast('训练已更新');
      } else {
        await Store.workouts.add(data);
        UI.showToast('训练已添加');
      }

      close();
      this.selectedDate = date;
      await this.loadWorkout();
    };
  },

  renderExerciseRow(ex, index) {
    return `
      <div class="exercise-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
        <input type="text" class="form-input ex-name" placeholder="动作名称" value="${this.escapeHtml(ex.name)}" style="flex:2;" />
        <input type="number" class="form-input ex-sets" placeholder="组" value="${ex.sets}" style="flex:1; min-width:50px;" />
        <input type="text" class="form-input ex-reps" placeholder="次" value="${ex.reps}" style="flex:1; min-width:50px;" />
        <input type="text" class="form-input ex-weight" placeholder="kg" value="${ex.weight || ''}" style="flex:1; min-width:60px;" />
        <button class="btn btn-icon btn-sm remove-exercise" style="color:var(--danger);">✕</button>
      </div>
    `;
  },

  bindExerciseRowEvents(content) {
    content.querySelectorAll('.remove-exercise').forEach(btn => {
      btn.onclick = (e) => {
        e.target.closest('.exercise-row').remove();
      };
    });
  },

  async startWorkout(id) {
    const workout = await Store.workouts.get(id);
    if (!workout) return;

    this.activeWorkout = {
      planId: id,
      name: workout.name,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        actualSets: []
      })),
      currentExercise: 0,
      currentSet: 1,
      startTime: Date.now()
    };

    this.renderActiveWorkout();
  },

  renderActiveWorkout() {
    const aw = this.activeWorkout;
    if (!aw) return;

    const ex = aw.exercises[aw.currentExercise];
    const totalExercises = aw.exercises.length;

    let overlay = document.getElementById('workoutActiveOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'workoutActiveOverlay';
      overlay.className = 'workout-active-overlay';
      document.body.appendChild(overlay);
    }

    const isResting = this.restSeconds > 0;

    overlay.innerHTML = `
      <div class="workout-active-header">
        <div>
          <div style="font-size:14px; opacity:0.7;">${aw.name}</div>
          <div style="font-size:20px; font-weight:600;">动作 ${aw.currentExercise + 1}/${totalExercises}</div>
        </div>
        <button class="btn btn-ghost" id="endWorkoutBtn" style="color:#fff; border-color:rgba(255,255,255,0.3);">结束训练</button>
      </div>

      <div class="workout-active-exercise">
        ${isResting ? `
          <div class="rest-timer">${this.restSeconds}</div>
          <div style="font-size:18px; margin-top:16px; opacity:0.8;">休息中...</div>
          <button class="btn btn-primary btn-lg mt-md" id="skipRestBtn">跳过休息</button>
        ` : `
          <div class="workout-active-name">${this.escapeHtml(ex.name)}</div>
          <div class="workout-active-set">第 ${aw.currentSet} 组 / 共 ${ex.sets} 组</div>
          <div style="font-size:18px; opacity:0.8; margin-bottom:24px;">目标：${ex.reps}次${ex.weight ? ` · ${ex.weight}kg` : ''}</div>
          <button class="btn btn-success btn-lg" id="completeSetBtn">✓ 完成这一组</button>
        `}
      </div>
    `;

    // 绑定事件
    document.getElementById('endWorkoutBtn').onclick = () => this.endWorkout(false);

    if (isResting) {
      document.getElementById('skipRestBtn').onclick = () => {
        this.stopRestTimer();
        this.restSeconds = 0;
        this.renderActiveWorkout();
      };
    } else {
      document.getElementById('completeSetBtn').onclick = () => this.completeSet();
    }
  },

  completeSet() {
    const aw = this.activeWorkout;
    const ex = aw.exercises[aw.currentExercise];

    ex.actualSets.push({
      set: aw.currentSet,
      completed: true
    });

    if (aw.currentSet < ex.sets) {
      aw.currentSet++;
      this.startRestTimer();
    } else if (aw.currentExercise < aw.exercises.length - 1) {
      aw.currentExercise++;
      aw.currentSet = 1;
      this.startRestTimer();
    } else {
      this.endWorkout(true);
    }
  },

  async startRestTimer() {
    const restSeconds = await Store.settings.get('restSeconds') || 90;
    this.restSeconds = restSeconds;
    this.renderActiveWorkout();

    this.restTimer = setInterval(() => {
      this.restSeconds--;
      if (this.restSeconds <= 0) {
        this.stopRestTimer();
        this.restSeconds = 0;
        this.renderActiveWorkout();
      } else {
        const timerEl = document.querySelector('.rest-timer');
        if (timerEl) timerEl.textContent = this.restSeconds;
      }
    }, 1000);
  },

  stopRestTimer() {
    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }
  },

  async endWorkout(completed) {
    this.stopRestTimer();
    const aw = this.activeWorkout;
    if (!aw) return;

    const duration = Math.round((Date.now() - aw.startTime) / 60000);
    const totalSets = aw.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSets = aw.exercises.reduce((sum, ex) => sum + ex.actualSets.length, 0);
    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    await Store.workoutRecords.add({
      planId: aw.planId,
      date: Utils.today(),
      name: aw.name,
      duration,
      exercises: aw.exercises,
      completionRate
    });

    const overlay = document.getElementById('workoutActiveOverlay');
    if (overlay) overlay.remove();

    this.activeWorkout = null;
    UI.showToast(completed ? '训练完成！太棒了 💪' : '训练已结束');
    await this.loadWorkout();
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkoutPage;
}
