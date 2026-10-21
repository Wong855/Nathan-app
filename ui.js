/**
 * UI 组件库：模态框、Toast、确认框
 */
const UI = {
  /**
   * 显示模态框
   * @param {Object} options - { title, content, footer, onClose }
   * @returns {HTMLElement} 模态框元素
   */
  showModal(options) {
    const { title, content, footer, onClose } = options;
    const container = document.getElementById('modalContainer');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    // 头部
    const header = document.createElement('div');
    header.className = 'modal-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = title || '';
    const closeBtn = document.createElement('div');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.closeModal(overlay);
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // 内容
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    modal.appendChild(header);
    modal.appendChild(body);

    // 底部
    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'modal-footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = footer;
      } else if (footer instanceof HTMLElement) {
        footerEl.appendChild(footer);
      }
      modal.appendChild(footerEl);
    }

    overlay.appendChild(modal);
    container.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal(overlay);
        if (onClose) onClose();
      }
    });

    return { overlay, modal, body };
  },

  /**
   * 关闭模态框
   */
  closeModal(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  },

  /**
   * 关闭所有模态框
   */
  closeAllModals() {
    const container = document.getElementById('modalContainer');
    container.innerHTML = '';
  },

  /**
   * 显示 Toast
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  },

  /**
   * 显示确认框
   * @param {Object} options - { title, message, confirmText, cancelText, danger }
   * @returns {Promise<boolean>}
   */
  showConfirm(options) {
    return new Promise((resolve) => {
      const { title, message, confirmText = '确认', cancelText = '取消', danger = false } = options;

      const content = document.createElement('div');
      content.innerHTML = `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`;

      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '12px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.textContent = cancelText;

      const confirmBtn = document.createElement('button');
      confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
      confirmBtn.textContent = confirmText;

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);

      const { overlay } = this.showModal({
        title: title || '确认',
        content,
        footer
      });

      const close = (result) => {
        this.closeModal(overlay);
        resolve(result);
      };

      cancelBtn.onclick = () => close(false);
      confirmBtn.onclick = () => close(true);
    });
  },

  /**
   * 显示输入确认框（需要输入特定文字才能确认）
   * @param {Object} options - { title, message, confirmText, requiredText }
   * @returns {Promise<boolean>}
   */
  showInputConfirm(options) {
    return new Promise((resolve) => {
      const { title, message, confirmText = '确认', requiredText = '' } = options;

      const content = document.createElement('div');
      content.innerHTML = `
        <p style="color: var(--text-secondary); margin-bottom: 16px;">${message}</p>
        <input type="text" class="form-input" id="inputConfirmField" 
          placeholder="请输入「${requiredText}」以确认" />
      `;

      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '12px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.textContent = '取消';

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-danger';
      confirmBtn.textContent = confirmText;
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);

      const { overlay } = this.showModal({
        title: title || '危险操作确认',
        content,
        footer
      });

      const input = content.querySelector('#inputConfirmField');
      input.addEventListener('input', () => {
        const match = input.value.trim() === requiredText;
        confirmBtn.disabled = !match;
        confirmBtn.style.opacity = match ? '1' : '0.5';
      });

      const close = (result) => {
        this.closeModal(overlay);
        resolve(result);
      };

      cancelBtn.onclick = () => close(false);
      confirmBtn.onclick = () => {
        if (input.value.trim() === requiredText) {
          close(true);
        }
      };

      setTimeout(() => input.focus(), 100);
    });
  },

  /**
   * 创建表单元素辅助
   */
  createFormGroup(label, inputHtml) {
    return `
      <div class="form-group">
        <label class="form-label">${label}</label>
        ${inputHtml}
      </div>
    `;
  },

  /**
   * 渲染空状态
   */
  emptyState(icon, text) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${text}</div>
      </div>
    `;
  }
};

// 导出用于测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
