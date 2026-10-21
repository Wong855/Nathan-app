/**
 * IndexedDB 封装层
 */
const DB = {
  dbName: 'LifeHubDB',
  dbVersion: 1,
  db: null,

  // 数据库 schema 定义
  stores: {
    tasks: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'dueDate', options: {} },
        { name: 'priority', keyPath: 'priority', options: {} },
        { name: 'isCompleted', keyPath: 'isCompleted', options: {} }
      ]
    },
    workouts: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date', options: {} }
      ]
    },
    workout_records: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date', options: {} },
        { name: 'planId', keyPath: 'planId', options: {} }
      ]
    },
    meals: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date', options: {} },
        { name: 'mealType', keyPath: 'mealType', options: {} }
      ]
    },
    expenses: {
      keyPath: 'id',
      indexes: [
        { name: 'date', keyPath: 'date', options: {} },
        { name: 'type', keyPath: 'type', options: {} },
        { name: 'category', keyPath: 'category', options: {} }
      ]
    },
    settings: {
      keyPath: 'key',
      indexes: []
    },
    common_foods: {
      keyPath: 'id',
      indexes: []
    },
    quick_note: {
      keyPath: 'key',
      indexes: []
    }
  },

  /**
   * 初始化数据库
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      // Node.js 测试环境没有 indexedDB
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB 不可用，使用内存存储');
        this.db = this._createMemoryDB();
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._createStores(db);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * 创建所有 store 和索引
   */
  _createStores(db) {
    for (const [storeName, config] of Object.entries(this.stores)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
        for (const index of config.indexes) {
          store.createIndex(index.name, index.keyPath, index.options);
        }
      }
    }
  },

  /**
   * 内存数据库（用于测试环境）
   */
  _createMemoryDB() {
    const data = {};
    for (const storeName of Object.keys(this.stores)) {
      data[storeName] = new Map();
    }
    return {
      _data: data,
      _isMemory: true
    };
  },

  /**
   * 获取事务
   */
  _getTransaction(storeName, mode = 'readonly') {
    if (this.db._isMemory) {
      return { _memory: true, _storeName: storeName, _mode: mode };
    }
    return this.db.transaction(storeName, mode);
  },

  /**
   * 获取 store
   */
  _getStore(tx, storeName) {
    if (tx._memory) {
      return this.db._data[storeName];
    }
    return tx.objectStore(storeName);
  },

  /**
   * 添加数据
   */
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readwrite');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        const key = data[this.stores[storeName].keyPath];
        store.set(key, { ...data });
        resolve(key);
        return;
      }

      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 更新数据（不存在则添加）
   */
  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readwrite');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        const key = data[this.stores[storeName].keyPath];
        store.set(key, { ...data });
        resolve(key);
        return;
      }

      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 根据 key 获取数据
   */
  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readonly');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        const data = store.get(key);
        resolve(data ? { ...data } : undefined);
        return;
      }

      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取所有数据
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readonly');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        resolve(Array.from(store.values()).map(d => ({ ...d })));
        return;
      }

      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 根据索引查询
   */
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readonly');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        const results = [];
        for (const item of store.values()) {
          if (item[indexName] === value) {
            results.push({ ...item });
          }
        }
        resolve(results);
        return;
      }

      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 删除数据
   */
  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readwrite');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        store.delete(key);
        resolve();
        return;
      }

      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 清空 store
   */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._getTransaction(storeName, 'readwrite');
      const store = this._getStore(tx, storeName);

      if (tx._memory) {
        store.clear();
        resolve();
        return;
      }

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 清空所有 store
   */
  async clearAll() {
    for (const storeName of Object.keys(this.stores)) {
      await this.clear(storeName);
    }
  },

  /**
   * 批量添加
   */
  async bulkAdd(storeName, items) {
    for (const item of items) {
      await this.add(storeName, item);
    }
  },

  /**
   * 导出所有数据
   */
  async exportAll() {
    const result = {};
    for (const storeName of Object.keys(this.stores)) {
      result[storeName] = await this.getAll(storeName);
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'LifeHub',
      data: result
    };
  },

  /**
   * 导入所有数据（覆盖）
   */
  async importAll(exportData) {
    if (!exportData || !exportData.data) {
      throw new Error('无效的备份文件格式');
    }
    for (const [storeName, items] of Object.entries(exportData.data)) {
      if (this.stores[storeName]) {
        await this.clear(storeName);
        for (const item of items) {
          await this.put(storeName, item);
        }
      }
    }
  },

  /**
   * 获取数据统计
   */
  async getStats() {
    const stats = {};
    for (const storeName of Object.keys(this.stores)) {
      const all = await this.getAll(storeName);
      stats[storeName] = all.length;
    }
    return stats;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DB;
}
