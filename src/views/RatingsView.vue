<template>
  <div class="ratings-view" :class="{ 'is-mobile': isMobile }">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Рейтинг игроков</h1>
        </div>
      </el-header>

      <el-main>
        <!-- Фильтр по месяцам -->
        <el-card class="filters-card">
          <el-form :inline="true" class="filters-form">
            <el-form-item label="Год">
              <el-date-picker
                v-model="selectedYear"
                type="year"
                placeholder="Выберите год"
                @change="handleFilterChange"
                style="width: 120px"
                format="YYYY"
                value-format="YYYY"
              />
            </el-form-item>
            <el-form-item label="Месяц">
              <el-select
                v-model="selectedMonth"
                placeholder="Выберите месяц"
                @change="handleFilterChange"
                style="width: 150px"
              >
                <el-option
                  v-for="month in monthOptions"
                  :key="month.value"
                  :label="month.label"
                  :value="month.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Система правил">
              <el-select
                v-model="selectedRuleSystem"
                @change="handleFilterChange"
                style="width: 160px"
              >
                <el-option
                  v-for="ruleSystem in ruleSystems"
                  :key="ruleSystem.slug"
                  :label="ruleSystem.label"
                  :value="ruleSystem.slug"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Телефон: место, ник и итог в строке, разбивка баллов раскрывается по тапу -->
        <el-card v-if="isMobile" v-loading="loading" class="rating-list-card">
          <div v-if="ratings.length > 0" class="rating-list">
            <div
              v-for="row in ratings"
              :key="row.user.id"
              class="rating-row"
              :class="{ 'is-open': isExpanded(row.user.id) }"
              @click="toggleExpanded(row.user.id)"
            >
              <div class="rating-main">
                <span class="rating-position" :class="{ top: row.position <= 3 }">
                  {{ row.position }}
                </span>
                <span class="rating-name">{{ row.user.nickname }}</span>
                <el-tag type="success" effect="dark" class="rating-total">
                  {{ formatPoints(row.all_points_summary) }}
                </el-tag>
                <el-icon class="rating-chevron"><ArrowDown /></el-icon>
              </div>

              <el-collapse-transition>
                <div v-show="isExpanded(row.user.id)" class="rating-details">
                  <div class="rating-detail">
                    <span>Авто-баллы</span>
                    <span class="points-value">{{ formatPoints(row.auto_points_summary) }}</span>
                  </div>
                  <div class="rating-detail">
                    <span>Доп. баллы</span>
                    <span class="points-value">{{ formatPoints(row.extra_points_summary) }}</span>
                  </div>
                  <div class="rating-detail">
                    <span>Штраф</span>
                    <span class="points-value penalty">{{ formatPoints(row.penalty_points_summary) }}</span>
                  </div>
                  <div class="rating-detail">
                    <span>Лучший ход</span>
                    <span class="points-value">{{ formatPoints(row.best_move_points_summary) }}</span>
                  </div>
                  <div class="rating-detail">
                    <span>CI</span>
                    <span class="points-value">{{ formatPoints(row.ci_summary) }}</span>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>

          <div v-if="!loading && ratings.length === 0" class="empty-state">
            <el-empty description="Нет данных за выбранный период" />
          </div>
        </el-card>

        <!-- Таблица рейтинга -->
        <el-card v-else>
          <el-table
            :data="ratings"
            :loading="loading"
            style="width: 100%"
            stripe
          >
            <el-table-column
              prop="position"
              label="Место"
              :width="isTablet ? 76 : 80"
              align="center"
            />

            <el-table-column
              prop="user.nickname"
              label="Игрок"
              :min-width="isTablet ? 140 : 180"
            >
              <template #default="scope">
                <div class="player-cell">
                  <span class="player-name">{{ scope.row.user.nickname }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              prop="all_points_summary"
              label="Всего"
              :width="isTablet ? 96 : 120"
              align="center"
            >
              <template #default="scope">
                <el-tag
                  type="success"
                  :size="isTablet ? 'default' : 'large'"
                  effect="dark"
                >
                  {{ formatPoints(scope.row.all_points_summary) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              prop="auto_points_summary"
              :label="isTablet ? 'Авто' : 'Авто-баллы'"
              :width="isTablet ? 84 : 120"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.auto_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="extra_points_summary"
              :label="isTablet ? 'Доп.' : 'Доп. баллы'"
              :width="isTablet ? 84 : 120"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.extra_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="penalty_points_summary"
              label="Штраф"
              :width="isTablet ? 84 : 100"
              align="center"
            >
              <template #default="scope">
                <span class="points-value penalty">{{ formatPoints(scope.row.penalty_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="best_move_points_summary"
              :label="isTablet ? 'ЛХ' : 'Лучший ход'"
              :width="isTablet ? 72 : 130"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.best_move_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="ci_summary"
              label="CI"
              :width="isTablet ? 72 : 100"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.ci_summary) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!loading && ratings.length === 0" class="empty-state">
            <el-empty description="Нет данных за выбранный период" />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiService } from '@/services/api'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

const { isMobile, isTablet } = useBreakpoints()

// Состояние
const loading = ref(false)
const ratings = ref([])
const selectedYear = ref('')
const selectedMonth = ref('')
const selectedRuleSystem = ref('fiim')
const ruleSystems = ref([])

// Раскрытые строки списка на телефоне
const expandedIds = ref(new Set())

const isExpanded = (userId) => expandedIds.value.has(userId)

const toggleExpanded = (userId) => {
  const next = new Set(expandedIds.value)
  if (next.has(userId)) {
    next.delete(userId)
  } else {
    next.add(userId)
  }
  expandedIds.value = next
}

// Название месяцев на русском
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

// Генерация опций для месяцев
const generateMonthOptions = () => {
  const options = []

  // Добавляем все месяцы
  monthNames.forEach((name, index) => {
    options.push({
      label: name,
      value: (index + 1).toString()
    })
  })

  return options
}

const monthOptions = ref(generateMonthOptions())

// По умолчанию выбираем текущий год и месяц
const now = new Date()
selectedYear.value = now.getFullYear().toString()
selectedMonth.value = (now.getMonth() + 1).toString()

// Методы
const loadRatings = async () => {
  loading.value = true
  try {
    const year = parseInt(selectedYear.value)
    const month = parseInt(selectedMonth.value)

    // Первый день месяца
    const startDate = new Date(year, month - 1, 1)
    // Последний день месяца
    const endDate = new Date(year, month, 0)

    const params = {
      start_date: `${year}-${String(month).padStart(2, '0')}-01`,
      end_date: `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
      rule_system: selectedRuleSystem.value
    }

    const data = await apiService.getRatings(params)
    ratings.value = data || []
  } catch (error) {
    console.error('Failed to load ratings:', error)
    ElMessage.error('Не удалось загрузить рейтинг')
    ratings.value = []
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  expandedIds.value = new Set()
  loadRatings()
}

const formatPoints = (points) => {
  if (points === null || points === undefined) return '0'
  return Number(points).toFixed(2)
}

const loadRuleSystems = async () => {
  try {
    ruleSystems.value = await apiService.getRuleSystems()
  } catch (error) {
    console.error('Failed to load rule systems:', error)
    ruleSystems.value = []
  }
}

// Загрузка данных при монтировании
onMounted(() => {
  loadRuleSystems()
  loadRatings()
})
</script>

<style scoped>
.ratings-view {
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

.filters-card {
  margin-bottom: 20px;
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-name {
  font-weight: 500;
}

.points-value {
  font-weight: 600;
  color: #409eff;
}

.points-value.penalty {
  color: #f56c6c;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* Планшет и телефон */
@media (max-width: 1023px) {
  .ratings-view {
    min-height: auto;
  }

  .filters-card {
    margin-bottom: 12px;
  }

  /* Строчная форма фильтров: последний отступ в строке лишний */
  .filters-form :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}

/* Телефон */
@media (max-width: 767px) {
  .header-content h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  /* Год и месяц в одну строку, система правил под ними, подписи над полями */
  .filters-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .filters-form :deep(.el-form-item) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: auto;
    margin: 0;
  }

  .filters-form :deep(.el-form-item:last-child) {
    grid-column: 1 / -1;
  }

  .filters-form :deep(.el-form-item__label) {
    width: auto;
    height: auto;
    line-height: 1.4;
    padding: 0 0 4px;
    font-size: 12px;
    justify-content: flex-start;
    text-align: left;
  }

  .rating-list-card :deep(.el-card__body) {
    padding: 0 12px;
  }

  .empty-state {
    padding: 24px 0;
  }
}

.rating-list {
  display: flex;
  flex-direction: column;
}

.rating-row {
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.rating-row:last-child {
  border-bottom: none;
}

.rating-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 0;
}

.rating-position {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f7fa;
  font-weight: 700;
  color: #606266;
}

.rating-position.top {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.rating-name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rating-total {
  flex-shrink: 0;
  font-weight: 600;
}

.rating-chevron {
  flex-shrink: 0;
  color: #c0c4cc;
  transition: transform 0.2s;
}

.rating-row.is-open .rating-chevron {
  transform: rotate(180deg);
}

.rating-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  padding: 0 0 12px 42px;
}

.rating-detail {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
</style>
