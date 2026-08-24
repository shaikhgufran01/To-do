const { createApp } = Vue;

createApp({
  data() {
    return {
      // Auth state
      user: null,
      loading: true,
      authMode: 'login',
      authUsername: '',
      authPassword: '',
      authError: null,

      // Theme
      theme: localStorage.getItem('theme') || 'dark',

      // Change Password
      showPasswordModal: false,
      currentPassword: '',
      newPassword: '',
      passwordMsg: '',
      passwordError: '',

      // App state
      todos: [],
      
      // Add Form
      name: "",
      description: "",
      dueDate: "",
      category: "General",
      priority: "Medium",
      
      // Search and Filters
      searchQuery: "",
      filterCategory: "",
      filterPriority: "",
      sortType: "date",

      // Edit state
      editId: null,
      editName: "",
      editCategory: "",
      editPriority: ""
    };
  },

  mounted() {
    this.applyTheme();
    this.checkAuth();
  },

  computed: {
    filteredTodos() {
      let result = this.todos.slice();

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(t => 
          t.name.toLowerCase().includes(query) || 
          (t.description && t.description.toLowerCase().includes(query))
        );
      }

      if (this.filterCategory) {
        result = result.filter(t => t.category === this.filterCategory);
      }

      if (this.filterPriority) {
        result = result.filter(t => t.priority === this.filterPriority);
      }

      if (this.sortType === "date") {
        result.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      } else if (this.sortType === "status") {
        result.sort((a, b) => {
           if(a.status === b.status) return 0;
           return a.status === 'completed' ? 1 : -1;
        });
      }

      return result;
    },
    
    uniqueCategories() {
      const categories = new Set(this.todos.map(t => t.category).filter(Boolean));
      return Array.from(categories).sort();
    },

    // Dashboard Stats
    totalCount() {
      return this.todos.length;
    },
    pendingCount() {
      return this.todos.filter(t => t.status === 'pending' && !this.isOverdue(t)).length;
    },
    completedCount() {
      return this.todos.filter(t => t.status === 'completed').length;
    },
    overdueCount() {
      return this.todos.filter(t => this.isOverdue(t)).length;
    }
  },

  methods: {
    // --- Theme ---
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.theme);
      this.applyTheme();
    },

    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme);
    },

    // --- Auth Methods ---
    async checkAuth() {
      try {
        const res = await axios.get('/auth/me');
        this.user = res.data.user;
        if (this.user) {
          this.fetchTodos();
        }
      } catch (err) {
        this.user = null;
      } finally {
        this.loading = false;
      }
    },

    async submitAuth() {
      this.authError = null;
      if (!this.authUsername || !this.authPassword) {
        this.authError = "Username and password are required.";
        return;
      }

      try {
        const endpoint = this.authMode === 'login' ? '/auth/login' : '/auth/register';
        const res = await axios.post(endpoint, {
          username: this.authUsername,
          password: this.authPassword
        });

        this.user = res.data.user;
        this.authUsername = '';
        this.authPassword = '';
        this.fetchTodos();
      } catch (err) {
        this.authError = err.response?.data?.error || "An error occurred.";
      }
    },

    async logout() {
      try {
        await axios.post('/auth/logout');
        this.user = null;
        this.todos = [];
        this.authMode = 'login';
      } catch (err) {
        console.error("Logout failed", err);
      }
    },

    // --- Change Password ---
    openPasswordModal() {
      this.showPasswordModal = true;
      this.currentPassword = '';
      this.newPassword = '';
      this.passwordMsg = '';
      this.passwordError = '';
    },

    closePasswordModal() {
      this.showPasswordModal = false;
    },

    async changePassword() {
      this.passwordMsg = '';
      this.passwordError = '';

      if (!this.currentPassword || !this.newPassword) {
        this.passwordError = "Both fields are required.";
        return;
      }

      try {
        const res = await axios.post('/auth/change-password', {
          current_password: this.currentPassword,
          new_password: this.newPassword
        });
        this.passwordMsg = res.data.message;
        this.currentPassword = '';
        this.newPassword = '';
        setTimeout(() => this.closePasswordModal(), 1500);
      } catch (err) {
        this.passwordError = err.response?.data?.error || "Failed to change password.";
      }
    },

    // --- Todo Methods ---
    async fetchTodos() {
      try {
        const res = await axios.get("/todos");
        this.todos = res.data;
        localStorage.setItem(`todos_backup_${this.user.id}`, JSON.stringify(this.todos));
      } catch (err) {
        console.error("Failed to fetch todos from server, loading backup");
        if (this.user) {
          const backup = localStorage.getItem(`todos_backup_${this.user.id}`);
          if (backup) {
            this.todos = JSON.parse(backup);
          }
        }
      }
    },

    async addTodo() {
      if (!this.name) return alert("Task name is required");

      try {
        await axios.post("/todos", {
          name: this.name,
          description: this.description,
          due_date: this.dueDate,
          category: this.category,
          priority: this.priority
        });

        this.name = "";
        this.description = "";
        this.dueDate = "";
        this.category = "General";
        this.priority = "Medium";
        this.fetchTodos();
      } catch (err) {
        alert(err.response?.data?.error || "Failed to add todo");
      }
    },

    async deleteTodo(id) {
      try {
        await axios.delete(`/todos/${id}`);
        this.fetchTodos();
      } catch (err) {
        alert("Failed to delete todo");
      }
    },

    async toggleStatus(todo) {
      try {
        await axios.put(`/todos/${todo.id}`, { status: todo.status });
      } catch (err) {
        alert("Failed to update status");
      }
    },

    startEdit(todo) {
      this.editId = todo.id;
      this.editName = todo.name;
      this.editCategory = todo.category || 'General';
      this.editPriority = todo.priority || 'Medium';
    },

    async saveEdit(todo) {
      if (!this.editName) { this.editId = null; return; }
      try {
        await axios.put(`/todos/${todo.id}`, {
          name: this.editName,
          category: this.editCategory,
          priority: this.editPriority
        });
        this.editId = null;
        this.fetchTodos();
      } catch (err) {
        alert("Failed to update todo");
      }
    },

    formatDate(date) {
      if (!date) return "No date";
      return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },

    isOverdue(todo) {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      const today = new Date();
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return dueDate < today && todo.status !== "completed";
    },

    isDueToday(todo) {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      const today = new Date();
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && todo.status !== "completed";
    },

    async importBackup(event) {
      if (!this.user) return;
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedTodos = JSON.parse(e.target.result);
          if (!Array.isArray(importedTodos)) throw new Error("Invalid format");
          
          let successCount = 0;
          for (let todo of importedTodos) {
            try {
              await axios.post("/todos", {
                name: todo.name,
                description: todo.description,
                due_date: todo.due_date,
                category: todo.category || 'General',
                priority: todo.priority || 'Medium',
                status: todo.status || 'pending'
              });
              successCount++;
            } catch (err) {
              console.error("Failed to import todo", todo.name);
            }
          }
          
          alert(`Successfully imported ${successCount} tasks!`);
          this.fetchTodos();
        } catch (err) {
          alert("Error parsing backup file. Make sure it's a valid JSON.");
        }
        
        event.target.value = '';
      };
      reader.readAsText(file);
    },

    exportBackup() {
      if (!this.user) return;
      const data = localStorage.getItem(`todos_backup_${this.user.id}`);

      if (!data) {
        alert("No backup found!");
        return;
      }

      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `todos_backup_${this.user.username}.json`;
      a.click();

      URL.revokeObjectURL(url);
    }
  }
}).mount("#app");
