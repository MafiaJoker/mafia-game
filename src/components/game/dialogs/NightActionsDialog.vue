<template>
  <el-dialog
    v-model="visible"
    width="800px"
    :fullscreen="isMobile"
  >
    <template #header>
      <DialogTimerHeader title="Ночь" />
    </template>

    <div class="night-container">
      <!-- Отстрел мафии -->
      <div class="action-row">
        <div class="action-label">
          <span>Отстрел мафии</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in activePlayers"
            :key="player.box_id"
            size="small"
            @click="setKilledPlayer(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="danger"
            size="small"
            plain
            @click="setKilledPlayer(null)"
            class="action-btn-miss"
          >
            Промах
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Проверка дона -->
      <div class="action-row">
        <div class="action-label">
          <span>Проверка дона</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in allPlayers"
            :key="player.box_id"
            size="small"
            @click="setDonCheck(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="info"
            size="small"
            plain
            @click="setDonCheck(null)"
            class="action-btn-miss"
          >
            Не проснулся
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Проверка шерифа -->
      <div class="action-row">
        <div class="action-label">
          <span>Проверка шерифа</span>
        </div>
        <div class="action-buttons">
          <el-button
            v-for="player in allPlayers"
            :key="player.box_id"
            size="small"
            @click="setSheriffCheck(player.box_id)"
            class="action-btn"
          >
            {{ player.box_id }}
          </el-button>
          <el-button
            type="info"
            size="small"
            plain
            @click="setSheriffCheck(null)"
            class="action-btn-miss"
          >
            Не проснулся
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- Настройки -->
      <div class="settings-row">
        <el-checkbox v-model="showNightResults">
          Показывать результаты ночных действий
        </el-checkbox>
      </div>
    </div>

    <template #footer>
      <el-button
        :type="nightRemovedBoxIds.length ? 'danger' : 'default'"
        :plain="nightRemovedBoxIds.length > 0"
        @click="removeDialogVisible = true"
      >
        {{ nightRemoveLabel }}
      </el-button>
      <el-button
        type="primary"
        @click="handleNextRound"
      >
        Продолжить
      </el-button>
    </template>
  </el-dialog>

  <!-- Удаление ночью — редкое действие, поэтому живёт в модалке, как и дневное,
       а не занимает четвёртую строку ночи. Соседом ночного диалога, а не его
       содержимым: el-dialog не выносит себя в body, и вложенная модалка попала
       бы в прокручиваемое тело ночи. Пишет своё поле круга — счётчик автоничьей
       iMafia считает ночи, и половина круга решает судьбу окна ничьей -->
  <RemovePlayersDialog
    v-model="removeDialogVisible"
    title="Удалить игрока ночью"
    phase-field="night_removed_box_ids"
    :players-data="activePlayers"
    :phase-data="phaseData"
    @update:phase-data="emit('update:phaseData', $event)"
    @accept="handleNightRemoveAccept"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { GameRolesEnum } from '@/utils/constants.js'
import DialogTimerHeader from './DialogTimerHeader.vue'
import RemovePlayersDialog from './RemovePlayersDialog.vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

const props = defineProps({
  modelValue: Boolean,
  playersData: {
    type: Array,
    default: () => []
  },
  phaseData: {
    type: Object,
    default: () => ({})
  },
  phaseId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'update:phaseData', 'show-best-move', 'next-round'])

const { isMobile } = useBreakpoints()
const showNightResults = ref(true)
const removeDialogVisible = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Активные игроки — для отстрела и ночного удаления. Ночь идёт после дня:
// заголосованный и удалённый днём уже вне игры. Список чистим здесь, а не
// надеемся на судью: бек отвергает круг, где игрок покинул его и днём, и
// ночью (app/game/serializers.py: check_round_halves_do_not_overlap), а
// круг уезжает одним PATCH — 400 унесёт и отстрел, и проверки, и голосование
const activePlayers = computed(() => {
  const dayLeftBoxIds = [
    ...(props.phaseData.voted_box_ids || []),
    ...(props.phaseData.removed_box_ids || [])
  ]
  return props.playersData.filter(p => p.is_in_game && !dayLeftBoxIds.includes(p.box_id))
})

// Все игроки (для проверок дона и шерифа)
const allPlayers = computed(() => {
  return props.playersData
})

// Установить убитого игрока
const setKilledPlayer = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    killed_box_id: boxId
  }

  // Промах после выбранной жертвы: ЛХ выдаётся только первому отстрелянному,
  // без отстрела бек его в рейтинг не берёт
  if (boxId === null) {
    updatedPhaseData.best_move = []
  }

  emit('update:phaseData', updatedPhaseData)

  // Подтверждение мигает и гаснет: ночью экран не должен ничего рассказывать
  // игроку, которого ведущий разбудил не вовремя
  if (showNightResults.value) {
    ElMessage({
      message: boxId === null ? 'Промах' : `Убит игрок ${boxId}`,
      type: boxId === null ? 'info' : 'warning',
      duration: 1000
    })
  }
}

