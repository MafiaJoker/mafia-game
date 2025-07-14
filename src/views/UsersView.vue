<template>
  <div class="users-view">
    <el-card class="users-card">
      <div class="card-header">
        <h2>Управление пользователями</h2>
        <el-button 
          type="primary" 
          :icon="Refresh" 
          @click="loadUsers"
          :loading="loading"
        >
          Обновить
        </el-button>
      </div>

      <el-divider />

      <UsersList 
        :users="users"
        :loading="loading"
        :can-edit="authStore.isAdmin"
        @update-role="handleUpdateRole"
      />
    </el-card>

    <RoleEditDialog
      v-model="roleDialogVisible"
      :user="selectedUser"
      @confirm="updateUserRole"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElDivider } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import UsersList from '@/components/users/UsersList.vue'
import RoleEditDialog from '@/components/users/RoleEditDialog.vue'

const authStore = useAuthStore()
const users = ref([])
const loading = ref(false)
const roleDialogVisible = ref(false)
const selectedUser = ref(null)

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await apiService.getUsers()
    users.value = response.items || response || []
  } catch (error) {
    console.error('Error loading users:', error)
    ElMessage.error('Ошибка загрузки пользователей')
  } finally {
    loading.value = false
  }
}

const handleUpdateRole = (user) => {
  selectedUser.value = { ...user }
  roleDialogVisible.value = true
}

const updateUserRole = async ({ userId, role }) => {
  try {
    await apiService.updateUser(userId, { role })
    ElMessage.success('Роль пользователя обновлена')
    await loadUsers()
  } catch (error) {
    console.error('Error updating user role:', error)
    ElMessage.error('Ошибка обновления роли')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-view {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.users-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0 20px;
  margin: -20px -20px 0 -20px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

@media (max-width: 768px) {
  .users-view {
    padding: 10px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-header h2 {
    font-size: 18px;
  }
}
</style>