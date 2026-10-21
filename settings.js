/**
 * 数据与设置模块
 */
const SettingsPage = {
  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">数据与设置</h1>
          <p class="page-subtitle">管理你的数据和个人偏好</p>
        </div>
        <div id="settingsContent">加载中...</div>
      </div>
    `;
    await this.loadSettings();
  },

  async loadSettings() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    const theme = await Store.settings.get('theme');
    const dailyCalories = await Store.settings.get('dailyCalories');
    const dailyCarbs = await Store.settings.get('dailyCarbs');
    const dailyProtein = await Store.settings.get('dailyProtein');
    const dailyFat = await Store.settings.get('dailyFat');
    const monthlyBudget = await Store.settings.get('monthlyBudget');
    const restSeconds = await Store.settings.get('restSeconds');
    const stats = await Store.data.getStats();

    const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

    content.innerHTML = `
      <!-- 数据管理 -->
      <div class="settings-section">
        <div class="settings-section-title">📦 数据管理</div>
        <div class="card">
          <div style="margin-bottom:16px; font-size:13px; color:var(--text-muted);">
            当前共 ${totalRecords} 条数据记录
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">导出全部数据</div>
              <div class="settings-item-value">备份为 JSON 文件</div>
            </div>
            <button class="btn btn-primary btn-sm" id="exportBtn">导出 →</button>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">从文件恢复数据</div>
              <div class="settings-item-value">将覆盖当前所有数据</div>
            </div>
            <button class="btn btn-ghost btn-sm" id="importBtn">导入 →</button>
            <input type="file" id="importFileInput" accept=".json" style="display:none;" />
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-item-label settings-danger-btn">清空全部数据</div>
              <div class="settings-item-value">不可恢复，请先导出备份</div>
            </div>
            <button class="btn btn-danger btn-sm" id="clearBtn">清空</button>
          </div>
        </div>
      </div>

      <!-- 外观 -->
      <div class="settings-section">
        <div class="settings-section-title">🎨 外观</div>
        <div class="card">
          <div class="settings-item">
            <div class="settings-item-label">主题模式</div>
            <div class="segmented" id="themeSegmented" style="width:200px;">
              <div class="segmented-item ${theme === 'light' ? 'active' : ''}" data-theme="light">浅色</div>
              <div class="segmented-item ${theme === 'dark' ? 'active' : ''}" data-theme="dark">深色</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 个人目标 -->
      <div class="settings-section">
        <div class="settings-section-title">🎯 个人目标</div>
        <div class="card">
          <div class="settings-item">
            <div class="settings-item-label">每日热量目标</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" class="form-input" id="caloriesInput" value="${dailyCalories}" style="width:100px; text-align:right;" />
              <span class="text-muted">千卡</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">每日碳水目标</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" class="form-input" id="carbsInput" value="${dailyCarbs}" style="width:100px; text-align:right;" />
              <span class="text-muted">克</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">每日蛋白目标</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" class="form-input" id="proteinInput" value="${dailyProtein}" style="width:100px; text-align:right;" />
              <span class="text-muted">克</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">每日脂肪目标</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" class="form-input" id="fatInput" value="${dailyFat}" style="width:100px; text-align:right;" />
              <span class="text-muted">克</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">月度预算</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="text-muted">HK$</span>
              <input type="number" class="form-input" id="budgetInput" value="${monthlyBudget}" style="width:120px; text-align:right;" />
            </div>
          </div>
        </div>
      </div>

      <!-- 通用 -->
      <div class="settings-section">
        <div class="settings-section-title">⚙️ 通用</div>
        <div class="card">
          <div class="settings-item">
            <div class="settings-item-label">健身组间休息</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" class="form-input" id="restInput" value="${restSeconds}" style="width:100px; text-align:right;" />
              <span class="text-muted">秒</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">默认币种</div>
            <div class="settings-item-value">港币 HKD</div>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ 关于</div>
        <div class="card">
          <div class="about-version">
            <div style="font-size:18px; font-weight:700; margin-bottom:4px;">生活助手</div>
            <div>版本 1.0.0</div>
            <div style="margin-top:8px;">📱 数据仅存储在此设备</div>
            <div style="margin-top:4px;">🔒 无需登录，无需联网</div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    // 导出
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.onclick = () => this.exportData();

    // 导入
    const importBtn = document.getElementById('importBtn');
    const fileInput = document.getElementById('importFileInput');
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => this.importData(e.target.files[0]);
    }

    // 清空
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.onclick = () => this.clearData();

    // 主题切换
    content.querySelectorAll('#themeSegmented .segmented-item').forEach(item => {
      item.onclick = async () => {
        content.querySelectorAll('#themeSegmented .segmented-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const theme = item.dataset.theme;
        await Store.settings.set('theme', theme);
        App.setTheme(theme);
        UI.showToast('主题已切换');
      };
    });

    // 数值设置自动保存
    const inputs = [
      { id: 'caloriesInput', key: 'dailyCalories' },
      { id: 'carbsInput', key: 'dailyCarbs' },
      { id: 'proteinInput', key: 'dailyProtein' },
      { id: 'fatInput', key: 'dailyFat' },
      { id: 'budgetInput', key: 'monthlyBudget' },
      { id: 'restInput', key: 'restSeconds' }
    ];

    inputs.forEach(({ id, key }) => {
      const input = document.getElementById(id);
      if (input) {
        input.onchange = async () => {
          const value = Number(input.value) || 0;
          await Store.settings.set(key, value);
          UI.showToast('已保存');
        };
      }
    });
  },

  async exportData() {
    try {
      const exportData = await Store.data.exportAll();
      const dateStr = Utils.formatDate(new Date());
      const filename = `lifehub-backup-${dateStr}.json`;
      Utils.downloadFile(filename, JSON.stringify(exportData, null, 2));
      UI.showToast('数据已导出');
    } catch (e) {
      UI.showToast('导出失败: ' + e.message, 'error');
    }
  },

  async importData(file) {
    if (!file) return;

    try {
      const text = await Utils.readFileAsText(file);
      const data = Utils.safeJsonParse(text);

      if (!data || !data.data || !data.app) {
        UI.showToast('无效的备份文件', 'error');
        return;
      }

      // 显示数据摘要
      const stats = data.data;
      const summary = Object.entries(stats).map(([k, v]) => `${k}: ${v.length}条`).join('、');

      const confirmed = await UI.showConfirm({
        title: '确认导入',
        message: `即将导入以下数据：${summary}。<br><br>这将覆盖当前所有数据，确定继续吗？`,
        confirmText: '确认导入',
        danger: true
      });

      if (confirmed) {
        await Store.data.importAll(data);
        UI.showToast('数据已恢复');
        await this.loadSettings();
      }
    } catch (e) {
      UI.showToast('导入失败: ' + e.message, 'error');
    }
  },

  async clearData() {
    const confirmed = await UI.showInputConfirm({
      title: '清空全部数据',
      message: '此操作不可恢复！将删除所有任务、健身、饮食、记账数据。建议先导出备份。',
      confirmText: '确认清空',
      requiredText: '清空'
    });

    if (confirmed) {
      await Store.data.clearAll();
      UI.showToast('数据已清空');
      await this.loadSettings();
    }
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, c => map[c]);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsPage;
}
