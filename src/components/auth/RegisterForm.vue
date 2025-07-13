<template>
  <el-form 
    ref="formRef"
    :model="form" 
    :rules="rules"
    label-position="top"
    @submit.prevent="handleSubmit"
    >
    <h2 class="form-title">Регистрация</h2>
    
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="Имя" prop="firstName">
          <el-input 
            v-model="form.firstName"
            placeholder="Введите имя"
            size="large"
            />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="Фамилия" prop="lastName">
          <el-input 
            v-model="form.lastName"
            placeholder="Введите фамилию"
            size="large"
            />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="Никнейм" prop="nickname">
      <el-input 
        v-model="form.nickname"
        placeholder="Выберите уникальный никнейм"
        size="large"
        :prefix-icon="User"
        />
    </el-form-item>

    <el-form-item label="Email" prop="email">
      <el-input 
        v-model="form.email"
        placeholder="example@email.com"
        size="large"
        :prefix-icon="Message"
        />
    </el-form-item>

    <el-form-item label="Телефон" prop="phone">
      <el-input 
        v-model="form.phone"
        placeholder="+7 (999) 123-45-67"
        size="large"
        :prefix-icon="Phone"
        />
    </el-form-item>

    <el-form-item label="Пароль" prop="password">
      <el-input 
        v-model="form.password"
        type="password"
        placeholder="Минимум 6 символов"
        size="large"
        show-password
        :prefix-icon="Lock"
        />
    </el-form-item>

    <el-form-item label="Подтвердите пароль" prop="confirmPassword">
      <el-input 
        v-model="form.confirmPassword"
        type="password"
        placeholder="Повторите пароль"
        size="large"
        show-password
        :prefix-icon="Lock"
        />
    </el-form-item>

    <el-form-item label="Выберите роль" prop="role">
      <el-radio-group v-model="form.role" size="large">
        <el-radio-button value="player">Игрок</el-radio-button>
        <el-radio-button value="judge">Судья</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item prop="agreement">
      <el-checkbox v-model="form.agreement">
        Я согласен с 
        <a href="#" @click.prevent="showTerms">условиями использования</a>
        и 
        <a href="#" @click.prevent="showPrivacy">политикой конфиденциальности</a>
      </el-checkbox>
    </el-form-item>

    <el-form-item>
      <el-button 
        type="primary" 
        size="large"
        :loading="authStore.loading"
        @click="handleSubmit"
        style="width: 100%"
        >
        Зарегистрироваться
      </el-button>
    </el-form-item>

    <div class="form-footer">
      <span>Уже есть аккаунт?</span>
      <router-link to="/login" class="link">
        Войти
      </router-link>
    </div>
  </el-form>
</template>

<script setup>
  import { ref, reactive } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { ElMessage } from 'element-plus'
  import { User, Lock, Message, Phone } from '@element-plus/icons-vue'

  const authStore = useAuthStore()
  const formRef = ref()

  const form = reactive({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'player',
    agreement: false
  })

  const validatePhone = (rule, value, callback) => {
    if (!value) {
      callback(new Error('Введите номер телефона'))
    } else if (!/^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(value)) {
      callback(new Error('Неверный формат телефона'))
    } else {
      callback()
    }
  }

  const validatePassword = (rule, value, callback) => {
    if (value === '') {
      callback(new Error('Введите пароль'))
    } else {
      if (form.confirmPassword !== '') {
        formRef.value.validateField('confirmPassword')
      }
      callback()
    }
  }

  const validateConfirmPassword = (rule, value, callback) => {
    if (value === '') {
      callback(new Error('Подтвердите пароль'))
    } else if (value !== form.password) {
      callback(new Error('Пароли не совпадают'))
    } else {
      callback()
    }
  }

  const rules = {
    firstName: [
      { required: true, message: 'Введите имя', trigger: 'blur' },
      { min: 2, message: 'Минимум 2 символа', trigger: 'blur' }
    ],
    lastName: [
      { required: true, message: 'Введите фамилию', trigger: 'blur' },
      { min: 2, message: 'Минимум 2 символа', trigger: 'blur' }
    ],
    nickname: [
      { required: true, message: 'Введите никнейм', trigger: 'blur' },
      { min: 3, max: 20, message: 'От 3 до 20 символов', trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Только латиница, цифры, _ и -', trigger: 'blur' }
    ],
    email: [
      { required: true, message: 'Введите email', trigger: 'blur' },
      { type: 'email', message: 'Неверный формат email', trigger: 'blur' }
    ],
    phone: [
      { required: true, validator: validatePhone, trigger: 'blur' }
    ],
    password: [
      { required: true, validator: validatePassword, trigger: 'blur' },
      { min: 6, message: 'Минимум 6 символов', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, validator: validateConfirmPassword, trigger: 'blur' }
    ],
    role: [
      { required: true, message: 'Выберите роль', trigger: 'change' }
    ],
    agreement: [
      { 
        validator: (rule, value, callback) => {
          if (!value) {
            callback(new Error('Необходимо принять условия'))
          } else {
            callback()
          }
        },
        trigger: 'change'
      }
    ]
  }

  const handleSubmit = async () => {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    const userData = {
      firstName: form.firstName,
      lastName: form.lastName,
      nickname: form.nickname,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: form.role
    }

    const result = await authStore.register(userData)

    if (result.success) {
      if (result.message) {
        ElMessage.success(result.message)
      } else {
        ElMessage.success('Регистрация успешна!')
      }
    } else {
      ElMessage.error(result.error || 'Ошибка регистрации')
    }
  }

  const showTerms = () => {
    ElMessage.info('Условия использования будут добавлены позже')
  }

  const showPrivacy = () => {
    ElMessage.info('Политика конфиденциальности будет добавлена позже')
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
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
    font-size: 14px;
  }

  .link {
    color: #409eff;
    text-decoration: none;
  }

  .link:hover {
    color: #66b1ff;
  }

  a {
    color: #409eff;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
</style>