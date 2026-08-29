<template>
  <div class="pagination-filter" :class="{ 'is-mobile': isMobile }">
    <!-- Компьютер и планшет: фильтры в одну строку, при нехватке места переносятся -->
    <el-row v-if="!isMobile" :gutter="20" class="filter-row">
      <!-- Поиск -->
      <el-col :xs="24" :sm="10" :md="8">
        <el-input
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          :prefix-icon="Search"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
      </el-col>

      <!-- Дополнительные фильтры -->
      <el-col :xs="24" :sm="14" :md="16">
        <el-space wrap>
          <!-- Фильтр по статусу -->
          <el-select
            v-if="statusOptions.length > 0"
            v-model="selectedStatus"
            placeholder="Все статусы"
            clearable
            class="filter-select"
            @change="handleFilterChange"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>

          <!-- Фильтр по типу/категории -->
          <el-select
            v-if="typeOptions.length > 0"
            v-model="selectedType"
            placeholder="Все типы"
            clearable
            class="filter-select"
            @change="handleFilterChange"
          >
            <el-option
              v-for="type in typeOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>

          <!-- Фильтр по дате -->
          <el-date-picker
            v-if="showDateFilter"
            v-model="dateRange"
            type="daterange"
            range-separator="—"
            start-placeholder="Начало"
            end-placeholder="Конец"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            @change="handleFilterChange"
          />

          <!-- Кнопка поиска -->
          <el-button 
            type="primary" 
            :icon="Search"
            @click="handleSearch"
          >
            Найти
          </el-button>

          <!-- Кнопка сброса -->
          <el-button 
            :icon="RefreshLeft"
            @click="handleReset"
          >
            Сбросить
          </el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- Телефон: поиск всегда под рукой, остальные фильтры раскрываются кнопкой -->
    <div v-else class="filter-mobile">
      <div class="filter-search-row">
        <el-input
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          :prefix-icon="Search"
          clearable
          class="filter-search"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button
          type="primary"
          :icon="Search"
          aria-label="Найти"
          @click="handleSearch"
        />
        <el-button
          v-if="hasExtraFilters"
          :icon="Filter"
          :type="activeFiltersCount > 0 ? 'primary' : 'default'"
          :plain="activeFiltersCount > 0"
          class="filter-toggle"
          aria-label="Фильтры"
          @click="filtersExpanded = !filtersExpanded"
        >
          <span v-if="activeFiltersCount > 0">{{ activeFiltersCount }}</span>
        </el-button>
      </div>

      <el-collapse-transition>
        <div v-show="filtersExpanded && hasExtraFilters" class="filter-panel">
          <el-select
            v-if="statusOptions.length > 0"
            v-model="selectedStatus"
            placeholder="Все статусы"
            clearable
            @change="handleFilterChange"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>

          <el-select
            v-if="typeOptions.length > 0"
            v-model="selectedType"
            placeholder="Все типы"
            clearable
            @change="handleFilterChange"
          >
            <el-option
              v-for="type in typeOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>

          <!-- Панель диапазона дат шире телефона: две отдельные даты -->
          <div v-if="showDateFilter" class="filter-dates">
            <el-date-picker
              v-model="dateStart"
              type="date"
              placeholder="Начало"
              format="DD.MM.YYYY"
              value-format="YYYY-MM-DD"
              @change="handleMobileDateChange"
            />
            <el-date-picker
              v-model="dateEnd"
              type="date"
              placeholder="Конец"
              format="DD.MM.YYYY"
              value-format="YYYY-MM-DD"
              @change="handleMobileDateChange"
            />
          </div>

          <el-button
            :icon="RefreshLeft"
            class="filter-reset"
            @click="handleReset"
          >
            Сбросить фильтры
          </el-button>
        </div>
      </el-collapse-transition>
    </div>

    <!-- Информация и пагинация в одной строке -->
    <div class="results-pagination-row" v-if="totalItems > 0">
      <div class="results-info">
        <span>Найдено: {{ totalItems }} {{ itemsLabel }}</span>
      </div>
      
      <el-pagination
        v-if="totalItems > pageSize"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalItems"
        :background="true"
        :layout="paginationLayout"
        :pager-count="isMobile ? 5 : 7"
        :size="isMobile ? 'small' : 'default'"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search, RefreshLeft, Filter } from '@element-plus/icons-vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

