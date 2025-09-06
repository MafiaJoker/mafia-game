<template>
  <div class="users-view">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Управление пользователями</h1>
          <el-space>
            <el-button 
              type="primary"
              :icon="Plus"
              @click="showCreateDialog = true"
            >
              Создать пользователя
            </el-button>
            <el-button 
              type="success" 
              :icon="Tools" 
              @click="createTestUsers"
              :loading="creatingTestUsers"
              v-if="isDevelopment"
            >
              Создать тестовых
            </el-button>
          </el-space>
        </div>
      </el-header>

      <el-main>
        <!-- Фильтры и пагинация -->
        <PaginationFilter
          :total-items="totalUsers"
          items-label="пользователей"
          search-placeholder="Поиск по имени, никнейму или email..."
          :status-options="roleOptions"
          @filter-change="handleFilterChange"
        />
        

        <!-- Таблица пользователей -->
        <el-card>
          <el-table 
            :data="paginatedUsers" 
            :loading="loading"
            style="width: 100%"
          >
            <el-table-column 
              prop="nickname" 
              label="Никнейм" 
              min-width="150"
              sortable
            >
              <template #default="scope">
                {{ scope.row.nickname || '-' }}
              </template>
            </el-table-column>
            
            <el-table-column 
              label="Имя" 
              min-width="200"
            >
              <template #default="scope">
                {{ getUserFullName(scope.row) }}
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="email" 
              label="Email" 
              min-width="200"
            >
              <template #default="scope">
                {{ scope.row.email || '-' }}
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="role" 
              label="Роль" 
              width="120"
              align="center"
            >
              <template #default="scope">
                <el-tag :type="getRoleType(scope.row.role)">
                  {{ getRoleLabel(scope.row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="tariff" 
              label="Тариф" 
              width="150"
            >
              <template #default="scope">
                <el-tag v-if="scope.row.tariff" type="info">
                  {{ scope.row.tariff.label }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="created_at" 
              label="Дата регистрации" 
              width="150"
              sortable
            >
              <template #default="scope">
                {{ formatDate(scope.row.created_at) }}
              </template>
            </el-table-column>
            
            <el-table-column 
              label="Действия" 
              width="150"
              align="center"
              fixed="right"
            >
              <template #default="scope">
                <el-button-group>
                  <el-button 
                    size="small"
                    type="primary"
                    @click="handleEditUser(scope.row)"
                    :icon="Edit"
                  />
                  <el-button 
                    size="small"
                    type="warning"
                    @click="handleUpdateRole(scope.row)"
                    :icon="Key"
                  />
                  <el-button 
                    size="small"
                    type="danger"
                    @click="handleDeleteUser(scope.row)"
                    :icon="Delete"
                    :disabled="scope.row.role === 'admin'"
                  />
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- Диалог создания пользователя -->
    <el-dialog 
      v-model="showCreateDialog" 
      title="Создать пользователя" 
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="120px"
      >
        <el-form-item label="Никнейм" prop="nickname">
          <el-input 
            v-model="createForm.nickname" 
            placeholder="Введите никнейм"
          />
        </el-form-item>
        
        <el-form-item label="Email" prop="email">
          <el-input 
            v-model="createForm.email" 
            placeholder="example@mail.com"
          />
        </el-form-item>
        
        <el-form-item label="Имя" prop="first_name">
          <el-input 
            v-model="createForm.first_name" 
            placeholder="Введите имя"
          />
        </el-form-item>
        
        <el-form-item label="Фамилия" prop="last_name">
          <el-input 
            v-model="createForm.last_name" 
            placeholder="Введите фамилию"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button 
          type="primary" 
          @click="handleCreateUser"
          :loading="creating"
        >
          Создать
        </el-button>
      </template>
    </el-dialog>

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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Key, Tools } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import UserEditDialog from '@/components/users/UserEditDialog.vue'
import RoleEditDialog from '@/components/users/RoleEditDialog.vue'
import { UI_MESSAGES } from '@/utils/uiConstants'

const authStore = useAuthStore()
const loading = ref(false)
const creating = ref(false)
const creatingTestUsers = ref(false)
const editDialogVisible = ref(false)
const roleDialogVisible = ref(false)
const showCreateDialog = ref(false)
const selectedUser = ref(null)
const allUsers = ref([])
const filteredUsers = ref([])
const paginatedUsers = ref([])
const totalUsers = ref(0)
const serverTotalUsers = ref(0) // Общее количество с сервера
const createFormRef = ref()

// Фильтры
const filters = ref({
  search: '',
  status: '', // будет использоваться для роли
  page: 1,
  pageSize: 20
})

// Форма создания
const createForm = reactive({
  nickname: '',
  email: '',
  first_name: '',
  last_name: ''
})

// Правила валидации
const createRules = {
  nickname: [
    { required: true, message: 'Введите никнейм', trigger: 'blur' },
    { min: 3, max: 50, message: 'Длина должна быть от 3 до 50 символов', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: 'Введите корректный email', trigger: 'blur' }
  ]
}

// Опции для фильтра ролей
const roleOptions = [
  { value: 'admin', label: 'Администратор' },
  { value: 'judge', label: 'Судья' },
  { value: 'guest', label: 'Гость' }
]

// Показываем кнопку тестовых пользователей только в режиме разработки
const isDevelopment = import.meta.env.DEV

const loadUsers = async (page = 1, size = 100) => {
  loading.value = true
  try {
    // API ожидает pageSize и currentPage
    const response = await apiService.getUsers({ 
      pageSize: size,
      currentPage: page
    })
    console.log(`Loading page ${page} with pageSize ${size}:`, response)
    console.log('Users response:', response)
    
    // Обрабатываем разные структуры ответа
    if (Array.isArray(response)) {
      allUsers.value = response
    } else if (response && response.items && Array.isArray(response.items)) {
      // API возвращает объект с пагинацией
      allUsers.value = response.items
      serverTotalUsers.value = response.total || response.items.length
      
    } else if (response && response.data && Array.isArray(response.data)) {
      allUsers.value = response.data
    } else {
      console.warn('Unexpected users response structure:', response)
      allUsers.value = []
    }
    
    applyFilters()
  } catch (error) {
    console.error('Error loading users:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
  } finally {
    loading.value = false
  }
}


const applyFilters = () => {
  let result = [...allUsers.value]
  
  // Поиск
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(user => {
      const nickname = (user.nickname || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const firstName = (user.first_name || '').toLowerCase()
      const lastName = (user.last_name || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      
      return nickname.includes(searchLower) ||
             email.includes(searchLower) ||
             fullName.includes(searchLower)
    })
  }
  
  // Фильтр по роли
  if (filters.value.status) {
    result = result.filter(user => user.role === filters.value.status)
  }
  
  filteredUsers.value = result
  totalUsers.value = serverTotalUsers.value || result.length
  
  // Пагинация теперь серверная, показываем все загруженные данные
  paginatedUsers.value = result
}

const handleFilterChange = (newFilters) => {
  const oldFilters = { ...filters.value }
  filters.value = newFilters
  
  // Если изменилась страница, перезагружаем данные с сервера
  if (oldFilters.page !== newFilters.page || oldFilters.pageSize !== newFilters.pageSize) {
    loadUsers(newFilters.page, newFilters.pageSize)
  } else {
    // Иначе просто применяем фильтры локально
    applyFilters()
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

const handleCreateUser = async () => {
  const valid = await createFormRef.value.validate()
  if (!valid) return
  
  creating.value = true
  try {
    await apiService.createUser(createForm)
    ElMessage.success('Пользователь создан')
    showCreateDialog.value = false
    resetCreateForm()
    await loadUsers()
  } catch (error) {
    console.error('Error creating user:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.SAVE_FAILED)
  } finally {
    creating.value = false
  }
}

const updateUser = async ({ userId, nickname }) => {
  try {
    await apiService.updateUser(userId, { nickname })
    ElMessage.success('Пользователь обновлен')
    await loadUsers()
  } catch (error) {
    console.error('Error updating user:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.UPDATE_FAILED)
  }
}

const resetCreateForm = () => {
  Object.assign(createForm, {
    nickname: '',
    email: '',
    first_name: '',
    last_name: ''
  })
  createFormRef.value?.resetFields()
}

const createTestUsers = async () => {
  try {
    creatingTestUsers.value = true
    
    const testUsers = [
      { nickname: 'Игрок1', first_name: 'Иван', last_name: 'Иванов' },
      { nickname: 'Игрок2', first_name: 'Петр', last_name: 'Петров' },
      { nickname: 'Игрок3', first_name: 'Сидор', last_name: 'Сидоров' },
      { nickname: 'Игрок4', first_name: 'Анна', last_name: 'Смирнова' },
      { nickname: 'Игрок5', first_name: 'Мария', last_name: 'Кузнецова' },
      { nickname: 'Игрок6', first_name: 'Елена', last_name: 'Попова' },
      { nickname: 'Игрок7', first_name: 'Алексей', last_name: 'Соколов' },
      { nickname: 'Игрок8', first_name: 'Дмитрий', last_name: 'Лебедев' },
      { nickname: 'Игрок9', first_name: 'Николай', last_name: 'Козлов' },
      { nickname: 'Игрок10', first_name: 'Ольга', last_name: 'Новикова' }
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

// Утилиты
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ru-RU')
}

const getRoleType = (role) => {
  const types = {
    admin: 'danger',
    judge: 'warning',
    guest: 'info'
  }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = {
    admin: 'Администратор',
    judge: 'Судья',
    guest: 'Гость'
  }
  return labels[role] || role
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  width: 100%;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
  }
  
  .header-content h1 {
    margin: 0;
  }
}
</style>