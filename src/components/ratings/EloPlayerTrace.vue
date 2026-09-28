<template>
  <el-card class="elo-trace-card">
    <template #header>
      <div class="trace-header">
        <div class="trace-heading">
          <div class="trace-title">
            <!-- Сюда уходит фокус с «Мой график»: кнопка пропадает после нажатия -->
            <span ref="titleRef" class="card-title" tabindex="-1">Динамика рейтинга</span>
            <HintTooltip :text="CHART_HINT" label="Как читать график" />
          </div>
          <div v-if="player" class="trace-player">
            <span class="trace-nickname">{{ player.nickname }}</span>
            <el-tag v-if="isMe" size="small" effect="plain" round>вы</el-tag>
          </div>
        </div>
        <el-button v-if="canShowMine" size="small" @click="showMine">Мой график</el-button>
      </div>
    </template>

    <div
      v-loading="loading && !points.length"
      class="trace-body"
      :class="{ 'is-refreshing': loading && points.length }"
    >
      <template v-if="points.length">
        <div class="trace-stats">
          <div class="trace-stat">
            <span class="stat-label">Рейтинг</span>
            <span class="stat-value">{{ lastPoint.rating }}</span>
          </div>
          <div class="trace-stat">
            <span class="stat-label">Игр</span>
            <span class="stat-value">{{ points.length }}</span>
          </div>
        </div>

        <EloTraceChart :points="points" :height="isMobile ? 200 : 240" />

        <div class="trace-caption">
          Последняя игра — {{ formatDay(lastPoint.played_at) }}
        </div>
      </template>

      <div v-else-if="!loading" class="trace-empty">
        <el-empty :description="emptyDescription" :image-size="72" />
        <el-button v-if="failed" size="small" @click="loadTrace">Повторить</el-button>
      </div>
    </div>

    <div v-if="isMe" class="trace-hint">
      Нажмите на игрока в списке, чтобы посмотреть его график
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { apiService } from '@/services/api'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { formatDay, formatGamesCount } from '@/utils/formatters'
import { ELO_ERROR_DETAILS, getEloErrorDetail } from '@/utils/errorMessages'
import HintTooltip from '@/components/common/HintTooltip.vue'
import EloTraceChart from './EloTraceChart.vue'

const props = defineProps({
  profileId: {
    type: String,
    required: true
  },
  // { id, nickname } - чей график; null - смотреть некого
  player: {
    type: Object,
    default: null
  },
  isMe: {
    type: Boolean,
    default: false
  },
  // Открыт чужой график, и есть свой, к которому вернуться
  canShowMine: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['reset'])

// Рейтинг меняется только в играх игрока, поэтому последняя точка и число в
// таблице совпадают. Объяснять стоит другое: на калибровке шаг в разы крупнее
// обычного, и без оговорки скачки в начале графика выглядят как ошибка
const CHART_HINT = 'Точка — рейтинг сразу после игры, игры идут по порядку. '
  + 'Первые игры — калибровка: рейтинг в них меняется сильнее'

const { isMobile } = useBreakpoints()

const trace = ref(null)
const loading = ref(false)
// Причина пустого графика: detail ELO-ручки, 'failed' - сбой, null - всё хорошо
const problem = ref(null)
const titleRef = ref(null)

// Ответы приходят не в том порядке, в каком ушли запросы: пока грузился
// прошлый игрок, успели выбрать следующего. Применяем только последний
let requestToken = 0

const points = computed(() => trace.value?.points || [])
const lastPoint = computed(() => points.value[points.value.length - 1])
const failed = computed(() => problem.value === 'failed')

const emptyDescription = computed(() => {
  if (!props.player) return 'Выберите игрока в списке'
  if (failed.value) return 'Не удалось загрузить график'
  // Профиль удалили или завели заново, пока страница открыта
  if (problem.value === ELO_ERROR_DETAILS.PROFILE_NOT_FOUND) {
    return 'Профиль рейтинга не найден. Обновите страницу'
  }
  if (problem.value === ELO_ERROR_DETAILS.PLAYER_NOT_FOUND) {
    return props.isMe
      ? 'У вас пока нет игр в этом рейтинге'
      : 'У игрока пока нет игр в этом рейтинге'
  }
  // На калибровке сервер отдаёт не точки, а сколько игр осталось: пока
  // рейтинг случаен, его и в таблице нет
  const left = trace.value?.calibration_games_left ?? 0
  if (left > 0) {
    const games = formatGamesCount(left, { accusative: true })
    return props.isMe
      ? `Вы на калибровке: до места в таблице осталось сыграть ${games}`
      : `Игрок на калибровке: до места в таблице ему осталось сыграть ${games}`
  }
  return 'Игр для графика пока нет'
})

// Кнопка пропадает вместе с чужим графиком. Фокус с неё переводим на
// заголовок карточки, иначе он улетел бы в начало страницы
const showMine = async () => {
  emit('reset')
  await nextTick()
  titleRef.value?.focus()
}

const loadTrace = async () => {
  const token = ++requestToken
  const playerId = props.player?.id
  if (!playerId || !props.profileId) {
    trace.value = null
    problem.value = null
    loading.value = false
    return
  }

  loading.value = true
  problem.value = null
  try {
    const data = await apiService.getEloPlayerTrace(playerId, { profile_id: props.profileId })
    if (token !== requestToken) return
    trace.value = data
  } catch (error) {
    if (token !== requestToken) return
    console.error('Failed to load ELO trace:', error)
    trace.value = null
    problem.value = getEloErrorDetail(error) || 'failed'
  } finally {
    if (token === requestToken) loading.value = false
  }
}

// Источники - по отдельности: геттер с массивом давал бы новый массив на
// каждый новый объект игрока, и клик по уже открытой строке грузил бы след
// заново
watch([() => props.profileId, () => props.player?.id], loadTrace, { immediate: true })
</script>

<style scoped>
.trace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.trace-heading {
  min-width: 0;
}

.trace-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.trace-player {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  min-width: 0;
}

.trace-nickname {
  font-weight: 500;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trace-body {
  min-height: 120px;
  transition: opacity 0.2s;
}

/* Пока грузится другой игрок, прежний график остаётся на месте, но тускнеет:
   без скачка разметки и мигания */
.trace-body.is-refreshing {
  opacity: 0.5;
}

.trace-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.trace-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f5f7fa;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.trace-caption {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.trace-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 12px;
}

.trace-empty :deep(.el-empty) {
  padding: 16px 0 8px;
}

.trace-hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
  font-size: 12px;
  color: #909399;
}

/* Телефон: показатели компактнее, число не переносится */
@media (max-width: 767px) {
  .trace-stat {
    padding: 6px 8px;
  }

  .stat-value {
    font-size: 17px;
  }
}
</style>
