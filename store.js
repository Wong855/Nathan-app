/**
 * 数据 Store 层 - 各模块数据操作 API
 */
const Store = {
  // ===== 设置 =====
  settings: {
    defaults: {
      theme: 'light',
      dailyCalories: 1800,
      dailyCarbs: 200,
      dailyProtein: 120,
      dailyFat: 60,
      monthlyBudget: 8000,
      restSeconds: 90,
      currency: 'HKD',
      userName: '文隽'
    },

    async initDefaults() {
      for (const [key, value] of Object.entries(this.defaults)) {
        const existing = await DB.get('settings', key);
        if (!existing) {
          await DB.put('settings', { key, value });
        }
      }
    },

    async get(key) {
      const item = await DB.get('settings', key);
      return item ? item.value : this.defaults[key];
    },

    async set(key, value) {
      await DB.put('settings', { key, value });
    },

    async getAll() {
      const all = await DB.getAll('settings');
      const result = {};
      for (const item of all) {
        result[item.key] = item.value;
      }
      return result;
    }
  },

  // ===== 任务 =====
  tasks: {
    async add(data) {
      const task = {
        id: Utils.uuid(),
        title: data.title,
        note: data.note || '',
        priority: data.priority || 'medium',
        isCompleted: false,
        dueDate: data.dueDate || Utils.today(),
        dueTime: data.dueTime || '',
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      await DB.add('tasks', task);
      return task;
    },

    async update(id, data) {
      const existing = await DB.get('tasks', id);
      if (!existing) throw new Error('任务不存在');
      const updated = { ...existing, ...data };
      await DB.put('tasks', updated);
      return updated;
    },

    async delete(id) {
      await DB.delete('tasks', id);
    },

    async get(id) {
      return DB.get('tasks', id);
    },

    async getAll() {
      return DB.getAll('tasks');
    },

    async getByDate(date) {
      const all = await DB.getAll('tasks');
      return all.filter(t => t.dueDate === date);
    },

    async getToday() {
      return this.getByDate(Utils.today());
    },

    async toggleComplete(id) {
      const task = await DB.get('tasks', id);
      if (!task) throw new Error('任务不存在');
      task.isCompleted = !task.isCompleted;
      task.completedAt = task.isCompleted ? new Date().toISOString() : null;
      await DB.put('tasks', task);
      return task;
    },

    async getStatsByDate(date) {
      const tasks = await this.getByDate(date);
      const total = tasks.length;
      const completed = tasks.filter(t => t.isCompleted).length;
      return { total, completed, pending: total - completed };
    }
  },

  // ===== 健身计划 =====
  workouts: {
    async add(data) {
      const workout = {
        id: Utils.uuid(),
        date: data.date,
        name: data.name,
        exercises: data.exercises || [],
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      };
      await DB.add('workouts', workout);
      return workout;
    },

    async update(id, data) {
      const existing = await DB.get('workouts', id);
      if (!existing) throw new Error('训练计划不存在');
      const updated = { ...existing, ...data };
      await DB.put('workouts', updated);
      return updated;
    },

    async delete(id) {
      await DB.delete('workouts', id);
    },

    async get(id) {
      return DB.get('workouts', id);
    },

    async getByDate(date) {
      const all = await DB.getAll('workouts');
      return all.filter(w => w.date === date);
    },

    async getWeek(dateStr) {
      const weekDates = Utils.getWeekDates(dateStr);
      const all = await DB.getAll('workouts');
      return all.filter(w => weekDates.includes(w.date));
    },

    async getAll() {
      return DB.getAll('workouts');
    },

    async copyToNextWeek(id) {
      const workout = await DB.get('workouts', id);
      if (!workout) throw new Error('训练计划不存在');
      const nextWeekDate = Utils.addDays(workout.date, 7);
      return this.add({
        date: nextWeekDate,
        name: workout.name,
        exercises: JSON.parse(JSON.stringify(workout.exercises)),
        notes: workout.notes
      });
    }
  },

  // ===== 健身记录 =====
  workoutRecords: {
    async add(data) {
      const record = {
        id: Utils.uuid(),
        planId: data.planId || '',
        date: data.date || Utils.today(),
        name: data.name || '',
        duration: data.duration || 0,
        exercises: data.exercises || [],
        completionRate: data.completionRate || 0,
        createdAt: new Date().toISOString()
      };
      await DB.add('workout_records', record);
      return record;
    },

    async get(id) {
      return DB.get('workout_records', id);
    },

    async getAll() {
      const all = await DB.getAll('workout_records');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getByDate(date) {
      const all = await DB.getAll('workout_records');
      return all.filter(r => r.date === date);
    },

    async getRecent(limit = 10) {
      const all = await this.getAll();
      return all.slice(0, limit);
    }
  },

  // ===== 饮食 =====
  meals: {
    async add(data) {
      const meal = {
        id: Utils.uuid(),
        date: data.date || Utils.today(),
        mealType: data.mealType,
        foods: data.foods || [],
        createdAt: new Date().toISOString()
      };
      await DB.add('meals', meal);
      return meal;
    },

    async update(id, data) {
      const existing = await DB.get('meals', id);
      if (!existing) throw new Error('饮食记录不存在');
      const updated = { ...existing, ...data };
      await DB.put('meals', updated);
      return updated;
    },

    async delete(id) {
      await DB.delete('meals', id);
    },

    async get(id) {
      return DB.get('meals', id);
    },

    async getByDate(date) {
      const all = await DB.getAll('meals');
      return all.filter(m => m.date === date);
    },

    async getByDateAndMealType(date, mealType) {
      const all = await DB.getAll('meals');
      return all.filter(m => m.date === date && m.mealType === mealType);
    },

    async getAll() {
      return DB.getAll('meals');
    },

    /**
     * 获取某天的饮食汇总（按餐次分组）
     */
    async getDaySummary(date) {
      const meals = await this.getByDate(date);
      const result = { breakfast: [], lunch: [], dinner: [], snack: [] };
      let totalCalories = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;

      for (const meal of meals) {
        if (result[meal.mealType]) {
          result[meal.mealType].push(meal);
        }
        for (const food of meal.foods) {
          totalCalories += Number(food.calories) || 0;
          totalCarbs += Number(food.carbs) || 0;
          totalProtein += Number(food.protein) || 0;
          totalFat += Number(food.fat) || 0;
        }
      }

      return {
        meals: result,
        totals: {
          calories: Math.round(totalCalories),
          carbs: Math.round(totalCarbs * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10
        }
      };
    },

    /**
     * 添加食物到某餐
     */
    async addFood(mealId, food) {
      const meal = await DB.get('meals', mealId);
      if (!meal) throw new Error('餐次不存在');
      const foodItem = {
        id: Utils.uuid(),
        name: food.name,
        amount: food.amount || '',
        calories: Number(food.calories) || 0,
        carbs: Number(food.carbs) || 0,
        protein: Number(food.protein) || 0,
        fat: Number(food.fat) || 0
      };
      meal.foods.push(foodItem);
      await DB.put('meals', meal);
      return foodItem;
    },

    /**
     * 删除食物
     */
    async removeFood(mealId, foodId) {
      const meal = await DB.get('meals', mealId);
      if (!meal) throw new Error('餐次不存在');
      meal.foods = meal.foods.filter(f => f.id !== foodId);
      await DB.put('meals', meal);
    }
  },

  // ===== 常用食物 =====
  commonFoods: {
    async add(data) {
      const food = {
        id: Utils.uuid(),
        name: data.name,
        amount: data.amount || '',
        calories: Number(data.calories) || 0,
        carbs: Number(data.carbs) || 0,
        protein: Number(data.protein) || 0,
        fat: Number(data.fat) || 0,
        createdAt: new Date().toISOString()
      };
      await DB.add('common_foods', food);
      return food;
    },

    async getAll() {
      return DB.getAll('common_foods');
    },

    async delete(id) {
      await DB.delete('common_foods', id);
    }
  },

  // ===== 记账 =====
  expenses: {
    categories: {
      expense: [
        { id: 'food', name: '餐饮', icon: '🍜' },
        { id: 'transport', name: '交通', icon: '🚇' },
        { id: 'shopping', name: '购物', icon: '🛍️' },
        { id: 'medical', name: '医疗', icon: '🏥' },
        { id: 'entertainment', name: '娱乐', icon: '🎮' },
        { id: 'housing', name: '居住', icon: '🏠' },
        { id: 'other_expense', name: '其他', icon: '📦' }
      ],
      income: [
        { id: 'salary', name: '工资', icon: '💰' },
        { id: 'parttime', name: '兼职', icon: '💼' },
        { id: 'other_income', name: '其他收入', icon: '📈' }
      ]
    },

    async add(data) {
      const expense = {
        id: Utils.uuid(),
        type: data.type, // 'income' or 'expense'
        amount: Number(data.amount) || 0,
        category: data.category,
        note: data.note || '',
        date: data.date || Utils.today(),
        time: data.time || Utils.nowTime(),
        createdAt: new Date().toISOString()
      };
      await DB.add('expenses', expense);
      return expense;
    },

    async update(id, data) {
      const existing = await DB.get('expenses', id);
      if (!existing) throw new Error('记录不存在');
      const updated = { ...existing, ...data };
      if (data.amount !== undefined) updated.amount = Number(data.amount);
      await DB.put('expenses', updated);
      return updated;
    },

    async delete(id) {
      await DB.delete('expenses', id);
    },

    async get(id) {
      return DB.get('expenses', id);
    },

    async getAll() {
      const all = await DB.getAll('expenses');
      return all.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
    },

    async getByMonth(year, month) {
      const all = await this.getAll();
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return all.filter(e => e.date.startsWith(prefix));
    },

    async getMonthStats(year, month) {
      const items = await this.getByMonth(year, month);
      let income = 0, expense = 0;
      const categoryStats = {};

      for (const item of items) {
        if (item.type === 'income') {
          income += item.amount;
        } else {
          expense += item.amount;
          categoryStats[item.category] = (categoryStats[item.category] || 0) + item.amount;
        }
      }

      return {
        income,
        expense,
        balance: income - expense,
        count: items.length,
        categoryStats
      };
    },

    async getRecentMonths(months = 6) {
      const result = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const stats = await this.getMonthStats(d.getFullYear(), d.getMonth() + 1);
        result.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: `${d.getMonth() + 1}月`,
          income: stats.income,
          expense: stats.expense
        });
      }
      return result;
    },

    getCategoryInfo(categoryId) {
      const all = [...this.categories.expense, ...this.categories.income];
      return all.find(c => c.id === categoryId) || { name: categoryId, icon: '📦' };
    }
  },

  // ===== 快速备忘 =====
  quickNote: {
    async get() {
      const item = await DB.get('quick_note', 'note');
      return item ? item.value : '';
    },

    async set(content) {
      await DB.put('quick_note', { key: 'note', value: content, updatedAt: new Date().toISOString() });
    }
  },

  // ===== 数据管理 =====
  data: {
    async exportAll() {
      return DB.exportAll();
    },

    async importAll(data) {
      return DB.importAll(data);
    },

    async clearAll() {
      await DB.clearAll();
      await Store.settings.initDefaults();
    },

    async getStats() {
      return DB.getStats();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
