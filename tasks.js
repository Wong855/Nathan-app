/**
 * 今日计划模块
 */
const TasksPage = {
  currentDate: Utils.today(),
  showCompleted: false,

  async render(container) {
    this.currentDate = Utils.today();
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">今日计划</h1>
          <p class="page-subtitle">管理你的每日待办事项</p>
        </div>
        <div id="tasksContent">
          <div class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div class="empty-state-text">加载中...</div>
          </div>
        </div>
      </div>
    `;
    await this.loadTasks();
  },

  async loadTasks() {
    const content = document.getElementById('tasksContent');
    if (!content) return;

    const tasks = await Store.tasks.getByDate(this.currentDate);
    const high = tasks.filter(t => t.priority === 'high' && !t.isCompleted);
    const medium = tasks.filter(t => t.priority === 'medium' && !t.isCompleted);
    const low = tasks.filter(t => t.priority === 'low' && !t.isCompleted);
    const completed = tasks.filter(t => t.isCompleted);

    const isToday = Utils.isToday(this.currentDate);
    const dateText = isToday ? '今天' : Utils.formatDateChinese(this.currentDate);

    content.innerHTML = `
      <div class="tasks-header">
        <div class="tasks-date-nav">
          <button class="btn btn-icon" id="prevDayBtn" title="前一天">‹</button>
          <span class="tasks-date-text">${dateText}</span>
          <button class="btn btn-icon" id="nextDayBtn" title="后一天">›</button>
        </div>
        <button class="btn btn-primary" id="addTaskBtn">+ 新任务</button>
      </div>

      <div id="taskList">
        ${this.renderPriorityGroup('高优先级', 'high', high)}
        ${this.renderPriorityGroup('中优先级', 'medium', medium)}
        ${this.renderPriorityGroup('低优先级', 'low', low)}
        ${this.renderCompletedGroup(completed)}
      </div>
    `;

    this.bindEvents();
  },

  renderPriorityGroup(title, priority, tasks) {
    if (tasks.length === 0) return '';
    const color = Utils.getPriorityColor(priority);
    return `
      <div class="priority-group">
        <div class="priority-group-title">
          <span class="priority-dot" style="background: ${color}"></span>
          ${title} (${tasks.length})
        </div>
        ${tasks.map(t => this.renderTaskItem(t)).join('')}
      </div>
    `;
  },

  renderTaskItem(task) {
    const priorityClass = Utils.getPriorityClass(task.priority);
    const priorityText = Utils.getPriorityText(task.priority);
    const timeDisplay = task.dueTime ? `· ${task.dueTime}` : '';
    return `
      <div class="task-item" data-id="${task.id}">
        <div class="checkbox ${task.isCompleted ? 'checked' : ''}" data-action="toggle" data-id="${task.id}"></div>
        <div class="task-content">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge ${priorityClass}">${priorityText}</span>
            ${timeDisplay ? `<span>${timeDisplay}</span>` : ''}
            ${task.note ? `<span>${this.escapeHtml(task.note)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-icon btn-sm" data-action="edit" data-id="${task.id}" title="编辑">✏️</button>
          <button class="btn btn-icon btn-sm" data-action="delete" data-id="${task.id}" title="删除">🗑️</button>
        </div>
      </div>
    `;
  },

  renderCompletedGroup(tasks) {
    if (tasks.length === 0) return '';
    return `
      <div class="completed-group">
        <div class="completed-toggle" id="completedToggle">
          <span>${this.showCompleted ? '▼' : '▶'}</span>
          已完成 (${tasks.length})
        </div>
        <div id="completedList" style="${this.showCompleted ? '' : 'display: none;'}">
          ${tasks.map(t => this.renderTaskItem(t)).join('')}
        </div>
      </div>
    `;
  },

  bindEvents() {
    const content = document.getElementById('tasksContent');
    if (!content) return;

    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');
    if (prevBtn) prevBtn.onclick = () => this.changeDate(-1);
    if (nextBtn) nextBtn.onclick = () => this.changeDate(1);

    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) addBtn.onclick = () => this.showTaskModal();

    const toggle = document.getElementById('completedToggle');
    if (toggle) {
      toggle.onclick = () => {
        this.showCompleted = !this.showCompleted;
        this.loadTasks();
      };
    }

    content.onclick = (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;

      if (action === 'toggle') {
        this.toggleTask(id);
      } else if (action === 'edit') {
        this.editTask(id);
      } else if (action === 'delete') {
        this.deleteTask(id);
      }
    };
  },

  async changeDate(delta) {
    this.currentDate = Utils.addDays(this.currentDate, delta);
    this.showCompleted = false;
    await this.loadTasks();
  },

  async toggleTask(id) {
    await Store.tasks.toggleComplete(id);
    await this.loadTasks();
    UI.showToast('任务状态已更新');
  },

  async deleteTask(id) {
    const task = await Store.tasks.get(id);
    if (!task) return;
    const confirmed = await UI.showConfirm({
      title: '删除任务',
      message: `确定要删除「${task.title}」吗？`,
      confirmText: '删除',
      danger: true
    });
    if (confirmed) {
      await Store.tasks.delete(id);
      await this.loadTasks();
      UI.showToast('任务已删除');
    }
  },

  async editTask(id) {
    const task = await Store.tasks.get(id);
    if (!task) return;
    this.showTaskModal(task);
  },

  showTaskModal(existingTask = null) {
    const isEdit = !!existingTask;
    const task = existingTask || {
      title: '',
      note: '',
      priority: 'medium',
      dueDate: this.currentDate,
      dueTime: ''
    };

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">任务标题 *</label>
        <input type="text" class="form-input" id="taskTitle" value="${this.escapeHtml(task.title)}" placeholder="输入任务内容" />
      </div>
      <div class="form-group">
        <label class="form-label">优先级</label>
        <div class="segmented" id="prioritySegmented">
          <div class="segmented-item ${task.priority === 'high' ? 'active' : ''}" data-value="high">高</div>
          <div class="segmented-item ${task.priority === 'medium' ? 'active' : ''}" data-value="medium">中</div>
          <div class="segmented-item ${task.priority === 'low' ? 'active' : ''}" data-value="low">低</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">日期</label>
          <input type="date" class="form-input" id="taskDate" value="${task.dueDate}" />
        </div>
        <div class="form-group">
          <label class="form-label">时间</label>
          <input type="time" class="form-input" id="taskTime" value="${task.dueTime || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="taskNote" placeholder="可选备注">${this.escapeHtml(task.note)}</textarea>
      </div>
    `;

    let selectedPriority = task.priority;

    const segmented = content.querySelector('#prioritySegmented');
    segmented.querySelectorAll('.segmented-item').forEach(item => {
      item.onclick = () => {
        segmented.querySelectorAll('.segmented-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        selectedPriority = item.dataset.value;
      };
    });

    const footer = document.createElement('div');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = '取消';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = isEdit ? '保存修改' : '添加任务';

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    const { overlay } = UI.showModal({
      title: isEdit ? '编辑任务' : '新建任务',
      content,
      footer
    });

    const close = () => UI.closeModal(overlay);

    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const title = content.querySelector('#taskTitle').value.trim();
      const date = content.querySelector('#taskDate').value;
      const time = content.querySelector('#taskTime').value;
      const note = content.querySelector('#taskNote').value.trim();

      if (!title) {
        UI.showToast('请输入任务标题', 'error');
        return;
      }

      const data = {
        title,
        priority: selectedPriority,
        dueDate: date || this.currentDate,
        dueTime: time,
        note
      };

      if (isEdit) {
        await Store.tasks.update(existingTask.id, data);
        UI.showToast('任务已更新');
      } else {
        await Store.tasks.add(data);
        UI.showToast('任务已添加');
      }

      close();
      this.currentDate = data.dueDate;
      await this.loadTasks();
    };

    setTimeout(() => content.querySelector('#taskTitle').focus(), 100);
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TasksPage;
}
