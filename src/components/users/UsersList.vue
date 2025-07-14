<template>
  <div class="users-list">
    <el-table 
      :data="users" 
      v-loading="loading"
      stripe
      style="width: 100%"
    >
      <el-table-column 
        prop="id" 
        label="ID" 
        width="80"
      />
      
      <el-table-column 
        label="Пользователь"
        min-width="200"
      >
        <template #default="{ row }">
          <div class="user-info">
            <el-avatar 
              :size="40" 
              :src="row.photo_url"
              class="user-avatar"
            >
              {{ getUserInitials(row) }}
            </el-avatar>
            <div class="user-details">
              <div class="user-name">
                {{ getUserFullName(row) }}
              </div>
              <div class="user-nickname" v-if="row.nickname">
                @{{ row.nickname }}
              </div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column 
        prop="telegram_id" 
        label="Telegram ID" 
        width="150"
      />

      <el-table-column 
        label="Роль"
        width="150"
      >
        <template #default="{ row }">
          <el-tag 
            :type="getRoleType(row.role)"
            effect="dark"
          >
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column 
        v-if="canEdit"
        label="Действия"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :icon="Edit"
            @click="$emit('update-role', row)"
          >
            Изменить
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty 
      v-if="!loading && users.length === 0"
      description="Пользователи не найдены"
    />
  </div>
</template>

<script setup>
import { Edit } from '@element-plus/icons-vue'

defineProps({
  users: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  canEdit: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update-role'])

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

const getRoleType = (role) => {
  const types = {
    admin: 'danger',
    judge: 'warning',
    player: 'primary',
    guest: 'info'
  }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = {
    admin: 'Администратор',
    judge: 'Судья',
    player: 'Игрок',
    guest: 'Гость'
  }
  return labels[role] || role
}
</script>

<style scoped>
.users-list {
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.user-nickname {
  color: #909399;
  font-size: 12px;
}

@media (max-width: 768px) {
  .user-info {
    gap: 8px;
  }

  .user-avatar {
    width: 32px !important;
    height: 32px !important;
  }

  .user-name {
    font-size: 13px;
  }

  .user-nickname {
    font-size: 11px;
  }
}
</style>