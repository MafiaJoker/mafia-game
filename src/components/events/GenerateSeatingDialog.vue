<template>
  <el-dialog
    v-model="visible"
    title="Генерация рассадки"
    width="760px"
    :close-on-click-modal="false"
    @open="resetDialog"
  >
    <el-form :model="form" label-width="200px" label-position="left">
      <el-form-item label="Количество столов">
        <el-input-number
          v-model="form.tablesCount"
          :min="1"
          :max="SEATING_MAX_TABLES_COUNT"
        />
      </el-form-item>

      <el-form-item label="Количество игр">
        <el-input-number
          v-model="form.gamesCount"
          :min="1"
          :max="SEATING_MAX_GAMES_COUNT"
        />
        <div class="field-hint">
          Всего игр на всех столах, делится на количество столов
        </div>
      </el-form-item>

      <el-form-item>
        <template #label>
          <span class="label-with-hint">
            Сид (необязательно)
            <el-tooltip placement="top" :content="SEATING_SEED_HINT">
              <el-icon class="hint-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input
          v-model="form.seed"
          class="seed-input"
          placeholder="Пусто — сервер придумает сид сам"
          :maxlength="SEATING_SEED_MAX_LENGTH"
          clearable
        />
      </el-form-item>

      <el-form-item>
        <el-checkbox v-model="form.fromRegistrations">
          Сгенерировать из зарегистрированных игроков
        </el-checkbox>
        <div class="field-hint">
          В рассадку попадут все подтвержденные регистрации мероприятия
        </div>
      </el-form-item>
    </el-form>

    <!-- Свой состав игроков: галочка отжата -->
    <div v-if="!form.fromRegistrations" class="players-block">
      <div class="players-header">
        <span class="players-title">Игроки</span>
        <span class="players-counter">
          Добавлено {{ form.players.length }} из {{ requiredPlayersCount }}
        </span>
      </div>

      <div v-if="form.players.length" class="players-list">
        <div
          v-for="(player, index) in form.players"
          :key="player.id"
          class="player-row"
        >
          <span class="player-position">{{ index + 1 }}.</span>
          <el-input :model-value="player.nickname" readonly class="player-field" />
          <el-button
            type="danger"
            link
            class="player-action"
            @click="removePlayer(player.id)"
          >
            Удалить
          </el-button>
        </div>
      </div>

      <div class="player-row player-search">
        <span class="player-position">{{ form.players.length + 1 }}.</span>
        <PlayerSearchInput
          v-model="playerQuery"
          :exclude-ids="addedPlayerIds"
          placeholder="Введите ник игрока"
          class="player-field"
          @select="addPlayer"
          @error="showError"
        />
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="seating-alert"
    />

    <!-- Готовая рассадка от сервера: игра x место, по столам -->
    <SeatingPreview
      v-if="seating"
      class="dialog-preview"
      :games="seating.games"
      :seed="seating.seed"
      :table-name-template="tableNameTemplate"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">Отмена</el-button>
        <el-button
          v-if="!seating"
          type="primary"
          :loading="generating"
          @click="generateSeating"
        >
          Показать рассадку
        </el-button>
        <template v-else>
          <el-button :loading="generating" @click="regenerateSeating">
            Перегенерировать
          </el-button>
          <el-button type="primary" :loading="applying" @click="createGames">
            Создать игры
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import SeatingPreview from '@/components/common/SeatingPreview.vue'
import {
  DEFAULT_PLAYERS_COUNT,
  DEFAULT_TABLE_NAME_TEMPLATE,
  SEATING_MAX_TABLES_COUNT,
  SEATING_MAX_GAMES_COUNT,
  SEATING_SEED_MAX_LENGTH,
  SEATING_SEED_HINT
} from '@/utils/constants.js'
import { getSeatingErrorMessage } from '@/utils/errorMessages.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  eventId: {
    type: String,
    required: true
  },
  tableNameTemplate: {
    type: String,
    default: DEFAULT_TABLE_NAME_TEMPLATE
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = reactive({
  tablesCount: 1,
  gamesCount: 1,
  seed: '',
  fromRegistrations: false,
  players: []
})

const playerQuery = ref('')
const generating = ref(false)
const applying = ref(false)
const errorMessage = ref('')
const seating = ref(null)

const requiredPlayersCount = computed(() => DEFAULT_PLAYERS_COUNT * form.tablesCount)

const addedPlayerIds = computed(() => form.players.map(player => player.id))

// Параметры изменились - показанная рассадка больше им не отвечает
watch(
  () => [
    form.tablesCount,
    form.gamesCount,
    form.seed,
    form.fromRegistrations,
    form.players.map(player => player.id).join(',')
  ],
  () => {
    seating.value = null
  }
)

const resetDialog = () => {
  form.tablesCount = 1
  form.gamesCount = 1
  form.seed = ''
  form.fromRegistrations = false
  form.players = []
  playerQuery.value = ''
  errorMessage.value = ''
  seating.value = null
}

const showError = (message) => {
  errorMessage.value = message
}

const addPlayer = (player) => {
  if (form.players.some(added => added.id === player.id)) {
    errorMessage.value = 'Этот игрок уже в списке'
    return
  }
  form.players.push(player)
  playerQuery.value = ''
  errorMessage.value = ''
}

const removePlayer = (playerId) => {
  form.players = form.players.filter(player => player.id !== playerId)
}

const seatingPayload = (seed) => {
  const payload = {
    tables_count: form.tablesCount,
    games_count: form.gamesCount
  }
  if (seed) payload.seed = seed
  if (!form.fromRegistrations) {
    payload.player_ids = form.players.map(player => player.id)
  }
  return payload
}

const generateSeating = async () => {
  generating.value = true
  errorMessage.value = ''
  try {
    seating.value = await apiService.generateSeating(
      props.eventId,
      seatingPayload(form.seed.trim())
    )
  } catch (error) {
    console.error('Ошибка при генерации рассадки:', error)
    seating.value = null
    errorMessage.value = getSeatingErrorMessage(error, {
      fromRegistrations: form.fromRegistrations
    })
  } finally {
    generating.value = false
  }
}

// Другая рассадка - это другой сид, поэтому заданный сид отпускаем
const regenerateSeating = () => {
  form.seed = ''
  return generateSeating()
}

const createGames = async () => {
  if (!seating.value) return

  applying.value = true
  errorMessage.value = ''
  try {
    // Сид показанной рассадки: игры должны совпасть с тем, что судья увидел
    const created = await apiService.generateSeating(
      props.eventId,
      seatingPayload(seating.value.seed),
      true
    )
    ElMessage.success(`Создано игр: ${created.games.length}`)
    visible.value = false
    emit('created', created)
  } catch (error) {
    console.error('Ошибка при создании игр:', error)
    errorMessage.value = getSeatingErrorMessage(error, {
      fromRegistrations: form.fromRegistrations
    })
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.field-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.label-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hint-icon {
  color: #909399;
  cursor: help;
}

.players-block {
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.players-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.players-title {
  font-weight: 600;
  color: #303133;
}

.players-counter {
  font-size: 12px;
  color: #909399;
}

/* Состав может дорасти до 10 игроков на стол, поэтому список свой скролл.
   Черта снизу держит поиск игрока отдельно от уже набранных */
.players-list {
  max-height: 300px;
  overflow-y: auto;
  padding-bottom: 4px;
  border-bottom: 1px solid #dcdfe6;
}

.players-list + .player-search {
  margin-top: 12px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.player-position {
  width: 28px;
  text-align: right;
  color: #909399;
  font-size: 13px;
}

.player-field {
  flex: 1;
  min-width: 0;
}

.player-action {
  flex-shrink: 0;
}

.seating-alert {
  margin-bottom: 16px;
}

.dialog-preview {
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
