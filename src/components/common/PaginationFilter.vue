<template>
  <div class="pagination-filter">
    <!-- Фильтры -->
    <el-row :gutter="20" class="filter-row">
      <!-- Поиск -->
      <el-col :span="8">
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
      <el-col :span="16">
        <el-space wrap>
          <!-- Фильтр по статусу -->
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

          <!-- Фильтр по типу/категории -->
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
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'

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

// Состояние
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedType = ref('')
const dateRange = ref(null)
const currentPage = ref(1)
const pageSize = ref(props.defaultPageSize)

// Вычисляемые свойства
const currentPageItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, props.totalItems)
  return `${start}-${end}`
})

const paginationLayout = computed(() => {
  return 'sizes, prev, pager, next'
})

// Методы
const handleSearch = () => {
  currentPage.value = 1
  emitFilterChange()
}

const handleFilterChange = () => {
  currentPage.value = 1
  emitFilterChange()
}

const handleReset = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedType.value = ''
  dateRange.value = null
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

@media (max-width: 768px) {
  .filter-row .el-col {
    margin-bottom: 10px;
  }
  
  .results-pagination-row {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .el-pagination {
    align-self: center;
  }
}
</style>