<template>
  <div class="ratings-view">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Рейтинг игроков</h1>
        </div>
      </el-header>

      <el-main>
        <!-- Фильтр по месяцам -->
        <el-card style="margin-bottom: 20px;">
          <el-form :inline="true">
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
          </el-form>
        </el-card>

        <!-- Таблица рейтинга -->
        <el-card>
          <el-table
            :data="ratings"
            :loading="loading"
            style="width: 100%"
            stripe
          >
            <el-table-column
              prop="position"
              label="Место"
              width="80"
              align="center"
            />

            <el-table-column
              prop="user.nickname"
              label="Игрок"
              min-width="180"
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
              width="120"
              align="center"
            >
              <template #default="scope">
                <el-tag
                  type="success"
                  size="large"
                  effect="dark"
                >
                  {{ formatPoints(scope.row.all_points_summary) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              prop="auto_points_summary"
              label="Авто-баллы"
              width="120"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.auto_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="extra_points_summary"
              label="Доп. баллы"
              width="120"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.extra_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="penalty_points_summary"
              label="Штраф"
              width="100"
              align="center"
            >
              <template #default="scope">
                <span class="points-value penalty">{{ formatPoints(scope.row.penalty_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="best_move_points_summary"
              label="Лучший ход"
              width="130"
              align="center"
            >
              <template #default="scope">
                <span class="points-value">{{ formatPoints(scope.row.best_move_points_summary) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="ci_summary"
              label="CI"
              width="100"
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

// Состояние
const loading = ref(false)
const ratings = ref([])
const selectedYear = ref('')
const selectedMonth = ref('')

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
      end_date: `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
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
  loadRatings()
}

const formatPoints = (points) => {
  if (points === null || points === undefined) return '0'
  return Number(points).toFixed(2)
}

// Загрузка данных при монтировании
onMounted(() => {
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
