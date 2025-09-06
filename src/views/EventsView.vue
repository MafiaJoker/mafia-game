<template>
  <div class="events-view">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Мероприятия Мафии</h1>
          <el-space>
            <el-button 
              type="primary"
              :icon="Plus"
              @click="showCreateDialog = true"
            >
              Создать мероприятие
            </el-button>
            <el-button 
              type="warning" 
              @click="showTestDataGenerator = true"
              v-if="isDevelopment"
              :icon="Tools"
            >
              Генератор данных
            </el-button>
          </el-space>
        </div>
      </el-header>

      <el-main>
        <!-- Фильтры и пагинация -->
        <PaginationFilter
          :total-items="totalEvents"
          items-label="мероприятий"
          search-placeholder="Поиск по названию или описанию..."
          :status-options="statusOptions"
          :type-options="eventTypeOptions"
          :show-date-filter="true"
          @filter-change="handleFilterChange"
        />

        <!-- Таблица мероприятий -->
        <el-card>
          <el-table 
            :data="paginatedEvents" 
            :loading="loading"
            style="width: 100%"
            @row-click="handleRowClick"
          >
            <el-table-column 
              prop="label" 
              label="Название" 
              min-width="200"
              sortable
            />
            
            <el-table-column 
              prop="event_type.label" 
              label="Тип" 
              width="150"
            >
              <template #default="scope">
                <el-tag v-if="scope.row.event_type">
                  {{ scope.row.event_type.label }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="start_date" 
              label="Дата начала" 
              width="150"
              sortable
            >
              <template #default="scope">
                {{ formatDate(scope.row.start_date) }}
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="status" 
              label="Статус" 
              width="120"
            >
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">
                  {{ getStatusLabel(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="games_count" 
              label="Игр" 
              width="80"
              align="center"
            >
              <template #default="scope">
                <el-badge :value="scope.row.games_count || 0" type="primary" />
              </template>
            </el-table-column>
            
            <el-table-column 
              label="Действия" 
              width="180"
              align="center"
              fixed="right"
            >
              <template #default="scope">
                <el-button-group>
                  <el-button 
                    size="small"
                    @click.stop="handleView(scope.row)"
                    :icon="View"
                  />
                  <el-button 
                    size="small"
                    type="primary"
                    @click.stop="handleEdit(scope.row)"
                    :icon="Edit"
                  />
                  <el-button 
                    size="small"
                    type="danger"
                    @click.stop="handleDelete(scope.row)"
                    :icon="Delete"
                  />
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- Диалог создания мероприятия -->
    <el-dialog 
      v-model="showCreateDialog" 
      title="Создать мероприятие" 
      width="600px"
      :close-on-click-modal="false"
    >
      <CreateEventForm @event-created="handleEventCreated" />
    </el-dialog>

    <!-- Диалог редактирования мероприятия -->
    <EditEventDialog 
      v-model:visible="showEditDialog"
      :event="eventToEdit"
      @event-updated="handleEventUpdated"
    />

    <!-- Диалог генератора тестовых данных -->
    <el-dialog 
      v-model="showTestDataGenerator" 
      title="Генератор тестовых данных" 
      width="90%"
      :close-on-click-modal="false"
    >
      <TestDataGenerator />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import { apiService } from '@/services/api'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import CreateEventForm from '@/components/events/CreateEventForm.vue'
import EditEventDialog from '@/components/events/EditEventDialog.vue'
import TestDataGenerator from '@/components/admin/TestDataGenerator.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Tools,
  View,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { UI_MESSAGES } from '@/utils/uiConstants'

const router = useRouter()
const eventsStore = useEventsStore()

// Состояние
const loading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showTestDataGenerator = ref(false)
const eventToEdit = ref(null)
const allEvents = ref([])
const filteredEvents = ref([])
const paginatedEvents = ref([])
const totalEvents = ref(0)
const serverTotalEvents = ref(0)

// Фильтры
const filters = ref({
  search: '',
  status: '',
  type: '',
  dateRange: null,
  page: 1,
  pageSize: 20
})

// Показываем генератор только в режиме разработки
const isDevelopment = import.meta.env.DEV

// Опции для фильтров
const statusOptions = [
  { value: 'active', label: 'Активное' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Отменено' }
]

const eventTypeOptions = computed(() => {
  return (eventsStore.eventTypes || []).map(type => ({
    value: type.id,
    label: type.label
  }))
})

// Методы
const loadEvents = async (page = 1, size = 20) => {
  loading.value = true
  try {
    // Загружаем события с пагинацией и типы
    const [eventsResult, typesResult] = await Promise.allSettled([
      eventsStore.loadEvents(page, size),
      eventsStore.loadEventTypes()
    ])
    
    // Проверяем результаты
    if (eventsResult.status === 'rejected') {
      console.error('Failed to load events:', eventsResult.reason)
    }
    
    if (typesResult.status === 'rejected') {
      console.error('Failed to load event types:', typesResult.reason)
    }
    
    allEvents.value = eventsStore.events || []
    serverTotalEvents.value = eventsStore.serverTotalEvents || 0
    applyFilters()
    
    // Показываем ошибку только если обе загрузки провалились
    if (eventsResult.status === 'rejected' && typesResult.status === 'rejected') {
      ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
    }
  } catch (error) {
    console.error('Unexpected error in loadEvents:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  let result = [...allEvents.value]
  
  // Поиск
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(event => 
      event.label.toLowerCase().includes(searchLower) ||
      (event.description && event.description.toLowerCase().includes(searchLower))
    )
  }
  
  // Фильтр по статусу
  if (filters.value.status) {
    result = result.filter(event => event.status === filters.value.status)
  }
  
  // Фильтр по типу
  if (filters.value.type) {
    result = result.filter(event => event.event_type_id === filters.value.type)
  }
  
  // Фильтр по дате
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const [startDate, endDate] = filters.value.dateRange
    result = result.filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate >= new Date(startDate) && eventDate <= new Date(endDate)
    })
  }
  
  filteredEvents.value = result
  // Для пагинации используем общее количество с сервера
  totalEvents.value = serverTotalEvents.value || result.length
  
  // Пагинация теперь серверная, показываем все загруженные данные
  paginatedEvents.value = result
}

const handleFilterChange = (newFilters) => {
  const oldFilters = { ...filters.value }
  filters.value = newFilters
  
  // Если изменилась страница, перезагружаем данные с сервера
  if (oldFilters.page !== newFilters.page || oldFilters.pageSize !== newFilters.pageSize) {
    loadEvents(newFilters.page, newFilters.pageSize)
  } else {
    // Иначе просто применяем фильтры локально
    applyFilters()
  }
}

const handleRowClick = (row) => {
  router.push(`/event/${row.id}`)
}

const handleView = (event) => {
  router.push(`/event/${event.id}`)
}

const handleEdit = (event) => {
  eventToEdit.value = event
  showEditDialog.value = true
}

const handleDelete = async (event) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить мероприятие "${event.label}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )

    await eventsStore.deleteEvent(event.id)
    ElMessage.success('Мероприятие удалено')
    await loadEvents()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(UI_MESSAGES.ERRORS.DELETE_FAILED)
    }
  }
}

const handleEventCreated = () => {
  showCreateDialog.value = false
  loadEvents()
}

const handleEventUpdated = () => {
  showEditDialog.value = false
  loadEvents()
}

// Утилиты
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ru-RU')
}

const getStatusType = (status) => {
  const types = {
    active: 'success',
    completed: 'info',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    active: 'Активное',
    completed: 'Завершено',
    cancelled: 'Отменено'
  }
  return labels[status] || status
}

// Загрузка данных при монтировании
onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.events-view {
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

.el-table {
  cursor: pointer;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
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