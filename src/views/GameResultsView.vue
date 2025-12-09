<template>
  <div class="game-results-view">
    <el-container v-loading="loading">
      <el-main>
        <div v-if="error" class="error">
          <el-alert
            title="Ошибка загрузки"
            :description="error"
            type="error"
            show-icon
            :closable="false"
          />
        </div>

        <div v-else-if="gameData">
          <!-- Информация об игре -->
          <el-card class="game-info-card">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <h2 class="game-title">{{ gameData.label || 'Игра' }}</h2>
                  <el-tag
                    :type="getResultType(gameData.result)"
                    :class="{ 'mafia-win-tag': gameData.result === 'mafia_win' }"
                    size="large"
                    class="result-tag"
                  >
                    {{ getResultLabel(gameData.result) }}
                  </el-tag>
                </div>
                <div class="header-right">
                  <el-icon><InfoFilled /></el-icon>
                  <span>Информация об игре</span>
                </div>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :span="8">
                <div class="info-item">
                  <span class="info-label">Событие:</span>
                  <span class="info-value">{{ gameData.event?.label || '—' }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <span class="info-label">Стол:</span>
                  <span class="info-value">{{ gameData.table_name || '—' }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <span class="info-label">Судья:</span>
                  <span class="info-value">{{ gameData.game_master?.nickname || '—' }}</span>
                </div>
              </el-col>
            </el-row>

            <el-row :gutter="16" class="mt-3">
              <el-col :span="8">
                <div class="info-item">
                  <span class="info-label">Дата начала:</span>
                  <span class="info-value">{{ formatDateTime(gameData.started_at) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <span class="info-label">Этап:</span>
                  <span class="info-value">
                    {{ getStageLabel(gameData.stage_id) }}
                  </span>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- Таблица игроков -->
          <el-card class="players-table-card">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><User /></el-icon>
                  <span>Результаты игроков</span>
                </div>
                <div class="header-actions">
                  <el-button
                    type="primary"
                    size="small"
                    :loading="saving"
                    :disabled="!hasChanges"
                    @click="saveChanges"
                  >
                    Сохранить изменения
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="sortedPlayers"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column
                label="№"
                width="60"
                align="center"
              >
                <template #default="{ row }">
                  {{ row.box_id }}
                </template>
              </el-table-column>

              <el-table-column
                label="Игрок"
                min-width="150"
              >
                <template #default="{ row }">
                  {{ row.nickname }}
                </template>
              </el-table-column>

              <el-table-column
                label="Роль"
                width="140"
                align="center"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="getRoleTagType(row.role)"
                    :class="{ 'role-tag-black': isBlackRole(row.role) }"
                  >
                    {{ getRoleLabel(row.role) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column
                label="Авто баллы"
                width="110"
                align="center"
              >
                <template #default="{ row }">
                  <span :class="getScoreClass(row.auto_points)">
                    {{ formatScore(row.auto_points) }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column
                label="Доп. баллы"
                width="150"
                align="center"
              >
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.extra_points"
                    :min="0"
                    :max="10"
                    :step="0.1"
                    :precision="1"
                    size="small"
                    controls-position="right"
                    @change="handlePlayerChange(row)"
                  />
                </template>
              </el-table-column>

              <el-table-column
                label="Штрафы"
                width="150"
                align="center"
              >
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.penalty_points"
                    :min="0"
                    :max="10"
                    :step="0.1"
                    :precision="1"
                    size="small"
                    controls-position="right"
                    @change="handlePlayerChange(row)"
                  />
                </template>
              </el-table-column>

              <el-table-column
                label="Комментарий"
                min-width="250"
                class-name="comment-column"
              >
                <template #default="{ row }">
                  <el-input
                    v-model="row.comment"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 10 }"
                    placeholder="Добавить комментарий..."
                    size="small"
                    clearable
                    @change="handlePlayerChange(row)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { InfoFilled, User } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { LABELS } from '@/utils/uiConstants'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const gameData = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref(null)
const changedPlayers = ref(new Set())

const sortedPlayers = computed(() => {
  if (!gameData.value?.players) return []
  return [...gameData.value.players].sort((a, b) => a.box_id - b.box_id)
})

const hasChanges = computed(() => changedPlayers.value.size > 0)

const loadGame = async () => {
  loading.value = true
  error.value = null

  try {
    gameData.value = await apiService.getGame(props.id)
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить данные игры'
    console.error('Error loading game:', e)
  } finally {
    loading.value = false
  }
}

const handlePlayerChange = (player) => {
  changedPlayers.value.add(player.id)
}

const saveChanges = async () => {
  if (!hasChanges.value) return

  saving.value = true
  try {
    // Подготавливаем данные для отправки
    const playersData = sortedPlayers.value.map(player => ({
      box_id: player.box_id,
      extra_points: player.extra_points || 0,
      penalty_points: player.penalty_points || 0,
      comment: player.comment || null
    }))

    await apiService.setPlayersPoints(props.id, playersData)

    changedPlayers.value.clear()
    ElMessage.success('Изменения сохранены')

    // Перезагружаем данные
    await loadGame()
  } catch (e) {
    console.error('Error saving changes:', e)
    ElMessage.error('Не удалось сохранить изменения')
  } finally {
    saving.value = false
  }
}

const formatScore = (score) => {
  if (!score && score !== 0) return '0'
  const rounded = Math.round(score * 10) / 10
  return rounded >= 0 ? `+${rounded}` : `${rounded}`
}

const getScoreClass = (score) => {
  if (!score) return ''
  return score > 0 ? 'positive-score' : 'negative-score'
}

const getRoleLabel = (role) => {
  return LABELS.ROLES[role] || role
}

const getRoleTagType = (role) => {
  const types = {
    'civilian': 'info',
    'sheriff': 'danger',
    'mafia': undefined,
    'don': undefined
  }
  return types[role]
}

const isBlackRole = (role) => {
  return role === 'mafia' || role === 'don'
}

const getResultType = (result) => {
  const types = {
    'civilians_win': 'danger',
    'mafia_win': undefined,
    'draw': 'warning'
  }
  return types[result] || 'info'
}

const getResultLabel = (result) => {
  return LABELS.RESULTS[result] || result
}

const getStageLabel = (stageId) => {
  if (!gameData.value?.event?.stages) return '—'
  const stage = gameData.value.event.stages.find(s => s.id === stageId)
  return stage?.label || `Этап ${stageId}`
}

const formatDateTime = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' ' + date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadGame()
})
</script>

<style scoped>
.game-results-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #909399;
  font-size: 14px;
}

.game-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.result-tag {
  font-size: 14px;
  padding: 6px 12px;
  font-weight: 600;
}

.game-info-card {
  margin-bottom: 20px;
}

.players-table-card {
  margin-bottom: 20px;
}

.players-table-card .card-header {
  gap: 8px;
}

.players-table-card .header-left {
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.info-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.mt-3 {
  margin-top: 12px;
}

.positive-score {
  color: #67c23a;
  font-weight: 600;
}

.negative-score {
  color: #f56c6c;
  font-weight: 600;
}

.role-tag-black {
  background-color: #606266 !important;
  border-color: #606266 !important;
  color: white !important;
}

.mafia-win-tag {
  background-color: #606266 !important;
  border-color: #606266 !important;
  color: white !important;
}

.error {
  margin-bottom: 20px;
}

/* Стили для колонки комментариев */
:deep(.comment-column) {
  padding: 12px 8px;
}

:deep(.comment-column .cell) {
  padding: 0;
  overflow: visible;
}

:deep(.comment-column .el-textarea__inner) {
  resize: none;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }

  .header-right {
    align-self: flex-end;
  }

  .game-title {
    font-size: 18px;
  }

  .result-tag {
    font-size: 12px;
    padding: 4px 10px;
  }
}
</style>
