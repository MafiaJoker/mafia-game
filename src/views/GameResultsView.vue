<template>
  <div class="game-results-view" :class="{ 'is-mobile': isMobile }">
    <el-container v-loading="loading">
      <el-main>
        <div class="results-header">
          <el-button :icon="ArrowLeft" @click="goToEvent">
            К мероприятию
          </el-button>
        </div>

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
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Событие:</span>
                  <span class="info-value">{{ gameData.event?.label || '—' }}</span>
                </div>
              </el-col>
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Стол:</span>
                  <span class="info-value">{{ gameData.table_name || '—' }}</span>
                </div>
              </el-col>
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Судья:</span>
                  <span class="info-value">{{ gameData.game_master?.nickname || '—' }}</span>
                </div>
              </el-col>
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Дата начала:</span>
                  <span class="info-value">{{ formatDateTime(gameData.started_at) }}</span>
                </div>
              </el-col>
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Этап:</span>
                  <span class="info-value">
                    {{ getStageLabel(gameData.stage_id) }}
                  </span>
                </div>
              </el-col>
              <el-col :xs="12" :sm="8">
                <div class="info-item">
                  <span class="info-label">Система правил:</span>
                  <span class="info-value">{{ gameData.event?.rule_system?.label || '—' }}</span>
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
                <!-- На телефоне кнопка сохранения прибита к низу экрана -->
                <div v-if="!isMobile" class="header-actions">
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

            <!-- Телефон: карточка на игрока - поля баллов и комментарий
                 в таблице на семь колонок в экран не встанут -->
            <div v-if="isMobile" class="players-cards">
              <div
                v-for="row in sortedPlayers"
                :key="row.id"
                class="player-result-card"
              >
                <div class="player-result-top">
                  <span class="player-result-number">{{ row.box_id }}</span>
                  <span class="player-result-name">{{ row.nickname }}</span>
                  <el-tag
                    v-if="isFirstKilled(row)"
                    type="warning"
                    size="small"
                    title="Первый убитый"
                  >
                    ПУ
                  </el-tag>
                  <el-tag
                    :type="getRoleTagType(row.role)"
                    :class="{ 'role-tag-black': isBlackRole(row.role) }"
                    size="small"
                  >
                    {{ getRoleLabel(row.role) }}
                  </el-tag>
                </div>

                <div v-if="isFirstKilled(row)" class="best-move-line">
                  <span class="best-move-label">ЛХ</span>
                  <span :class="getScoreClass(bestMove.points)">{{ bestMove.pointsText }}</span>
                  <span v-if="bestMove.note" class="best-move-note">· {{ bestMove.note }}</span>
                  <span v-if="bestMove.boxes" class="best-move-boxes">
                    <span
                      v-for="box in bestMove.boxes"
                      :key="box.boxId"
                      class="best-move-box"
                      :class="box.isBlack ? 'is-black' : 'is-red'"
                    >{{ box.boxId }}</span>
                  </span>
                </div>

                <div class="player-result-points">
                  <div class="points-field">
                    <span class="points-label">Авто</span>
                    <span class="points-auto" :class="getScoreClass(row.auto_points)">
                      {{ formatScore(row.auto_points) }}
                    </span>
                  </div>
                  <div class="points-field">
                    <span class="points-label">Доп. баллы</span>
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
                  </div>
                  <div class="points-field">
                    <span class="points-label">Штрафы</span>
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
                  </div>
                </div>

                <el-input
                  v-model="row.comment"
                  type="textarea"
                  :autosize="{ minRows: 1, maxRows: 6 }"
                  placeholder="Добавить комментарий..."
                  size="small"
                  clearable
                  @change="handlePlayerChange(row)"
                />
              </div>
            </div>

            <el-table
              v-else
              :data="sortedPlayers"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column
                label="№"
                :width="isTablet ? 50 : 60"
                align="center"
              >
                <template #default="{ row }">
                  {{ row.box_id }}
                </template>
              </el-table-column>

              <el-table-column
                label="Игрок"
                :min-width="isTablet ? 130 : 150"
              >
                <template #default="{ row }">
                  <div class="player-cell">
                    <div class="player-name-line">
                      <span>{{ row.nickname }}</span>
                      <el-tag
                        v-if="isFirstKilled(row)"
                        type="warning"
                        size="small"
                        title="Первый убитый"
                      >
                        ПУ
                      </el-tag>
                    </div>
                    <!-- Планшет: колонке роли места нет, роль уходит под ник -->
                    <el-tag
                      v-if="isTablet"
                      :type="getRoleTagType(row.role)"
                      :class="{ 'role-tag-black': isBlackRole(row.role) }"
                      size="small"
                    >
                      {{ getRoleLabel(row.role) }}
                    </el-tag>
                    <!-- И колонке ЛХ тоже: он есть у одного игрока, прочерки
                         остальных не стоят узкого комментария -->
                    <div v-if="isTablet && isFirstKilled(row)" class="best-move-line">
                      <span class="best-move-label">ЛХ</span>
                      <span :class="getScoreClass(bestMove.points)">{{ bestMove.pointsText }}</span>
                      <span v-if="bestMove.note" class="best-move-note">· {{ bestMove.note }}</span>
                      <span v-if="bestMove.boxes" class="best-move-boxes">
                        <span
                          v-for="box in bestMove.boxes"
                          :key="box.boxId"
                          class="best-move-box"
                          :class="box.isBlack ? 'is-black' : 'is-red'"
                        >{{ box.boxId }}</span>
                      </span>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column
                v-if="!isTablet"
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
                :label="isTablet ? 'Авто' : 'Авто баллы'"
                :width="isTablet ? 80 : 110"
                align="center"
              >
                <template #default="{ row }">
                  <span :class="getScoreClass(row.auto_points)">
                    {{ formatScore(row.auto_points) }}
                  </span>
                </template>
              </el-table-column>

              <!-- Место под колонку отдали допы, штрафы и комментарий: таблица
                   не шире, чем была без неё, и на 1024px комментарий не уезжает -->
              <el-table-column
                v-if="hasFirstKilledInfo && !isTablet"
                label="ЛХ"
                width="100"
                align="center"
              >
                <template #default="{ row }">
                  <div v-if="isFirstKilled(row)" class="best-move-cell">
                    <span :class="getScoreClass(bestMove.points)">{{ bestMove.pointsText }}</span>
                    <span v-if="bestMove.note" class="best-move-note">{{ bestMove.note }}</span>
                    <span v-if="bestMove.boxes" class="best-move-boxes">
                      <span
                        v-for="box in bestMove.boxes"
                        :key="box.boxId"
                        class="best-move-box"
                        :class="box.isBlack ? 'is-black' : 'is-red'"
                      >{{ box.boxId }}</span>
                    </span>
                  </div>
                  <span v-else class="no-best-move">—</span>
                </template>
              </el-table-column>

              <el-table-column
                label="Доп. баллы"
                :width="isTablet ? 120 : 130"
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
                    class="points-input"
                    @change="handlePlayerChange(row)"
                  />
                </template>
              </el-table-column>

              <el-table-column
                label="Штрафы"
                :width="isTablet ? 120 : 130"
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
                    class="points-input"
                    @change="handlePlayerChange(row)"
                  />
                </template>
              </el-table-column>

              <el-table-column
                label="Комментарий"
                :min-width="isTablet ? 160 : 190"
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

    <!-- Телефон: сохранение всегда под рукой, десять карточек с полями длинные -->
    <div v-if="isMobile && gameData && !error" class="mobile-save-bar">
      <el-button
        type="primary"
        class="mobile-save-btn"
        :loading="saving"
        :disabled="!hasChanges"
        @click="saveChanges"
      >
        Сохранить изменения
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, InfoFilled, User } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import { LABELS } from '@/utils/uiConstants'
import { useBreakpoints } from '@/composables/useBreakpoints'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const { isMobile, isTablet } = useBreakpoints()
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

