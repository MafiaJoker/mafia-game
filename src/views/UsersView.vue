<template>
  <div class="users-view">
    <el-card class="users-card">
      <div class="card-header">
        <h2>Управление пользователями</h2>
        <div class="header-actions">
          <el-button 
            type="success" 
            :icon="Plus" 
            @click="createTestUsers"
            :loading="creatingTestUsers"
          >
            Создать тестовых пользователей
          </el-button>
          <el-button 
            type="primary" 
            :icon="Refresh" 
            @click="loadUsers"
            :loading="loading"
          >
            Обновить
          </el-button>
        </div>
      </div>

      <el-divider />

      <UsersList 
        :users="users"
        :loading="loading"
        :can-edit="true"
        @edit-user="handleEditUser"
        @delete-user="handleDeleteUser"
        @update-role="handleUpdateRole"
      />
    </el-card>

    <UserEditDialog
      v-model="editDialogVisible"
      :user="selectedUser"
      @confirm="updateUser"
    />

    <RoleEditDialog
      v-model="roleDialogVisible"
      :user="selectedUser"
      @confirm="updateUserRole"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElDivider } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import UsersList from '@/components/users/UsersList.vue'
import UserEditDialog from '@/components/users/UserEditDialog.vue'
import RoleEditDialog from '@/components/users/RoleEditDialog.vue'

const authStore = useAuthStore()
const users = ref([])
const loading = ref(false)
const creatingTestUsers = ref(false)
const editDialogVisible = ref(false)
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

const handleEditUser = (user) => {
  selectedUser.value = { ...user }
  editDialogVisible.value = true
}

const handleDeleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить пользователя "${user.nickname || getUserFullName(user)}"?`,
      'Подтверждение удаления',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // Здесь должен быть вызов API для удаления пользователя
    // Пока что API не поддерживает удаление пользователей
    ElMessage.info('Функция удаления пользователей пока не реализована в API')
    
  } catch (error) {
    // Пользователь отменил удаление
  }
}

const handleUpdateRole = (user) => {
  selectedUser.value = { ...user }
  roleDialogVisible.value = true
}

const getUserFullName = (user) => {
  const first = user.first_name || ''
  const last = user.last_name || ''
  return `${first} ${last}`.trim() || 'Без имени'
}

const updateUserRole = async ({ userId, role, tariffId }) => {
  try {
    const promises = []
    
    // Обновляем роль
    if (role !== selectedUser.value.role) {
      promises.push(apiService.updateUser(userId, { role }))
    }
    
    // Обновляем тариф, если изменился
    if (tariffId !== selectedUser.value.tariff_id) {
      if (tariffId) {
        promises.push(apiService.addTariffForUser(userId, { tariff_id: tariffId }))
      } else {
        // Если тариф убрали, отправляем null
        promises.push(apiService.addTariffForUser(userId, { tariff_id: null }))
      }
    }
    
    await Promise.all(promises)
    ElMessage.success('Данные пользователя обновлены')
    await loadUsers()
  } catch (error) {
    console.error('Error updating user:', error)
    ElMessage.error('Ошибка обновления данных пользователя')
  }
}

const updateUser = async ({ userId, nickname }) => {
  try {
    await apiService.updateUser(userId, { nickname })
    
    // Обновляем пользователя локально вместо перезагрузки всего списка
    const userIndex = users.value.findIndex(user => user.id === userId)
    if (userIndex !== -1) {
      users.value[userIndex].nickname = nickname
    }
    
    ElMessage.success('Пользователь обновлен')
  } catch (error) {
    console.error('Error updating user:', error)
    ElMessage.error('Ошибка обновления пользователя')
  }
}

const createTestUsers = async () => {
  try {
    creatingTestUsers.value = true
    
    const testUsers = [
      { nickname: 'Игрок1' },
      { nickname: 'Игрок2' },
      { nickname: 'Игрок3' },
      { nickname: 'Игрок4' },
      { nickname: 'Игрок5' },
      { nickname: 'Игрок6' },
      { nickname: 'Игрок7' },
      { nickname: 'Игрок8' },
      { nickname: 'Игрок9' },
      { nickname: 'Игрок10' }
    ]
    
    let created = 0
    for (const user of testUsers) {
      try {
        await apiService.createUser(user)
        created++
      } catch (error) {
        console.error(`Ошибка создания пользователя ${user.nickname}:`, error)
      }
    }
    
    ElMessage.success(`Создано ${created} из ${testUsers.length} тестовых пользователей`)
    await loadUsers()
    
  } catch (error) {
    console.error('Error creating test users:', error)
    ElMessage.error('Ошибка создания тестовых пользователей')
  } finally {
    creatingTestUsers.value = false
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

.header-actions {
  display: flex;
  gap: 12px;
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

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .card-header h2 {
    font-size: 18px;
  }
}
</style>