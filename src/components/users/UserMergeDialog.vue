<template>
  <el-dialog
    v-model="visible"
    title="Объединение пользователей"
    width="860px"
    :close-on-click-modal="false"
    class="user-merge-dialog"
    @open="resetDialog"
  >
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="merge-alert"
      title="Слияние необратимо"
    >
      История источников переедет к основному, а сами учётки будут удалены.
      Отменить слияние нельзя ни в интерфейсе, ни в базе — удалённые учётки
      уже не восстановить.
    </el-alert>

    <!-- Состав слияния -->
    <div class="merge-block">
      <div class="merge-block-head">
        <span class="merge-block-title">Кого объединяем</span>
        <span class="merge-counter">
          Выбрано {{ participants.length }} из {{ MERGE_MAX_PARTICIPANTS }}
        </span>
      </div>

      <el-radio-group
        v-if="participants.length"
        v-model="targetId"
        class="participants-list"
      >
        <div
          v-for="participant in participants"
          :key="participant.id"
          class="participant-card"
          :class="{
            'is-target': participant.id === targetId,
            'is-source': targetId && participant.id !== targetId
          }"
        >
          <div class="participant-head">
            <el-radio :value="participant.id" class="participant-radio">
              Основной
            </el-radio>
            <span class="participant-nickname">{{ participant.nickname }}</span>
            <el-tag v-if="participant.id === targetId" type="success" size="small">
              Останется
            </el-tag>
            <el-tag v-else-if="targetId" type="danger" size="small">
              Будет удалён
            </el-tag>
            <el-button
              link
              type="danger"
              class="participant-remove"
              @click="removeParticipant(participant.id)"
            >
              Убрать
            </el-button>
          </div>

          <div class="participant-id">id: {{ participant.id }}</div>

          <div v-if="cardOf(participant.id)" class="participant-facts">
            <span class="fact">Игр сыграно: {{ cardOf(participant.id).played_games }}</span>
            <span class="fact">Отсужено: {{ cardOf(participant.id).mastered_games }}</span>
            <span class="fact">
              Telegram: {{ cardOf(participant.id).has_telegram ? 'есть' : 'нет' }}
            </span>
            <span class="fact">Роли: {{ rolesText(cardOf(participant.id).roles) }}</span>
            <el-tag v-if="cardOf(participant.id).is_unregistered" size="small">
              Незарегистрированный
            </el-tag>
          </div>
        </div>
      </el-radio-group>

      <div v-if="canAddMore" class="participant-search">
        <PlayerSearchInput
          v-model="searchQuery"
          :exclude-ids="participantIds"
          :allow-create="false"
          placeholder="Найдите пользователя по никнейму"
          @select="addParticipant"
        />
      </div>
      <div v-else class="merge-hint">
        Больше {{ MERGE_MAX_PARTICIPANTS }} участников сервер за раз не примет.
        Уберите лишнего, чтобы добавить другого
      </div>

      <div v-if="participants.length < 2" class="merge-hint">
        Добавьте хотя бы двух пользователей
      </div>
      <div v-else-if="!targetId" class="merge-hint">
        Отметьте основного: его учётка останется, остальные будут удалены
      </div>
    </div>

    <!-- Ошибки состава: их чинит выбор, а не повторный запрос -->
    <el-alert
      v-if="failure"
      :title="failure.message"
      type="error"
      :closable="false"
      show-icon
      class="merge-alert"
    >
      <div v-if="failure.errorCode" class="failure-detail">
        Код ошибки: {{ failure.errorCode }}
      </div>
      <div v-if="failure.mergeId" class="failure-detail">
        Запись в истории: {{ failure.mergeId }}
      </div>
      <div v-if="failure.missingIds?.length" class="failure-detail">
        Не найдены: {{ failure.missingIds.join(', ') }}
      </div>
    </el-alert>

    <!-- Общая игра: двое за разными боксами - это разные люди -->
    <div v-if="sharedGames.length" class="merge-block">
      <div class="merge-block-title">Общие игры</div>
      <div v-for="game in sharedGames" :key="game.game_id" class="shared-game">
        <div class="shared-game-head">
          <span class="shared-game-label">{{ game.label }}</span>
          <span class="shared-game-date">{{ formatDate(game.created_at, 'datetime') }}</span>
        </div>
        <div v-for="seat in game.seats" :key="seat.user_id" class="shared-seat">
          <span class="seat-nickname">{{ nicknameOf(seat.user_id) }}</span>
          <span class="fact">Бокс {{ seat.box_id }}</span>
          <span class="fact">Роль: {{ seatRole(seat.role) }}</span>
          <span v-if="seat.extra_points" class="fact">Допы: {{ seat.extra_points }}</span>
          <span v-if="seat.penalty_points" class="fact">Штрафы: {{ seat.penalty_points }}</span>
          <span v-if="seat.comment" class="fact">{{ seat.comment }}</span>
        </div>
      </div>
    </div>

    <!-- Привязок telegram несколько: молча терять вход нельзя -->
    <div v-if="telegramCandidates.length" class="merge-block">
      <div class="merge-block-title">Чей telegram оставить</div>
      <el-radio-group v-model="telegramOwnerId" class="telegram-owners">
        <el-radio
          v-for="candidate in telegramCandidates"
          :key="candidate.id"
          :value="candidate.id"
        >
          {{ candidate.nickname }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- Предпросмотр: тот же прогон, что и боевой, только откаченный -->
    <div v-loading="previewing" class="merge-preview">
      <template v-if="preview">
        <div class="merge-block">
          <div class="merge-block-title">Что получится</div>
          <div class="result-card">
            <div class="participant-head">
              <span class="participant-nickname">{{ preview.result.nickname }}</span>
              <el-tag type="success" size="small">После слияния</el-tag>
            </div>
            <div class="participant-facts">
              <span class="fact">Игр сыграно: {{ preview.result.played_games }}</span>
              <span class="fact">Отсужено: {{ preview.result.mastered_games }}</span>
              <span class="fact">
                Telegram: {{ preview.result.has_telegram ? 'есть' : 'нет' }}
              </span>
              <span class="fact">Роли: {{ rolesText(preview.result.roles) }}</span>
            </div>
            <div v-if="preview.roles_added.length" class="result-note">
              Добавятся роли: {{ rolesText(preview.roles_added) }}
            </div>
          </div>
        </div>

        <div class="merge-block">
          <div class="merge-block-title">Что переедет</div>
          <div v-for="row in movedRows" :key="row.sourceId" class="counters-row">
            <div class="counters-source">{{ row.nickname }}</div>
            <div class="counters-line">
              <span class="counters-label">Переедет:</span>
              <template v-if="row.moved.length">
                <span v-for="item in row.moved" :key="item.label" class="fact">
                  {{ item.label }}: {{ item.value }}
                </span>
              </template>
              <span v-else class="fact">переносить нечего</span>
            </div>
            <div v-if="row.dropped.length" class="counters-line">
              <span class="counters-label">Удалится как дубль:</span>
              <span v-for="item in row.dropped" :key="item.label" class="fact">
                {{ item.label }}: {{ item.value }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="preview.warnings.length" class="merge-block">
          <el-alert
            v-for="(warning, index) in preview.warnings"
            :key="index"
            :title="warningText(warning)"
            type="warning"
            :closable="false"
            show-icon
            class="merge-alert"
          />
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">Отмена</el-button>
        <el-button
          type="danger"
          :disabled="!canConfirm"
          :loading="merging"
          @click="confirmMerge"
        >
          Объединить
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import { getUserRoleLabel } from '@/utils/userRoles'
import { getUserMergeFailure, USER_MERGE_ERROR_MESSAGES } from '@/utils/errorMessages'
import { LABELS } from '@/utils/uiConstants'
import { formatDate } from '@/utils/formatters'

// Предел сервера (MERGE_MAX_PARTICIPANTS): основной плюс до четырёх источников.
// Меняется вместе с серверной константой, поэтому лежит одной строкой
const MERGE_MAX_PARTICIPANTS = 5

// Счётчики отчёта в порядке чтения: сначала то, ради чего слияние и затевают
const COUNTER_LABELS = [
  ['games', 'Игры'],
  ['mastered_games', 'Судейства'],
  ['registrations', 'Регистрации'],
  ['invoices', 'Счета'],
  ['shifts', 'Смены кассы'],
  ['tariffs', 'Тарифы'],
  ['avatars', 'Аватарки']
]

const WARNING_MESSAGES = {
  open_invoices: 'У основного больше одного незакрытого счёта на событие — разберите счета руками',
  telegram_unlinked: 'Привязка telegram удалена: войти через этот телеграм больше нельзя',
  avatar_left_in_bucket: 'Файл аватарки остался в хранилище — удалите его руками'
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'merged'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const authStore = useAuthStore()

const participants = ref([])
const targetId = ref(null)
const telegramOwnerId = ref(null)
const searchQuery = ref('')
const preview = ref(null)
const failure = ref(null)
const sharedGames = ref([])
const telegramCandidates = ref([])
const previewing = ref(false)
const merging = ref(false)

// Отвечает последний запрос: пока предпросмотр летит, основного успевают
// переключить, и ответ на прошлый выбор показывать уже нельзя
let previewToken = 0

const participantIds = computed(() => participants.value.map(item => item.id))

const sourceIds = computed(
  () => participantIds.value.filter(id => id !== targetId.value)
)

const canAddMore = computed(() => participants.value.length < MERGE_MAX_PARTICIPANTS)

// Свою учётку слияние удалит вместе с остальными источниками, и сервер
// такой запрос не принимает - ловим до запроса
const selfIsSource = computed(() => (
  Boolean(targetId.value)
  && Boolean(authStore.user?.id)
  && sourceIds.value.includes(authStore.user.id)
))

// Привязок telegram несколько - сервер отказывается угадывать, чью оставить,
// и до ответа админа гонять заведомо отклоненный запрос незачем
const needsTelegramOwner = computed(
  () => telegramCandidates.value.length > 0 && !telegramOwnerId.value
)

const canPreview = computed(() => (
  participants.value.length >= 2
  && Boolean(targetId.value)
  && participantIds.value.includes(targetId.value)
  && !selfIsSource.value
  && !needsTelegramOwner.value
))

// То, что видно из выбора, без запроса к серверу
const blockingFailure = () => {
  if (selfIsSource.value) return { message: USER_MERGE_ERROR_MESSAGES.SELF }
  if (needsTelegramOwner.value) {
    return { message: USER_MERGE_ERROR_MESSAGES.TELEGRAM_OWNER_REQUIRED }
  }
  return null
}

const canConfirm = computed(
  () => Boolean(preview.value) && !previewing.value && !merging.value
)

const cardOf = (userId) => preview.value?.participants
  ?.find(card => card.id === userId) || null

const nicknameOf = (userId) => participants.value
  .find(item => item.id === userId)?.nickname || userId

const rolesText = (roles) => (roles?.length
  ? roles.map(getUserRoleLabel).join(', ')
  : '—')

const seatRole = (role) => (role ? LABELS.ROLES[role] || role : '—')

const countersItems = (counters) => {
  if (!counters) return []
  const items = COUNTER_LABELS
    .filter(([key]) => counters[key] > 0)
    .map(([key, label]) => ({ label, value: counters[key] }))
  if (counters.telegram) items.push({ label: 'Telegram', value: 'да' })
  return items
}

// Отчёт приходит двумя списками по источнику, а читается по одному источнику
const movedRows = computed(() => {
  if (!preview.value) return []
  return sourceIds.value.map(sourceId => ({
    sourceId,
    nickname: nicknameOf(sourceId),
    moved: countersItems(
      preview.value.moved.find(item => item.source_id === sourceId)
    ),
    dropped: countersItems(
      preview.value.dropped.find(item => item.source_id === sourceId)
    )
  }))
})

const warningText = (warning) => {
  const text = WARNING_MESSAGES[warning.code] || warning.code
  const extra = Object.entries(warning.extra || {})
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
  return extra ? `${text} (${extra})` : text
}

// Кандидатов на telegram оставляем: они держатся за состав слияния, а не за
// последнюю ошибку - иначе радио пропадет сразу после выбора владельца
const clearFailure = () => {
  failure.value = null
  sharedGames.value = []
}

const applyFailure = (error) => {
  const parsed = getUserMergeFailure(error)
  failure.value = parsed
  sharedGames.value = parsed.sharedGames || []
  telegramCandidates.value = (parsed.telegramCandidateIds || [])
    .map(id => ({ id, nickname: nicknameOf(id) }))
  // Состав слияния сервер не принял - показанный предпросмотр ему больше
  // не отвечает, и подтверждать нечего, пока выбор не поправят
  if (sharedGames.value.length || telegramCandidates.value.length
      || parsed.missingIds?.length) {
    preview.value = null
  }
}

const requestPreview = async () => {
  if (!canPreview.value) {
    previewToken++
    preview.value = null
    previewing.value = false
    clearFailure()
    failure.value = blockingFailure()
    return
  }

  const token = ++previewToken
  previewing.value = true
  try {
    const report = await apiService.mergeUsers(
      targetId.value,
      { sourceIds: sourceIds.value, telegramOwnerId: telegramOwnerId.value },
      { dryRun: true }
    )
    if (token !== previewToken) return
    clearFailure()
    preview.value = report
  } catch (error) {
    if (token !== previewToken) return
    preview.value = null
    applyFailure(error)
  } finally {
    if (token === previewToken) previewing.value = false
  }
}

const addParticipant = (user) => {
  if (!canAddMore.value || participantIds.value.includes(user.id)) return
  participants.value = [...participants.value, { id: user.id, nickname: user.nickname }]
  searchQuery.value = ''
}

const removeParticipant = (userId) => {
  participants.value = participants.value.filter(item => item.id !== userId)
  if (targetId.value === userId) targetId.value = null
}

const resetDialog = () => {
  participants.value = []
  targetId.value = null
  telegramOwnerId.value = null
  searchQuery.value = ''
  preview.value = null
  previewing.value = false
  merging.value = false
  previewToken++
  telegramCandidates.value = []
  clearFailure()
}

// Состав изменился - выбранный владелец telegram мог из него уйти,
// и спрашивать про привязку сервер будет заново
watch(participantIds, () => {
  telegramOwnerId.value = null
  telegramCandidates.value = []
})

watch([targetId, participantIds, telegramOwnerId], requestPreview)

const confirmMerge = async () => {
  if (!canConfirm.value) return

  merging.value = true
  let report = null
  try {
    report = await apiService.mergeUsers(
      targetId.value,
      { sourceIds: sourceIds.value, telegramOwnerId: telegramOwnerId.value },
      { dryRun: false }
    )
  } catch (error) {
    applyFailure(error)
    return
  } finally {
    merging.value = false
  }

  // Слияние прошло. Дальше работает уже обработчик наверху, и его падение
  // нельзя выдавать за ошибку запроса: учётки-то удалены
  emit('merged', {
    report,
    target: participants.value.find(item => item.id === targetId.value),
    sources: participants.value.filter(item => item.id !== targetId.value)
  })
  visible.value = false
}
</script>

<style scoped>
.merge-alert {
  margin-bottom: 16px;
}

.merge-block {
  margin-bottom: 20px;
}

.merge-block-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.merge-block-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.merge-counter {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

/* Карточки участников, а не таблица: тот же вид на телефоне и на мониторе */
.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  align-items: stretch;
  /* Группа радиокнопок режет font-size в ноль, чтобы убрать отбивку между
     ними, - карточкам его возвращаем, иначе их текст не виден вовсе */
  font-size: var(--el-font-size-base);
}

.participant-card,
.result-card {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 10px 12px;
}

.participant-card.is-target {
  border-color: var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.participant-card.is-source {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.result-card {
  border-color: var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.participant-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.participant-radio {
  margin-right: 0;
  height: auto;
}

.participant-nickname {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.participant-remove {
  margin-left: auto;
}

.participant-id {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.participant-facts,
.counters-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.participant-search {
  margin-top: 12px;
}

.merge-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.result-note {
  margin-top: 6px;
  font-size: 13px;
}

.counters-row {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 8px 0;
}

.counters-row:first-child {
  border-top: none;
}

.counters-source {
  font-weight: 600;
}

.counters-label {
  color: var(--el-text-color-secondary);
}

.shared-game {
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.shared-game-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-weight: 600;
}

.shared-game-date {
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.shared-seat {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 6px;
  font-size: 13px;
}

.seat-nickname {
  font-weight: 600;
}

.telegram-owners {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.failure-detail {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.merge-preview:empty {
  display: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
