<template>
  <div class="users-view" :class="{ 'is-mobile': isMobile }">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Управление пользователями</h1>
          <el-space>
            <el-button 
              type="primary"
              :icon="Plus"
              :circle="isMobile"
              :aria-label="isMobile ? 'Создать пользователя' : null"
              @click="showCreateDialog = true"
            >
              <template v-if="!isMobile">Создать пользователя</template>
            </el-button>
            <el-button
              v-if="authStore.isAdmin"
              type="warning"
              :icon="Switch"
              :circle="isMobile"
              :aria-label="isMobile ? 'Объединить пользователей' : null"
              @click="mergeDialogVisible = true"
            >
              <template v-if="!isMobile">Объединить</template>
            </el-button>
            <el-button 
              type="success" 
              :icon="Tools" 
              :circle="isMobile"
              :aria-label="isMobile ? 'Создать тестовых' : null"
              @click="createTestUsers"
              :loading="creatingTestUsers"
              v-if="isDevelopment"
            >
              <template v-if="!isMobile">Создать тестовых</template>
            </el-button>
          </el-space>
        </div>
      </el-header>

      <el-main>
        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane label="Пользователи" name="users">
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
                    <div class="user-cell">
                      <el-avatar
                        v-if="getPrimaryAvatar(scope.row)"
                        :size="32"
                        :src="getPrimaryAvatar(scope.row)"
                        class="user-cell-avatar"
                      />
                      <IconDefaultAvatar v-else :size="32" class="user-cell-avatar-empty" />
                      <span class="user-cell-nickname">{{ scope.row.nickname || '-' }}</span>
                    </div>
                  </template>
                </el-table-column>
            
                <el-table-column 
                  v-if="authStore.isAdmin"
                  label="Действия" 
                  width="150"
                  align="center"
                  :fixed="isMobile ? false : 'right'"
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
          </el-tab-pane>

          <!-- История слияний - инструмент админа, и грузится она при первом
               открытии вкладки, а не вместе с экраном -->
          <el-tab-pane
            v-if="authStore.isAdmin"
            label="История слияний"
            name="merges"
            lazy
          >
            <UserMergeHistory ref="mergeHistoryRef" />
          </el-tab-pane>
        </el-tabs>
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
      @avatars-updated="applyAvatarsUpdate"
    />

    <UserMergeDialog
      v-model="mergeDialogVisible"
      @merged="handleMerged"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Tools, Switch } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import { useBreakpoints } from '@/composables/useBreakpoints'
import UserEditCombinedDialog from '@/components/users/UserEditCombinedDialog.vue'
import UserMergeDialog from '@/components/users/UserMergeDialog.vue'
import UserMergeHistory from '@/components/users/UserMergeHistory.vue'
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'
import { pickPrimaryAvatar } from '@/utils/avatars'
import { UI_MESSAGES } from '@/utils/uiConstants'

const authStore = useAuthStore()
const { isMobile } = useBreakpoints()
const loading = ref(false)
const creating = ref(false)
const creatingTestUsers = ref(false)
const editDialogVisible = ref(false)
const showCreateDialog = ref(false)
const mergeDialogVisible = ref(false)
const activeTab = ref('users')
const mergeHistoryRef = ref(null)
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
    { required: true, message: 'Введите никнейм', trigger: 'blur' }
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
      params.nickname = searchString.trim()
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


// Слияние прошло: дублей в списке больше нет, а в истории появилась строка.
// Историю трогаем, только если вкладку уже открывали - она грузится лениво
const handleMerged = ({ report, target, sources }) => {
  const removed = (sources || []).map(source => source.nickname).join(', ')
  // Ник основного берём из ответа, но у сорвавшегося слияния result пуст:
  // тогда показываем того, кого выбрали в диалоге
  const kept = report?.result?.nickname || target?.nickname || ''
  ElMessage.success(`Объединено: ${removed} → ${kept}`)
  loadUsers()
  mergeHistoryRef.value?.refresh()
}

const getUserFullName = (user) => {
  const first = user.first_name || ''
  const last = user.last_name || ''
  return `${first} ${last}`.trim() || 'Без имени'
}

const updateUserData = async (userId, apiData) => {
  try {
    // Обновляем никнейм и роли через один запрос

    await apiService.updateUser(userId, apiData)
    
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

// В списке хватает одной картинки: в приоритете мирный житель
const getPrimaryAvatar = (user) => pickPrimaryAvatar(user?.avatars)

// Аватарку сохранила модалка - правим строку на месте, не дергая
// страничный список с фильтрами ради одной картинки
const applyAvatarsUpdate = (userId, avatars) => {
  const patch = (list) => list.map(
    item => (item.id === userId ? { ...item, avatars } : item)
  )
  allUsers.value = patch(allUsers.value)
  filteredUsers.value = patch(filteredUsers.value)
  paginatedUsers.value = patch(paginatedUsers.value)
  // selectedUser не трогаем: модалка следит за ним и на новом объекте
  // сбросила бы форму - вместе с недописанным ником
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-cell-avatar {
  flex-shrink: 0;
}

.user-cell-avatar-empty {
  flex-shrink: 0;
  color: #c0c4cc;
}

.user-cell-nickname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Планшет и телефон */
@media (max-width: 1023px) {
  .users-view {
    min-height: auto;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 12px;
  }
}

/* Телефон: заголовок и круглые кнопки в одну строку */
.is-mobile .header-content {
  flex-wrap: nowrap;
}

.is-mobile .header-content h1 {
  flex: 1;
  font-size: 1.15rem;
  line-height: 1.25;
  margin: 0;
  min-width: 0;
}
</style>
