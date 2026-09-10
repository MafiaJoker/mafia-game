<template>
  <div class="user-merge-history">
    <!-- Своих фильтров у ручки нет: только страница, размер и сортировка -->
    <PaginationFilter
      :total-items="total"
      items-label="слияний"
      :show-search="false"
      :default-page-size="DEFAULT_PAGE_SIZE"
      @filter-change="handleFilterChange"
    />

    <!-- Телефон: сортировка отдельным полем, шапки таблицы тут нет -->
    <div v-if="isMobile" class="sort-row">
      <el-select v-model="sortField" class="sort-select" @change="reload">
        <el-option
          v-for="option in SORT_OPTIONS"
          :key="option.field"
          :label="option.label"
          :value="option.field"
        />
      </el-select>
      <el-button
        :icon="sortOrder === 'asc' ? SortUp : SortDown"
        :aria-label="sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'"
        @click="toggleSortOrder"
      />
    </div>

    <el-card v-if="isMobile" v-loading="loading" class="merge-list-card">
      <div v-if="merges.length" class="merge-list">
        <div
          v-for="merge in merges"
          :key="merge.id"
          class="merge-row"
          @click="toggleExpanded(merge.id)"
        >
          <div class="merge-main">
            <span class="merge-date">{{ formatDateTime(merge.created_at) }}</span>
            <el-tag :type="statusType(merge.status)" size="small">
              {{ statusLabel(merge.status) }}
            </el-tag>
            <el-icon class="merge-chevron"><ArrowDown /></el-icon>
          </div>
          <div class="merge-summary">
            {{ sourceNicknames(merge) }} → {{ nicknameOf(merge.target) }}
          </div>

          <el-collapse-transition>
            <div v-show="isExpanded(merge.id)" class="merge-details" @click.stop>
              <MergeReport :merge="merge" />
            </div>
          </el-collapse-transition>
        </div>
      </div>

      <el-empty v-if="!loading && !merges.length" description="Слияний ещё не было" />
    </el-card>

    <el-card v-else>
      <el-table
        :data="merges"
        v-loading="loading"
        style="width: 100%"
        :default-sort="{ prop: sortProp, order: tableOrder }"
        @sort-change="handleSortChange"
      >
        <el-table-column type="expand">
          <template #default="scope">
            <div class="expand-content">
              <MergeReport :merge="scope.row" />
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="created_at"
          label="Запущено"
          :width="isTablet ? 200 : 210"
          sortable="custom"
        >
          <template #default="scope">{{ formatDateTime(scope.row.created_at) }}</template>
        </el-table-column>

        <el-table-column
          v-if="!isTablet"
          prop="created_by_nickname"
          label="Кто запустил"
          min-width="140"
          sortable="custom"
        >
          <template #default="scope">{{ nicknameOf(scope.row.created_by) }}</template>
        </el-table-column>

        <el-table-column label="Кого объединили" min-width="200">
          <template #default="scope">
            <!-- Ники удалённых источников - снимок, ссылку строить не на кого -->
            <el-tooltip
              :content="sourceIds(scope.row)"
              :disabled="!sourceIds(scope.row)"
              placement="top"
            >
              <span>{{ sourceNicknames(scope.row) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column
          prop="target_nickname"
          label="В кого"
          min-width="140"
          sortable="custom"
        >
          <template #default="scope">
            <el-tooltip
              :content="scope.row.target?.id"
              :disabled="!scope.row.target"
              placement="top"
            >
              <span>{{ nicknameOf(scope.row.target) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column
          prop="status"
          label="Статус"
          width="120"
          align="center"
          sortable="custom"
        >
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          v-if="!isTablet"
          prop="finished_at"
          label="Завершено"
          width="210"
          sortable="custom"
        >
          <template #default="scope">{{ formatDateTime(scope.row.finished_at) }}</template>
        </el-table-column>

        <template #empty>
          <el-empty description="Слияний ещё не было" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, SortDown, SortUp } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import MergeReport from '@/components/users/MergeReport.vue'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { UI_MESSAGES } from '@/utils/uiConstants'
import { formatDate } from '@/utils/formatters'

const DEFAULT_PAGE_SIZE = 20

// Сортировать ручка умеет по колонкам самой строки истории: ники участников
// лежат в ней снимком, поэтому по ним тоже можно
const SORT_OPTIONS = [
  { field: 'created_at', label: 'По дате запуска' },
  { field: 'finished_at', label: 'По дате завершения' },
  { field: 'status', label: 'По статусу' },
  { field: 'target_nickname', label: 'По основному' },
  { field: 'created_by_nickname', label: 'По тому, кто запустил' }
]

const STATUS_LABELS = {
  done: 'Выполнено',
  failed: 'Ошибка'
}

const STATUS_TYPES = {
  done: 'success',
  failed: 'danger'
}

const { isMobile, isTablet } = useBreakpoints()

const merges = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const sortField = ref('created_at')
const sortOrder = ref('desc')
const expandedIds = ref(new Set())

// Таблица сортирует по своим prop, ручка - по колонкам модели: у основного
// и у запустившего это ники-снимки, а не вложенные объекты ответа
const SORT_PROPS = {
  created_at: 'created_at',
  finished_at: 'finished_at',
  status: 'status',
  target_nickname: 'target_nickname',
  created_by_nickname: 'created_by_nickname'
}

const sortProp = computed(() => sortField.value)
const tableOrder = computed(
  () => (sortOrder.value === 'asc' ? 'ascending' : 'descending')
)

const loadMerges = async () => {
  loading.value = true
  try {
    const response = await apiService.getUserMerges({
      currentPage: page.value,
      pageSize: pageSize.value,
      orderBy: sortField.value,
      sortOrder: sortOrder.value
    })
    merges.value = response?.items || []
    total.value = response?.total || 0
  } catch (error) {
    console.error('Ошибка загрузки истории слияний:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
  } finally {
    loading.value = false
  }
}

const reload = () => loadMerges()

const handleFilterChange = (filters) => {
  page.value = filters.page
  pageSize.value = filters.pageSize
  loadMerges()
}

const handleSortChange = ({ prop, order }) => {
  // Снятая сортировка возвращает ту, с которой ручка отдаёт по умолчанию
  sortField.value = (order && SORT_PROPS[prop]) || 'created_at'
  sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
  loadMerges()
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  loadMerges()
}

const isExpanded = (mergeId) => expandedIds.value.has(mergeId)

const toggleExpanded = (mergeId) => {
  const next = new Set(expandedIds.value)
  if (next.has(mergeId)) next.delete(mergeId)
  else next.add(mergeId)
  expandedIds.value = next
}

// Снимок участников слияние дописывает в конце: у сорвавшегося его может не
// быть вовсе, а строка без ников не должна ронять рендер всей вкладки
const DASH = '—'

const nicknameOf = (person) => person?.nickname || DASH

const sourceNicknames = (merge) => (merge.sources || [])
  .map(source => source.nickname)
  .join(', ') || DASH

const sourceIds = (merge) => (merge.sources || [])
  .map(source => `${source.nickname}: ${source.id}`)
  .join('\n')

const statusLabel = (status) => STATUS_LABELS[status] || status

const statusType = (status) => STATUS_TYPES[status] || 'info'

// Слияние почти мгновенно и границу секунды переходит редко, поэтому время
// с миллисекундами: иначе «запущено» и «завершено» - одна и та же отметка.
// Незавершенное слияние оставляет дату пустой - показываем прочерк
const formatDateTime = (value) => (value ? formatDate(value, 'datetime-ms') : '—')

onMounted(loadMerges)

defineExpose({ refresh: loadMerges })
</script>

<style scoped>
.sort-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.sort-select {
  flex: 1;
  min-width: 0;
}

.expand-content {
  padding: 8px 16px;
}

.merge-list {
  display: flex;
  flex-direction: column;
}

.merge-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.merge-row:last-child {
  border-bottom: none;
}

.merge-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.merge-date {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.merge-chevron {
  color: var(--el-text-color-secondary);
}

.merge-summary {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
}

.merge-details {
  margin-top: 8px;
}
</style>