// Проверка дона
const setDonCheck = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    don_checked_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)

  if (boxId !== null && showNightResults.value) {
    // Проверяем, является ли игрок шерифом
    const player = props.playersData.find(p => p.box_id === boxId)

    if (player) {
      if (player.role === GameRolesEnum.sheriff) {
        ElMessage({
          message: 'Проверенный игрок шериф',
          type: 'success',
          duration: 1000
        })
      } else {
        ElMessage({
          message: 'Проверенный игрок не шериф',
          type: 'error',
          duration: 1000
        })
      }
    }
  }
}

// Проверка шерифа
const setSheriffCheck = (boxId) => {
  const updatedPhaseData = {
    ...props.phaseData,
    sheriff_checked_box_id: boxId
  }
  emit('update:phaseData', updatedPhaseData)

  if (boxId !== null && showNightResults.value) {
    // Проверяем, является ли игрок мафией или доном
    const player = props.playersData.find(p => p.box_id === boxId)

    if (player) {
      if (player.role === GameRolesEnum.mafia || player.role === GameRolesEnum.don) {
        ElMessage({
          message: 'Игрок мафия',
          type: 'warning',
          duration: 1000,
          customClass: 'black-toast'
        })
      } else {
        ElMessage({
          message: 'Игрок мирный',
          type: 'error',
          duration: 1000
        })
      }
    }
  }
}

const nightRemovedBoxIds = computed(() => props.phaseData.night_removed_box_ids || [])

// Модалка закрывается, а удаление должно остаться на виду: кнопка, которая её
// открывает, и есть индикатор — судья видит, кого уводит эта ночь
const nightRemoveLabel = computed(() => (
  nightRemovedBoxIds.value.length
    ? `Удалено: ${nightRemovedBoxIds.value.join(', ')}`
    : 'Удалить игрока'
))

// Подтверждение мигает и гаснет, как у отстрела. Отстрелянного удалить можно —
// бек это разрешает, запрещён только выход в обеих половинах круга
const handleNightRemoveAccept = () => {
  const boxIds = nightRemovedBoxIds.value
  if (!showNightResults.value || !boxIds.length) return

  ElMessage({
    message: boxIds.length === 1
      ? `Удалён игрок ${boxIds[0]}`
      : `Удалены игроки ${boxIds.join(', ')}`,
    type: 'warning',
    duration: 1000
  })
}

// Лучший ход спрашиваем только за первый отстрел
const bestMoveRequired = computed(() => {
  return props.phaseId === 1 && props.phaseData.killed_box_id != null
})

// Обработчик "Следующий круг" или "Лучший ход"
const handleNextRound = () => {
  if (bestMoveRequired.value) {
    // Первая ночь с отстрелом — показываем модальное окно лучшего хода
    emit('show-best-move')
  } else {
    // Иначе переходим к следующему кругу
    emit('next-round')
  }

  // Закрываем диалог
  visible.value = false
}
</script>

<style scoped>
.night-container {
  padding: 8px 0;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
  min-height: 60px;
}

.action-row:hover {
  background-color: #ecf5ff;
}

.action-label {
  flex: 0 0 150px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 1;
}

.action-btn {
  min-width: 40px;
  padding: 8px 12px;
  margin: 0;
  flex-shrink: 0;
}

.action-btn-miss {
  min-width: 100px;
  margin-left: 12px;
}

.settings-row {
  padding: 12px 16px;
  display: flex;
  justify-content: center;
}

:deep(.el-divider) {
  margin: 16px 0;
}
/* Планшет: кнопки номеров крупнее, под палец */
@media (max-width: 1023px) {
  .action-btn {
    min-width: 44px;
    height: 36px;
  }
}

/* Телефон: подпись действия сверху, номера игроков сеткой под ней */
@media (max-width: 767px) {
  .action-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px;
  }

  .action-label {
    flex: none;
  }

  .action-buttons {
    justify-content: flex-start;
    gap: 6px;
  }

  .action-btn {
    min-width: 48px;
    height: 44px;
    padding: 8px;
    font-size: 16px;
  }

  .action-btn-miss {
    flex: 1 1 auto;
    height: 44px;
    margin-left: 0;
  }

  .settings-row {
    padding: 8px 0 0;
  }

  :deep(.el-divider) {
    margin: 12px 0;
  }
}
</style>

<style>
/* Черный тост для проверки шерифа на мафию */
.black-toast {
  background-color: #303133 !important;
}

.black-toast .el-message__content {
  color: white !important;
}

.black-toast .el-message__icon {
  color: white !important;
}
</style>
