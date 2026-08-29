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
          :max="MAX_TABLES_COUNT"
        />
      </el-form-item>

      <el-form-item label="Количество игр">
        <el-input-number
          v-model="form.gamesCount"
          :min="1"
          :max="MAX_GAMES_COUNT"
        />
        <div class="field-hint">
          Всего игр на всех столах, делится на количество столов
        </div>
      </el-form-item>

      <el-form-item>
        <template #label>
          <span class="label-with-hint">
            Сид (необязательно)
            <el-tooltip placement="top" :content="SEED_HINT">
              <el-icon class="hint-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input
          v-model="form.seed"
          class="seed-input"
          placeholder="Пусто — сервер придумает сид сам"
          :maxlength="SEED_MAX_LENGTH"
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
        <el-autocomplete
          v-model="playerQuery"
          :fetch-suggestions="querySearch"
          placeholder="Введите ник игрока"
          value-key="nickname"
          :debounce="300"
          clearable
          class="player-field player-autocomplete"
          @select="addFoundPlayer"
          @keydown.enter="handleQueryEnter"
          @keydown.up="startNavigation"
          @keydown.down="startNavigation"
        >
          <template #default="{ item }">
            <span>{{ item.nickname }}</span>
          </template>
        </el-autocomplete>
        <el-button
          v-if="canCreatePlayer"
          type="primary"
          class="player-action"
          :loading="creatingPlayer"
          @click="createPlayer"
        >
          Создать
        </el-button>
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
    <div v-if="seating" class="seating-preview">
      <div class="preview-header">
        <span class="preview-title">Рассадка</span>
        <span class="preview-seed">Сид: {{ seating.seed }}</span>
      </div>

      <div v-for="table in previewTables" :key="table.tableId" class="preview-table">
        <div class="preview-table-name">{{ table.tableName }}</div>
        <div class="preview-scroll">
          <table class="seating-table">
            <thead>
              <tr>
                <th class="seat-column">Место</th>
                <th v-for="game in table.games" :key="game.label">{{ game.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in table.rows" :key="row.boxId">
                <td class="seat-column">{{ row.boxId }}</td>
                <td v-for="(nickname, index) in row.nicknames" :key="index">
                  {{ nickname }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

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
import { DEFAULT_PLAYERS_COUNT } from '@/utils/constants.js'
import { getSeatingErrorMessage } from '@/utils/errorMessages.js'

// Границы бекенда, чтобы не гонять заведомо неверные запросы
const MAX_TABLES_COUNT = 20
const MAX_GAMES_COUNT = 200
const SEED_MAX_LENGTH = 64
const DEFAULT_TABLE_NAME_TEMPLATE = 'Стол {}'

const SEED_HINT = 'Сид — ключ, из которого сервер собирает случайную рассадку. '
  + 'Один и тот же сид с тем же составом игроков дает ту же самую рассадку, '
  + 'поэтому ее можно повторить или проверить. Оставьте поле пустым — сервер '
  + 'придумает сид сам и покажет его вместе с рассадкой.'

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
const suggestions = ref([])
// Стрелками судья ходит по подсказкам, и Enter тогда за автокомплитом
const isNavigating = ref(false)
const creatingPlayer = ref(false)
const generating = ref(false)
const applying = ref(false)
const errorMessage = ref('')
const seating = ref(null)

const requiredPlayersCount = computed(() => DEFAULT_PLAYERS_COUNT * form.tablesCount)

const canCreatePlayer = computed(() => playerQuery.value.trim().length > 0)

// Рассадка приходит списком игр, а судья читает ее по столам
const previewTables = computed(() => {
  if (!seating.value) return []

  const gamesByTable = new Map()
  seating.value.games.forEach(game => {
    if (!gamesByTable.has(game.table_id)) gamesByTable.set(game.table_id, [])
    gamesByTable.get(game.table_id).push(game)
  })

  return [...gamesByTable.keys()].sort((a, b) => a - b).map(tableId => {
    const games = gamesByTable.get(tableId)
    return {
      tableId,
      tableName: tableName(tableId),
      games,
      rows: Array.from({ length: DEFAULT_PLAYERS_COUNT }, (_, index) => {
        const boxId = index + 1
        return {
          boxId,
          nicknames: games.map(
            game => game.seats.find(seat => seat.box_id === boxId)?.nickname || ''
          )
        }
      })
    }
  })
})

const tableName = (tableId) => {
  const template = props.tableNameTemplate || DEFAULT_TABLE_NAME_TEMPLATE
  return template.includes('{}')
    ? template.replace('{}', tableId)
    : DEFAULT_TABLE_NAME_TEMPLATE.replace('{}', tableId)
}

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
  suggestions.value = []
  isNavigating.value = false
  errorMessage.value = ''
  seating.value = null
}

const querySearch = async (queryString, callback) => {
  const query = (queryString || '').trim()
  if (!query) {
    suggestions.value = []
    callback([])
    return
  }

  isNavigating.value = false
  try {
    const users = await apiService.getUsers({ nickname: query })
    const addedIds = form.players.map(player => player.id)
    suggestions.value = (users.items || [])
      .filter(user => !addedIds.includes(user.id))
      .map(user => ({ id: user.id, nickname: user.nickname }))
  } catch (error) {
    console.error('Ошибка при поиске игроков:', error)
    suggestions.value = []
  }
  callback(suggestions.value)
}

const addPlayer = (player) => {
  if (form.players.some(added => added.id === player.id)) {
    errorMessage.value = 'Этот игрок уже в списке'
    return
  }
  form.players.push(player)
  playerQuery.value = ''
  suggestions.value = []
  isNavigating.value = false
  errorMessage.value = ''
}

const addFoundPlayer = (item) => {
  addPlayer({ id: item.id, nickname: item.nickname })
}

const removePlayer = (playerId) => {
  form.players = form.players.filter(player => player.id !== playerId)
}

const startNavigation = () => {
  if (suggestions.value.length > 0) isNavigating.value = true
}

// Enter либо берет точное совпадение из подсказок, либо заводит нового игрока.
// Выбор стрелками остается за автокомплитом: он вызовет select сам
const handleQueryEnter = () => {
  const query = playerQuery.value.trim()
  if (!query || isNavigating.value) return

  const exactMatch = suggestions.value.find(item => item.nickname === query)
  if (exactMatch) {
    addFoundPlayer(exactMatch)
    return
  }
  createPlayer()
}

const createPlayer = async () => {
  const nickname = playerQuery.value.trim()
  if (!nickname || creatingPlayer.value) return

  // Тезка из подсказок - это тот же игрок, второго такого заводить незачем
  const exactMatch = suggestions.value.find(item => item.nickname === nickname)
  if (exactMatch) {
    addFoundPlayer(exactMatch)
    return
  }

  creatingPlayer.value = true
  errorMessage.value = ''
  try {
    const newUser = await apiService.createUser({ nickname })
    // Ник нового игрока api не возвращает, поэтому берем введенный
    addPlayer({ id: newUser.id, nickname })
  } catch (error) {
    console.error('Ошибка при создании игрока:', error)
    errorMessage.value = 'Не удалось создать игрока. Попробуйте еще раз'
  } finally {
    creatingPlayer.value = false
  }
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

.seating-preview {
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-title {
  font-weight: 600;
  color: #303133;
}

.preview-seed {
  font-size: 12px;
  color: #909399;
}

.preview-table {
  margin-bottom: 16px;
}

.preview-table-name {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
}

.preview-scroll {
  overflow-x: auto;
}

.seating-table {
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
}

.seating-table th,
.seating-table td {
  border: 1px solid #e4e7ed;
  padding: 4px 10px;
  text-align: left;
  white-space: nowrap;
}

.seating-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

.seating-table .seat-column {
  width: 60px;
  color: #909399;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
