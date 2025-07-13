<template>
  <el-form 
    ref="formRef"
    :model="form" 
    :rules="rules"
    label-position="top"
    @submit.prevent="handleSubmit"
    >
    <h2 class="form-title">Вход в систему</h2>
    
    <el-form-item label="Email или никнейм" prop="login">
      <el-input 
        v-model="form.login"
        placeholder="Введите email или никнейм"
        size="large"
        :prefix-icon="User"
        />
    </el-form-item>

    <el-form-item label="Пароль" prop="password">
      <el-input 
        v-model="form.password"
        type="password"
        placeholder="Введите пароль"
        size="large"
        show-password
        :prefix-icon="Lock"
        @keyup.enter="handleSubmit"
        />
    </el-form-item>

    <el-form-item>
      <el-checkbox v-model="form.remember">Запомнить меня</el-checkbox>
    </el-form-item>

    <el-form-item>
      <el-button 
        type="primary" 
        size="large"
        :loading="authStore.loading"
        @click="handleSubmit"
        style="width: 100%"
        >
        Войти
      </el-button>
    </el-form-item>

    <div class="form-footer">
      <router-link to="/forgot-password" class="link">
        Забыли пароль?
      </router-link>
      <router-link to="/register" class="link">
        Регистрация
      </router-link>
    </div>

    <!-- Быстрый вход для разработки -->
    <div v-if="isDev" class="dev-quick-login">
      <el-divider>Быстрый вход (dev)</el-divider>
      <div class="quick-login-buttons">
        <el-button 
          size="small" 
          @click="quickLogin('admin')"
          :loading="quickLoginLoading === 'admin'"
          >
          Админ
        </el-button>
        <el-button 
          size="small" 
          @click="quickLogin('player')"
          :loading="quickLoginLoading === 'player'"
          >
          Игрок
        </el-button>
        <el-button 
          size="small" 
          @click="quickLogin('judge')"
          :loading="quickLoginLoading === 'judge'"
          >
          Судья
        </el-button>
      </div>
    </div>
  </el-form>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { ElMessage } from 'element-plus'
  import { User, Lock } from '@element-plus/icons-vue'

  const authStore = useAuthStore()
  const formRef = ref()
  const quickLoginLoading = ref(null)

  const isDev = computed(() => {
    return import.meta.env.DEV
  })

  const form = reactive({
    login: '',
    password: '',
    remember: true
  })

  const rules = {
    login: [
      { required: true, message: 'Введите email или никнейм', trigger: 'blur' },
      { min: 3, message: 'Минимум 3 символа', trigger: 'blur' }
    ],
    password: [
      { required: true, message: 'Введите пароль', trigger: 'blur' },
      { min: 6, message: 'Минимум 6 символов', trigger: 'blur' }
    ]
  }

  const handleSubmit = async () => {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    const result = await authStore.login({
      login: form.login,
      password: form.password,
      remember: form.remember
    })

    if (result.success) {
      ElMessage.success('Вход выполнен успешно!')
    } else {
      ElMessage.error(result.error || 'Ошибка входа')
    }
  }

  // Быстрый вход для разработки
  const quickLogin = async (role) => {
    quickLoginLoading.value = role
    
    const credentials = {
      admin: { login: 'admin@jokermafia.am', password: 'admin123' },
      player: { login: 'player@test.com', password: 'player123' },
      judge: { login: 'judge@test.com', password: 'judge123' }
    }

    const result = await authStore.login({
      ...credentials[role],
      remember: true
    })

    if (!result.success) {
      // Если пользователь не существует, показываем инструкцию
      ElMessage.warning('Создайте тестовых пользователей через DevTools Panel')
    }
    
    quickLoginLoading.value = null
  }
</script>

<style scoped>
  .form-title {
    text-align: center;
    margin: 0 0 24px 0;
    color: #303133;
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
  }

  .link {
    color: #409eff;
    text-decoration: none;
    font-size: 14px;
  }

  .link:hover {
    color: #66b1ff;
  }

  .dev-quick-login {
    margin-top: 24px;
  }

  .quick-login-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
</style>