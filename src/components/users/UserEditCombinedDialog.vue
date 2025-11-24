<template>
  <el-dialog
    v-model="visible"
    title="Редактирование пользователя"
    width="500px"
    @close="handleClose"
  >
    <div v-if="user" class="user-edit-content">
      <!-- Предпросмотр пользователя -->
      <div class="user-preview">
        <el-avatar 
          :size="60" 
          :src="user.photo_url"
        >
          {{ getUserInitials(user) }}
        </el-avatar>
        <div class="user-info">
          <h3>{{ getUserFullName(user) }}</h3>
          <p v-if="user.telegram_id">Telegram ID: {{ user.telegram_id }}</p>
        </div>
      </div>

      <el-divider />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <!-- Никнейм -->
        <el-form-item label="Никнейм" prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="Введите никнейм пользователя"
            clearable
          />
        </el-form-item>

        <!-- Роли -->
        <el-form-item v-if="!user.is_unregistered" label="Роли пользователя">
          <div>
            <el-checkbox-group v-model="form.roles">
              <el-checkbox 
                v-for="role in availableRoles" 
                :key="role.code"
                :value="role.code"
              >
                <span>{{ role.name }}</span>
              </el-checkbox>
            </el-checkbox-group>
            <div v-if="form.roles.length === 0" class="role-hint">
              Выберите хотя бы одну роль
            </div>
          </div>
        </el-form-item>

      </el-form>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="loading"
          :disabled="!hasChanges || form.roles.length === 0"
        >
          Сохранить
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/services/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref(null)
const loading = ref(false)
const loadingRoles = ref(false)

const form = ref({
  nickname: '',
  roles: []
})

const availableRoles = ref([])
const originalData = ref({})

const rules = {
  nickname: [
    { required: true, message: 'Никнейм обязателен', trigger: 'blur' }
  ]
}

const hasChanges = computed(() => {
  if (!props.user) return false
  return form.value.nickname !== originalData.value.nickname || 
         JSON.stringify(form.value.roles.sort()) !== JSON.stringify(originalData.value.roles.sort())
})

watch(() => props.user, (newUser) => {
  if (newUser) {
    // Используем роли из объекта пользователя
    let userRoles = []
    
    // Проверяем наличие ролей в разных форматах
    if (newUser.roles && Array.isArray(newUser.roles)) {
      userRoles = newUser.roles
    } else if (newUser.role) {
      userRoles = [newUser.role]
    }
    
    form.value = {
      nickname: newUser.nickname || '',
      roles: [...userRoles]
    }
    
    // Сохраняем оригинальные данные для сравнения
    originalData.value = {
      nickname: newUser.nickname || '',
      roles: [...userRoles]
    }
  }
}, { immediate: true })

const loadRoles = async () => {
  try {
    loadingRoles.value = true
    const response = await apiService.getRoles()
    availableRoles.value = response
  } catch (error) {
    console.error('Ошибка загрузки ролей:', error)
    ElMessage.error('Не удалось загрузить список ролей')
  } finally {
    loadingRoles.value = false
  }
}

onMounted(() => {
  loadRoles()
})

const getUserFullName = (user) => {
  if (user.nickname) {
    return user.nickname
  }
  const first = user.first_name || ''
  const last = user.last_name || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || 'Без имени'
}

const getUserInitials = (user) => {
  if (user.nickname) {
    // Берем первые две буквы никнейма
    return user.nickname.substring(0, 2).toUpperCase()
  }
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
}

const handleConfirm = async () => {
  if (!formRef.value) return
  if (form.value.roles.length === 0) {
    ElMessage.warning('Выберите хотя бы одну роль')
    return
  }

  try {
    await formRef.value.validate()
    loading.value = true
    
    emit('confirm', {
      userId: props.user.id,
      nickname: form.value.nickname,
      roles: form.value.roles
    })
    
    handleClose()
  } catch (error) {
    console.error('Form validation failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.user-edit-content {
  padding: 10px 0;
}

.user-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.user-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: #303133;
}

.user-info p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
}

.el-checkbox {
  margin-right: 0 !important;
}

.role-hint {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #f56c6c;
  background-color: #fef0f0;
  border-radius: 4px;
  border-left: 3px solid #f56c6c;
}


@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 90% !important;
  }
}
</style>
