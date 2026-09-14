<template>
  <span v-if="isPhaseStart || silence" class="round-speech-marks">
    <span v-if="isPhaseStart" class="speech-mark speech-mark--start">
      <el-icon><Microphone /></el-icon>
      <span>Начинает круг</span>
    </span>

    <!-- Третий фол мог прийти и до речи игрока: тогда судья переносит
         молчание на этот круг, а ошибившись - обратно -->
    <button
      v-if="silence && isSwitchable"
      type="button"
      class="speech-mark speech-mark--switchable"
      :class="`speech-mark--${silence}`"
      :disabled="saving"
      :title="SWITCH_HINTS[silence]"
      @click="switchSilence"
    >
      <el-icon><Mute /></el-icon>
      <span>{{ SILENCE_LABELS[silence] }}</span>
      <el-icon class="speech-mark-switch"><Switch /></el-icon>
    </button>
    <span
      v-else-if="silence"
      class="speech-mark"
      :class="`speech-mark--${silence}`"
    >
      <el-icon><Mute /></el-icon>
      <span>{{ SILENCE_LABELS[silence] }}</span>
    </span>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone, Mute, Switch } from '@element-plus/icons-vue'
import { apiService } from '@/services/api.js'

const props = defineProps({
  gameId: {
    type: String,
    required: true
  },
  // Круг, который играется сейчас: молчание переносится только в нём
  phaseId: {
    type: Number,
    default: null
  },
  // Игрок из состояния игры: box_id, is_in_game
  player: {
    type: Object,
    required: true
  },
  // Речь круга из состояния игры (MafiaJoker/backend#166):
  // { phaseStartBoxId, silentBoxIds, nextPhaseSilentBoxIds, lostSpeechBoxIds }
  roundSpeech: {
    type: Object,
    required: true
  },
  // Выбыл в этом круге по отметкам судьи: голосование и удаления сервер узнаёт
  // только с сохранением круга, а до тех пор is_in_game игрока прежний
  leftThisPhase: {
    type: Boolean,
    default: false
  }
})

// Ручки молчания отвечают состоянием игры целиком — отдаём его наружу, как FoulBadges
const emit = defineEmits(['saved'])

const SILENCE_LABELS = {
  current: 'Молчит в этом круге',
  next: 'Молчит в следующем круге'
}

const SWITCH_HINTS = {
  current: 'Нажмите, чтобы игрок молчал в следующем круге, а не в этом',
  next: 'Третий фол пришёл до речи игрока? Нажмите - он молчит уже в этом круге'
}

const saving = ref(false)

const isPhaseStart = computed(() => props.roundSpeech.phaseStartBoxId === props.player.box_id)

// current - молчит в этом круге, next - замолчит в следующем, null - говорит
const silence = computed(() => {
  const boxId = props.player.box_id
  if (props.roundSpeech.silentBoxIds.includes(boxId)) return 'current'
  if (props.roundSpeech.nextPhaseSilentBoxIds.includes(boxId)) return 'next'
  return null
})

// Круг молчания выбирают только лишившемуся речи в этом круге: перенесённое
// с прошлого круга молчание снимается правкой фола, а выбывшему молчать негде -
// после сохранения круга ручка молчания ответила бы на него 400
const isSwitchable = computed(() => (
  props.player.is_in_game
  && !props.leftThisPhase
  && props.roundSpeech.lostSpeechBoxIds.includes(props.player.box_id)
))

const switchSilence = async () => {
  const muteNow = silence.value === 'next'
  saving.value = true
  try {
    // Не переключатель, а намерение: повтор и двойной тап сервер не перевернёт
    const gameState = muteNow
      ? await apiService.addGamePhaseSilentBox(props.gameId, props.phaseId, props.player.box_id)
      : await apiService.deleteGamePhaseSilentBox(props.gameId, props.phaseId, props.player.box_id)
    emit('saved', gameState)
  } catch (error) {
    console.error('Failed to switch silence round:', error)
    // 400 - экран отстал от сервера: круг уже закрыт или фол поправили
    // в другой вкладке. Повтор не поможет, поможет перезагрузка
    ElMessage.error(error.response?.status === 400
      ? 'Состояние игры изменилось. Обновите страницу'
      : 'Не удалось перенести молчание')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.round-speech-marks {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.speech-mark {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 11px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.speech-mark--start {
  color: #529b2e;
  background-color: #f0f9eb;
  border-color: #d1edc4;
}

.speech-mark--current {
  color: #c45656;
  background-color: #fef0f0;
  border-color: #fcd3d3;
}

/* Появилась по третьему фолу - вспыхивает, чтобы судья успел решить,
   высказался ли уже игрок */
.speech-mark--next {
  color: #b88230;
  background-color: #fdf6ec;
  border-color: #f8e3c5;
  animation: speech-mark-appear 1.2s ease-out;
}

@keyframes speech-mark-appear {
  0%,
  40% {
    box-shadow: 0 0 0 4px #f3d19e;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* Переключатель выглядит меткой: действие редкое и внимания к себе не тянет */
.speech-mark--switchable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s;
}

/* Подсветка наведения - только под мышь: на планшете :hover залипает после тапа */
@media (hover: hover) {
  .speech-mark--switchable.speech-mark--current:hover:not(:disabled) {
    border-color: #c45656;
  }

  .speech-mark--switchable.speech-mark--next:hover:not(:disabled) {
    border-color: #b88230;
  }
}

.speech-mark--switchable:disabled {
  cursor: progress;
  opacity: 0.6;
}

.speech-mark-switch {
  opacity: 0.7;
}

/* Планшет и телефон: переключатель жмут пальцем во время игры - цель крупнее */
@media (max-width: 1023px) {
  .speech-mark {
    height: 26px;
    padding: 0 10px;
    border-radius: 13px;
    font-size: 13px;
  }

  .speech-mark--switchable {
    height: 32px;
    border-radius: 16px;
  }
}
</style>