// Props
const props = defineProps({
  totalItems: {
    type: Number,
    default: 0
  },
  itemsLabel: {
    type: String,
    default: 'записей'
  },
  searchPlaceholder: {
    type: String,
    default: 'Поиск...'
  },
  statusOptions: {
    type: Array,
    default: () => []
  },
  typeOptions: {
    type: Array,
    default: () => []
  },
  showDateFilter: {
    type: Boolean,
    default: false
  },
  defaultPageSize: {
    type: Number,
    default: 20
  }
})

// Emits
const emit = defineEmits(['filter-change', 'page-change', 'size-change'])

const { isMobile, isTablet } = useBreakpoints()

// Состояние
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedType = ref('')
const dateRange = ref(null)
const currentPage = ref(1)
const pageSize = ref(props.defaultPageSize)

// Телефон: диапазон дат собирается из двух отдельных полей
const dateStart = ref(null)
const dateEnd = ref(null)
const filtersExpanded = ref(false)

// Вычисляемые свойства
const currentPageItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, props.totalItems)
  return `${start}-${end}`
})

const paginationLayout = computed(() => {
  if (isMobile.value) return 'prev, pager, next'
  if (isTablet.value) return 'prev, pager, next, sizes'
  return 'sizes, prev, pager, next'
})

const hasExtraFilters = computed(() => (
  props.statusOptions.length > 0 || props.typeOptions.length > 0 || props.showDateFilter
))

// Сколько фильтров включено - видно на свёрнутой кнопке
const activeFiltersCount = computed(() => (
  [selectedStatus.value, selectedType.value, dateRange.value].filter(Boolean).length
))

// Методы
const handleSearch = () => {
  currentPage.value = 1
  emitFilterChange()
}

const handleFilterChange = () => {
  currentPage.value = 1
  emitFilterChange()
}

// Диапазон отправляем только целиком: одна дата - ещё не период
const handleMobileDateChange = () => {
  dateRange.value = dateStart.value && dateEnd.value
    ? [dateStart.value, dateEnd.value]
    : null
  handleFilterChange()
}

const handleReset = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedType.value = ''
  dateRange.value = null
  dateStart.value = null
  dateEnd.value = null
  currentPage.value = 1
  emitFilterChange()
}

const handlePageChange = (page) => {
  emit('page-change', page)
  emitFilterChange()
}

const handleSizeChange = (size) => {
  currentPage.value = 1
  emit('size-change', size)
  emitFilterChange()
}

const emitFilterChange = () => {
  const filters = {
    search: searchQuery.value,
    status: selectedStatus.value,
    type: selectedType.value,
    dateRange: dateRange.value,
    page: currentPage.value,
    pageSize: pageSize.value
  }
  emit('filter-change', filters)
}

// Watchers
watch(() => props.totalItems, (newVal) => {
  // Если текущая страница больше возможного количества страниц
  const maxPage = Math.ceil(newVal / pageSize.value)
  if (currentPage.value > maxPage && maxPage > 0) {
    currentPage.value = maxPage
  }
})

// Поворот экрана: диапазон из настольного пикера переезжает в два поля и обратно
watch(dateRange, (range) => {
  dateStart.value = range?.[0] || null
  dateEnd.value = range?.[1] || null
})

// Экспорт функций для родительского компонента
defineExpose({
  reset: handleReset,
  refresh: () => emitFilterChange()
})
</script>

<style scoped>
.pagination-filter {
  margin-bottom: 20px;
}

.filter-row {
  margin-bottom: 20px;
}

.filter-select {
  min-width: 160px;
}

.results-pagination-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0;
}

.results-info {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  flex-shrink: 0;
}

.el-pagination {
  flex-shrink: 0;
}

/* Планшет: поиск и фильтры в две строки, пагинация переносится под счётчик */
@media (max-width: 1023px) {
  .filter-row .el-col {
    margin-bottom: 10px;
  }

  .results-pagination-row {
    flex-wrap: wrap;
    gap: 12px;
  }
}

/* Телефон */
.filter-mobile {
  margin-bottom: 12px;
}

.filter-search-row {
  display: flex;
  gap: 8px;
}

.filter-search {
  flex: 1;
  min-width: 0;
}

.filter-search-row .el-button {
  margin-left: 0;
  flex-shrink: 0;
}

.filter-toggle {
  min-width: 44px;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.filter-panel .el-select,
.filter-panel .el-date-editor {
  width: 100%;
}

.filter-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.filter-dates :deep(.el-date-editor) {
  width: 100%;
}

.filter-reset {
  width: 100%;
}

.is-mobile .results-pagination-row {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin: 8px 0 12px;
}

.is-mobile .results-info {
  font-size: 13px;
}

.is-mobile .el-pagination {
  justify-content: center;
}
</style>
