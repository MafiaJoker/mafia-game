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
            <!-- Отсечка по числу игр: считает её сервер, здесь только значение -->
            <el-form-item label="Минимум игр">
              <el-input-number
                v-model="minGames"
                :min="0"
                :max="99"
                :step="1"
                controls-position="right"
                @change="handleFilterChange"
                style="width: 120px"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Телефон: место, ник и средний балл в строке, остальное раскрывается по тапу -->
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
                <span class="rating-player">
                  <span class="rating-name">{{ row.user.nickname }}</span>
                  <span class="rating-subline">
                    {{ gamesLabel(row.games_counter) }} · побед {{ formatPercent(row.win_percentage) }}
                  </span>
                </span>
                <el-tag type="success" effect="dark" class="rating-average">
                  ср. {{ formatPoints(row.average_points_per_game) }}
                </el-tag>
                <el-icon class="rating-chevron"><ArrowDown /></el-icon>
              </div>

              <el-collapse-transition>
                <div v-show="isExpanded(row.user.id)" class="rating-details">
                  <div class="rating-detail">
                    <span>Всего</span>
                    <span class="points-value">{{ formatPoints(row.all_points_summary) }}</span>
                  </div>
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

                  <div class="roles-block">
                    <div class="roles-title">Побед по ролям</div>
                    <div
                      v-for="role in rolesStats(row)"
                      :key="role.key"
                      class="rating-detail"
                    >
                      <span :class="['role-name', `role-${role.key}`]">{{ role.label }}</span>
                      <span v-if="role.played" class="role-result">
                        <span class="points-value">{{ formatPercent(role.winPercentage) }}</span>
                        <span class="role-games">{{ gamesLabel(role.games) }}</span>
                      </span>
                      <span v-else class="role-empty">игр нет</span>
                    </div>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>

          <div v-if="!loading && ratings.length === 0" class="empty-state">
            <el-empty :description="emptyDescription" />
          </div>
        </el-card>

        <!-- Таблица рейтинга -->
        <el-card v-else>
          <el-table
            ref="tableRef"
            :data="ratings"
            :loading="loading"
            :row-key="rowKey"
            row-class-name="rating-table-row"
            style="width: 100%"
            stripe
            @row-click="handleRowClick"
          >
            <!-- Разбивка по ролям: по клику на строку, отдельными колонками
                 не вынести - это четыре роли на каждого игрока -->
            <el-table-column type="expand">
              <template #default="scope">
                <div class="row-expand">
                  <div class="roles-title">Побед по ролям</div>
                  <div class="roles-grid">
                    <div
                      v-for="role in rolesStats(scope.row)"
                      :key="role.key"
                      class="role-cell"
                      :class="{ 'is-empty': !role.played }"
                    >
                      <span :class="['role-name', `role-${role.key}`]">{{ role.label }}</span>
                      <template v-if="role.played">
                        <span class="points-value">{{ formatPercent(role.winPercentage) }}</span>
                        <span class="role-games">{{ gamesLabel(role.games) }}</span>
                      </template>
                      <span v-else class="role-empty">игр нет</span>
                    </div>
                  </div>

                  <!-- На планшете разбивка по типам баллов в таблицу не влезает -->
                  <template v-if="isTablet">
                    <div class="roles-title points-title">Баллы</div>
                    <div class="roles-grid">
                      <div class="role-cell">
                        <span class="role-name">Авто-баллы</span>
                        <span class="points-value">{{ formatPoints(scope.row.auto_points_summary) }}</span>
                      </div>
                      <div class="role-cell">
                        <span class="role-name">Доп. баллы</span>
                        <span class="points-value">{{ formatPoints(scope.row.extra_points_summary) }}</span>
                      </div>
                      <div class="role-cell">
                        <span class="role-name">Штраф</span>
                        <span class="points-value penalty">{{ formatPoints(scope.row.penalty_points_summary) }}</span>
                      </div>
                      <div class="role-cell">
                        <span class="role-name">Лучший ход</span>
                        <span class="points-value">{{ formatPoints(scope.row.best_move_points_summary) }}</span>
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              prop="position"
              label="Место"
              :width="isTablet ? 70 : 76"
              align="center"
            />

            <el-table-column
              prop="user.nickname"
              label="Игрок"
              :min-width="140"
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
              :width="isTablet ? 96 : 100"
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

            <!-- Средний балл - метрика, по которой сервер строит порядок -->
            <el-table-column
              prop="average_points_per_game"
              :label="isTablet ? 'Средний' : 'Средний балл'"
              :width="isTablet ? 96 : 112"
              align="center"
            >
              <template #default="scope">
                <span class="average-value">{{ formatPoints(scope.row.average_points_per_game) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="games_counter"
              label="Игр"
              :width="isTablet ? 64 : 70"
              align="center"
            >
              <template #default="scope">
                <span class="games-value">{{ scope.row.games_counter ?? 0 }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="win_percentage"
              :label="isTablet ? 'Побед' : 'Побед, %'"
              :width="isTablet ? 88 : 96"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPercent(scope.row.win_percentage) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-if="!isTablet"
              prop="auto_points_summary"
              label="Авто-баллы"
              :width="92"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.auto_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-if="!isTablet"
              prop="extra_points_summary"
              label="Доп. баллы"
              :width="92"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.extra_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-if="!isTablet"
              prop="penalty_points_summary"
              label="Штраф"
              :width="84"
              align="center"
            >
              <template #default="scope">
                <span class="points-value penalty">{{ formatPoints(scope.row.penalty_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-if="!isTablet"
              prop="best_move_points_summary"
              label="Лучший ход"
              :width="100"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.best_move_points_summary) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!loading && ratings.length === 0" class="empty-state">
            <el-empty :description="emptyDescription" />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '@/services/api'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

const { isMobile, isTablet } = useBreakpoints()

// Отсечка по числу сыгранных игр: у одной-двух игр средний балл и процент
// побед ничего не значат, поэтому по умолчанию рейтинг начинается с пяти
const DEFAULT_MIN_GAMES = 5

// Порядок ролей в раскрытом блоке: мирный, шериф, мафия, дон
const ROLES = [
  { key: 'civilian', label: 'Мирный' },
  { key: 'sheriff', label: 'Шериф' },
  { key: 'mafia', label: 'Мафия' },
  { key: 'don', label: 'Дон' }
]

// Состояние
const loading = ref(false)
const ratings = ref([])
const selectedYear = ref('')
const selectedMonth = ref('')
const selectedRuleSystem = ref('fiim')
const ruleSystems = ref([])
const minGames = ref(DEFAULT_MIN_GAMES)
const tableRef = ref(null)

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

const rowKey = (row) => row.user.id

// Пустая таблица с отсечкой чаще означает не «игр не было», а «никто не набрал»
const emptyDescription = computed(() => (
  minGames.value
    ? `За выбранный период нет игроков с ${minGames.value} и более играми`
    : 'Нет данных за выбранный период'
))

// В таблице раскрывает не только стрелка, но и клик по строке игрока
const handleRowClick = (row) => {
  tableRef.value?.toggleRowExpansion(row)
}

// Роли, за которые игрок в периоде не играл, сервер отдаёт с нулём игр:
// пустое и настоящее нулевое надо различать, поэтому played - отдельный флаг
const rolesStats = (row) => ROLES.map(({ key, label }) => {
  const stats = row.roles_stats?.[key]
  const games = stats?.games_counter ?? 0
  return {
    key,
    label,
    games,
    winPercentage: stats?.win_percentage ?? 0,
    played: games > 0
  }
})

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
      rule_system: selectedRuleSystem.value,
      // очищенное поле - это «все игроки», а не отсутствие параметра
      min_games: minGames.value ?? 0
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

// Процент побед считает сервер, на клиенте только знак и один знак после запятой
const formatPercent = (percentage) => `${Number(percentage ?? 0).toFixed(1)}%`

const gamesLabel = (games) => {
  const count = games ?? 0
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10
  if (tail === 1) return `${count} игра`
  if (tail >= 2 && tail <= 4) return `${count} игры`
  return `${count} игр`
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

/* Средний балл - по нему сервер строит порядок, поэтому он заметнее прочих */
.average-value {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.games-value {
  font-weight: 600;
  color: #606266;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* Строка таблицы раскрывается по клику - показываем это курсором */
:deep(.rating-table-row) {
  cursor: pointer;
}

.row-expand {
  padding: 4px 16px 12px 48px;
}

.roles-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #909399;
}

.points-title {
  margin-top: 16px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 220px));
  justify-content: start;
  gap: 8px;
}

.role-cell {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f5f7fa;
}

.role-cell.is-empty {
  opacity: 0.6;
}

.role-name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  color: #606266;
}

.role-name.role-civilian,
.role-name.role-sheriff {
  color: #c45656;
}

.role-name.role-mafia,
.role-name.role-don {
  color: #303133;
}

.role-games {
  font-size: 12px;
  color: #909399;
}

.role-empty {
  font-size: 13px;
  color: #a8abb2;
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

  .row-expand {
    padding: 4px 12px 12px 24px;
  }

  /* Четыре роли (и четыре типа баллов) ложатся в 2x2, а не 3 + сирота */
  .roles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Телефон */
@media (max-width: 767px) {
  .header-content h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  /* Четыре фильтра в сетку 2x2, подписи над полями */
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

.rating-player {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rating-name {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Число игр рядом с процентом: 100% за одну игру и за двадцать - разные вещи */
.rating-subline {
  font-size: 12px;
  color: #909399;
}

.rating-average {
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

.roles-block {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
}

.role-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
</style>
