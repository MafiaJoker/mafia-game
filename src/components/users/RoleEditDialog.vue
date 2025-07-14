<template>
  <el-dialog
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    title="Изменить роль пользователя"
    width="400px"
    :close-on-click-modal="false"
  >
    <div v-if="user" class="role-edit-content">
      <div class="user-preview">
        <el-avatar 
          :size="60" 
          :src="user.photo_url"
        >
          {{ getUserInitials(user) }}
        </el-avatar>
        <div class="user-info">
          <h3>{{ getUserFullName(user) }}</h3>
          <p v-if="user.nickname">@{{ user.nickname }}</p>
        </div>
      </div>

      <el-divider />

      <el-form label-position="top">
        <el-form-item label="Роль пользователя">
          <el-select 
            v-model="selectedRole" 
            placeholder="Выберите роль"
            style="width: 100%"
          >
            <el-option
              v-for="role in roles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            >
              <div class="role-option">
                <el-tag :type="role.type" size="small">
                  {{ role.label }}
                </el-tag>
                <span class="role-description">{{ role.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">
        Отмена
      </el-button>
      <el-button 
        type="primary" 
        @click="handleConfirm"
        :disabled="!selectedRole || selectedRole === user?.role"
      >
        Сохранить
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

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

const selectedRole = ref('')

const roles = [
  {
    value: 'guest',
    label: 'Гость',
    type: 'info',
    description: 'Базовый доступ'
  },
  {
    value: 'player',
    label: 'Игрок',
    type: 'primary',
    description: 'Может участвовать в играх'
  },
  {
    value: 'judge',
    label: 'Судья',
    type: 'warning',
    description: 'Может вести игры'
  },
  {
    value: 'admin',
    label: 'Администратор',
    type: 'danger',
    description: 'Полный доступ'
  }
]

watch(() => props.user, (newUser) => {
  if (newUser) {
    selectedRole.value = newUser.role || 'guest'
  }
})

const getUserFullName = (user) => {
  const first = user.first_name || ''
  const last = user.last_name || ''
  return `${first} ${last}`.trim() || 'Без имени'
}

const getUserInitials = (user) => {
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

const handleConfirm = () => {
  emit('confirm', {
    userId: props.user.id,
    role: selectedRole.value
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.role-edit-content {
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

.role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 0;
}

.role-description {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 90% !important;
  }
}
</style>