// ПУ (застреленный первой ночью) и его лучший ход сервер отдаёт на уровне
// игры, null - первой ночью был промах. Сервер до backend#189 поля не знает:
// тогда нет ни отметки, ни колонки ЛХ
const hasFirstKilledInfo = computed(() => gameData.value?.first_killed !== undefined)

const isFirstKilled = (row) => gameData.value?.first_killed?.box_id === row.box_id

// Баллы за ЛХ (система правил, допы, множитель этапа) считает сервер, здесь
// только подписи к ним. Цвет названных боксов - по ролям из того же протокола
const bestMove = computed(() => {
  const firstKilled = gameData.value?.first_killed
  if (!firstKilled) return null

  const players = gameData.value.players || []
  const player = players.find(p => p.box_id === firstKilled.box_id)
  const points = player?.best_move_points || 0
  const roleByBox = new Map(players.map(p => [p.box_id, p.role]))
  const boxes = firstKilled.best_move_box_ids
  // Почему ЛХ без баллов, если это видно и без системы правил. Мафия застрелила
  // своего - чёрному ПУ ЛХ не положен, сколько бы чёрных он ни назвал
  let note = null
  if (firstKilled.is_black) {
    note = 'не положен'
  } else if (!boxes) {
    note = 'не заявлен'
  }

  return {
    points,
    // Отрицательным ЛХ не бывает, а ноль с плюсом читался бы как начисление
    pointsText: points > 0 ? formatScore(points) : '0',
    note,
    boxes: boxes
      ? boxes.map(boxId => ({ boxId, isBlack: isBlackRole(roleByBox.get(boxId)) }))
      : null
  }
})

