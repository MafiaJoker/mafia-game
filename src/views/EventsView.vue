<template>
  <div class="events-view" :class="{ 'is-mobile': isMobile }">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Мероприятия Мафии</h1>

          <!-- Телефон: подписи кнопок не помещаются рядом с заголовком, остаются иконки -->
          <div v-if="isMobile" class="header-actions-mobile">
            <el-button
              :icon="Calendar"
              circle
              aria-label="Календарь"
              @click="$router.push('/calendar')"
            />
            <el-button
              v-if="isDevelopment"
              type="warning"
              :icon="Tools"
              circle
              aria-label="Генератор данных"
              @click="showTestDataGenerator = true"
            />
            <el-button
              type="primary"
              :icon="Plus"
              circle
              aria-label="Создать мероприятие"
              @click="showCreateDialog = true"
            />
          </div>

          <el-space v-else wrap>
            <el-button 
              :icon="Calendar"
              @click="$router.push('/calendar')"
            >
              Календарь
            </el-button>
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

        <!-- Телефон: список карточек - таблица на шесть колонок в 360px не читается -->
        <div v-if="isMobile" v-loading="loading" class="events-cards">
          <el-empty v-if="!loading && paginatedEvents.length === 0" description="Мероприятий не найдено" />

          <div
            v-for="event in paginatedEvents"
            :key="event.id"
            class="event-card"
            @click="handleRowClick(event)"
          >
            <div class="event-card-top">
              <div class="event-card-title">{{ event.label }}</div>
              <el-tag v-if="event.status" :type="getStatusType(event.status)" size="small">
                {{ getStatusLabel(event.status) }}
              </el-tag>
            </div>

            <div class="event-card-meta">
              <span class="event-card-date">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(event.start_date) }}
              </span>
              <span class="event-card-games">Игр: {{ event.games_count || 0 }}</span>
            </div>

            <div v-if="event.event_type" class="event-card-type">
              <el-tag size="small" effect="plain">{{ event.event_type.label }}</el-tag>
              <span v-if="event.event_type.rule_system" class="rule-system-label">
                {{ event.event_type.rule_system.label }}
              </span>
            </div>

            <div class="event-card-actions">
              <el-button
                size="small"
                :icon="View"
                @click.stop="handleView(event)"
              >
                Открыть
              </el-button>
              <el-button
                size="small"
                type="primary"
                :icon="Edit"
                @click.stop="handleEdit(event)"
              >
                Изменить
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                aria-label="Удалить"
                @click.stop="handleDelete(event)"
              />
            </div>
          </div>
        </div>

        <!-- Таблица мероприятий -->
        <el-card v-else>
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
            >
              <template #default="scope">
                <div class="event-name-cell">
                  <span>{{ scope.row.label }}</span>
                  <!-- Планшет: колонка «Тип» не помещается, тип уходит под название -->
                  <div v-if="isTablet && scope.row.event_type" class="event-type-inline">
                    <el-tag size="small" effect="plain">{{ scope.row.event_type.label }}</el-tag>
                    <span v-if="scope.row.event_type.rule_system" class="rule-system-label">
                      {{ scope.row.event_type.rule_system.label }}
                    </span>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column 
              v-if="!isTablet"
              prop="event_type.label" 
              label="Тип" 
              width="150"
            >
              <template #default="scope">
                <div v-if="scope.row.event_type" class="event-type-cell">
                  <el-tag>
                    {{ scope.row.event_type.label }}
                  </el-tag>
                  <el-tooltip
                    v-if="scope.row.event_type.rule_system"
                    :content="scope.row.event_type.rule_system.description"
                    :disabled="!scope.row.event_type.rule_system.description"
                    placement="top"
                  >
                    <span class="rule-system-label">{{ scope.row.event_type.rule_system.label }}</span>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="start_date" 
              label="Дата начала" 
              :width="isTablet ? 120 : 150"
              sortable
            >
              <template #default="scope">
                {{ formatDate(scope.row.start_date) }}
              </template>
            </el-table-column>
            
            <el-table-column 
              prop="status" 
              label="Статус" 
              :width="isTablet ? 110 : 120"
            >
              <template #default="scope">
                <el-tag v-if="scope.row.status" :type="getStatusType(scope.row.status)">
                  {{ getStatusLabel(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column 
              v-if="!isTablet"
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
              :width="isTablet ? 140 : 180"
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
      :fullscreen="isMobile"
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
import { useBreakpoints } from '@/composables/useBreakpoints'
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
  Delete,
  Calendar
} from '@element-plus/icons-vue'
import { UI_MESSAGES } from '@/utils/uiConstants'

const router = useRouter()
const eventsStore = useEventsStore()
const { isMobile, isTablet } = useBreakpoints()

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
const loadEvents = async (page = 1, size = 20, searchString = '', statusFilter = '', typeFilter = '', dateRange = null) => {
  loading.value = true
  try {
    // Загружаем события с пагинацией, поиском и фильтрами, а также типы
    const [eventsResult, typesResult] = await Promise.allSettled([
      eventsStore.loadEvents(page, size, searchString, statusFilter, typeFilter, dateRange),
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
    applyLocalFilters()
    
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

const applyLocalFilters = () => {
  let result = [...allEvents.value]
  
  // Поиск и основные фильтры теперь происходят на сервере
  // Убираем локальную фильтрацию поиска, статуса, типа и даты
  
  filteredEvents.value = result
  // Для пагинации используем общее количество с сервера
  totalEvents.value = serverTotalEvents.value
  
  // Пагинация теперь серверная, показываем все загруженные данные
  paginatedEvents.value = result
}

const handleFilterChange = (newFilters) => {
  const oldFilters = { ...filters.value }
  filters.value = newFilters
  
  // Если изменился любой фильтр или пагинация - перезагружаем данные с сервера
  const needsServerReload = (
    oldFilters.page !== newFilters.page || 
    oldFilters.pageSize !== newFilters.pageSize ||
    oldFilters.search !== newFilters.search ||
    oldFilters.status !== newFilters.status ||
    oldFilters.type !== newFilters.type ||
    JSON.stringify(oldFilters.dateRange) !== JSON.stringify(newFilters.dateRange)
  )
  
  if (needsServerReload) {
    loadEvents(
      newFilters.page, 
      newFilters.pageSize, 
      newFilters.search, 
      newFilters.status, 
      newFilters.type, 
      newFilters.dateRange
    )
  } else {
    // Иначе просто применяем локальные фильтры
    applyLocalFilters()
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
  gap: 12px;
}

.el-table {
  cursor: pointer;
}

.event-type-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.event-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-type-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-system-label {
  font-size: 12px;
  color: #909399;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

/* Планшет и телефон: страница не тянется на весь экран поверх подвала */
@media (max-width: 1023px) {
  .events-view {
    min-height: auto;
  }

  .header-content {
    flex-wrap: wrap;
  }
}

/* Телефон */
.header-actions-mobile {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.header-actions-mobile .el-button {
  margin-left: 0;
}

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

.events-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}

.event-card {
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}

.event-card:active {
  background-color: #f5f7fa;
}

.event-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.event-card-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  line-height: 1.3;
  min-width: 0;
}

.event-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.event-card-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.event-card-type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}

.event-card-actions .el-button {
  margin-left: 0;
}

.event-card-actions .el-button:first-child,
.event-card-actions .el-button:nth-child(2) {
  flex: 1;
}
</style>
