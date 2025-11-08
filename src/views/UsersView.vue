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
              min-width="300"
              sortable
            >
              <template #default="scope">
                {{ scope.row.nickname || '-' }}
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

    <UserEditCombinedDialog
      v-model="editDialogVisible"
      :user="selectedUser"
      @confirm="updateUserData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Tools } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import UserEditCombinedDialog from '@/components/users/UserEditCombinedDialog.vue'
import { UI_MESSAGES } from '@/utils/uiConstants'

const authStore = useAuthStore()
const loading = ref(false)
const creating = ref(false)
const creatingTestUsers = ref(false)
const editDialogVisible = ref(false)
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

const loadUsers = async (page = 1, size = 100, searchString = '', roleFilter = '') => {
  loading.value = true
  try {
    // Подготавливаем параметры для API
    const params = { 
      pageSize: size,
      currentPage: page
    }
    
    // Добавляем параметр поиска если есть
    if (searchString && searchString.trim()) {
      params.searchString = searchString.trim()
    }
    
    // Добавляем фильтр роли если есть  
    if (roleFilter) {
      params.role = roleFilter
    }
    
    console.log(`Loading page ${page} with params:`, params)
    const response = await apiService.getUsers(params)
    console.log('Users response:', response)
    
    // Обрабатываем разные структуры ответа
    if (Array.isArray(response)) {
      allUsers.value = response
      serverTotalUsers.value = response.length
    } else if (response && response.items && Array.isArray(response.items)) {
      // API возвращает объект с пагинацией
      allUsers.value = response.items
      serverTotalUsers.value = response.total || response.items.length
    } else if (response && response.data && Array.isArray(response.data)) {
      allUsers.value = response.data
      serverTotalUsers.value = response.data.length
    } else {
      console.warn('Unexpected users response structure:', response)
      allUsers.value = []
      serverTotalUsers.value = 0
    }
    
    // Убираем локальную фильтрацию поиска, т.к. теперь сервер фильтрует
    applyLocalFilters()
  } catch (error) {
    console.error('Error loading users:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
  } finally {
    loading.value = false
  }
}


const applyLocalFilters = () => {
  let result = [...allUsers.value]
  
  // Поиск теперь происходит на сервере, убираем локальную фильтрацию поиска
  // Остальные фильтры можно оставить локальными если нужно
  
  filteredUsers.value = result
  totalUsers.value = serverTotalUsers.value
  
  // Пагинация теперь серверная, показываем все загруженные данные
  paginatedUsers.value = result
}

const handleFilterChange = (newFilters) => {
  const oldFilters = { ...filters.value }
  filters.value = newFilters
  
  // Если изменилась страница, размер страницы, поиск или фильтр роли - перезагружаем данные с сервера
  const needsServerReload = (
    oldFilters.page !== newFilters.page || 
    oldFilters.pageSize !== newFilters.pageSize ||
    oldFilters.search !== newFilters.search ||
    oldFilters.status !== newFilters.status
  )
  
  if (needsServerReload) {
    loadUsers(newFilters.page, newFilters.pageSize, newFilters.search, newFilters.status)
  } else {
    // Иначе просто применяем локальные фильтры
    applyLocalFilters()
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


const getUserFullName = (user) => {
  const first = user.first_name || ''
  const last = user.last_name || ''
  return `${first} ${last}`.trim() || 'Без имени'
}

const updateUserData = async ({ userId, nickname, roles }) => {
  try {
    // Обновляем никнейм и роли через один запрос
    await apiService.updateUser(userId, { 
      nickname: nickname,
      roles: roles 
    })
    
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
    guest: 'info',
    player: 'primary',
    game_master: 'warning',
    unregistered_player: '',
    cashier: 'success'
  }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = {
    admin: 'Администратор', 
    judge: 'Судья',
    guest: 'Гость',
    player: 'Игрок',
    game_master: 'Ведущий',
    unregistered_player: 'Незарег. игрок',
    cashier: 'Кассир'
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