// Завершённая игра уводит сюда через replace, поэтому «Назад» браузера ведёт
// к мероприятию - но искать выход в браузере судья не обязан
const goToEvent = () => {
  const eventId = gameData.value?.event?.id
  router.push(eventId ? `/event/${eventId}` : '/')
}

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

.results-header {
  margin-bottom: 16px;
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

.player-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.player-name-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

.best-move-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  line-height: 1.4;
}

.best-move-note {
  font-size: 12px;
  color: #909399;
}

.no-best-move {
  color: #c0c4cc;
}

/* ЛХ под ником на планшете и в карточке на телефоне. Не хватает места -
   номера боксов целиком уходят на следующую строку */
.best-move-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #606266;
}

.best-move-label {
  font-weight: 600;
  color: #909399;
}

.best-move-boxes {
  display: inline-flex;
  gap: 4px;
}

/* Кого назвал ПУ: номер бокса в цвете команды - те же красный и чёрный,
   что у бейджа роли на плашке эфира (RoleBadge) */
.best-move-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
}

.best-move-box.is-red {
  background-color: #c62828;
}

.best-move-box.is-black {
  background-color: #17181a;
}

.points-input {
  width: 100%;
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

/* Планшет и телефон */
@media (max-width: 1023px) {
  .game-results-view {
    min-height: auto;
  }

  .card-header {
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .game-title {
    font-size: 18px;
  }

  .header-right {
    display: none;
  }
}

/* Телефон */
@media (max-width: 767px) {
  /* Место под прибитую снизу кнопку сохранения */
  .game-results-view.is-mobile {
    padding-bottom: 76px;
  }

  .header-left {
    flex-wrap: wrap;
    gap: 8px;
  }

  .result-tag {
    font-size: 12px;
    padding: 4px 10px;
  }

  .info-item {
    padding: 4px 0;
  }

  .game-info-card,
  .players-table-card {
    margin-bottom: 12px;
  }
}

.players-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-result-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.player-result-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-result-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f7fa;
  font-weight: 700;
  color: #303133;
}

.player-result-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-result-points {
  display: grid;
  grid-template-columns: 56px 1fr 1fr;
  gap: 8px;
  align-items: end;
}

.points-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.points-field .el-input-number {
  width: 100%;
}

.points-label {
  font-size: 11px;
  color: #909399;
}

.points-auto {
  height: 24px;
  line-height: 24px;
  font-size: 15px;
  font-weight: 600;
}

.mobile-save-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}

.mobile-save-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
}
</style>
