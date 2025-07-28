<template>
  <el-dialog
    v-model="visible"
    title="Генерация рассадки"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="seating-dialog">
      <!-- Информация о игроках -->
      <el-card shadow="never" class="mb-4">
        <div class="players-info">
          <div class="info-item">
            <span class="label">Подтвержденных игроков:</span>
            <span class="value">{{ confirmedPlayers.length }}</span>
          </div>
          <div class="info-item">
            <span class="label">Столов потребуется:</span>
            <span class="value">{{ requiredTables }}</span>
          </div>
        </div>
      </el-card>

      <!-- Настройки генерации -->
      <el-form :model="form" label-width="150px">
        <el-form-item label="Количество игр:">
          <el-input-number
            v-model="form.gamesCount"
            :min="1"
            :max="50"
            @change="calculateDistribution"
          />
        </el-form-item>
      </el-form>

      <!-- Результат расчета -->
      <el-card shadow="never" class="calculation-result">
        <template #header>
          <div class="card-header">
            <span>Расчет распределения</span>
            <el-tag 
              :type="isValidDistribution ? 'success' : 'danger'"
              size="small"
            >
              {{ isValidDistribution ? 'Возможно' : 'Невозможно' }}
            </el-tag>
          </div>
        </template>

        <div v-if="isValidDistribution" class="valid-distribution">
          <div class="distribution-info">
            <div class="info-row">
              <span class="label">Каждый игрок сыграет:</span>
              <span class="value highlight">{{ gamesPerPlayer }} игр</span>
            </div>
            <div class="info-row">
              <span class="label">Всего будет создано:</span>
              <span class="value">{{ form.gamesCount }} игр</span>
            </div>
            <div class="info-row">
              <span class="label">Всего игровых мест:</span>
              <span class="value">{{ totalGameSlots }}</span>
            </div>
          </div>

          <!-- Превью распределения по столам -->
          <div class="tables-preview">
            <h4>Распределение по столам:</h4>
            <div class="tables-grid">
              <div 
                v-for="(tableGames, index) in tablesDistribution" 
                :key="index" 
                class="table-preview"
              >
                <div class="table-name">Стол {{ index + 1 }}</div>
                <div class="table-games">{{ tableGames }} игр</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="invalid-distribution">
          <el-alert
            title="Невозможно обеспечить равное количество игр"
            type="error"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>При {{ form.gamesCount }} играх и {{ confirmedPlayers.length }} игроках невозможно обеспечить равное количество игр для каждого участника.</p>
              <p><strong>Возможные варианты:</strong></p>
              <ul>
                <li v-for="option in suggestedOptions" :key="option">
                  <el-button 
                    type="text" 
                    @click="form.gamesCount = option; calculateDistribution()"
                  >
                    {{ option }} игр ({{ Math.floor((option * 10) / confirmedPlayers.length) }} игр на игрока)
                  </el-button>
                </li>
              </ul>
            </template>
          </el-alert>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">Отмена</el-button>
        <el-button
          type="primary"
          @click="generateSeating"
          :disabled="!isValidDistribution"
          :loading="generating"
        >
          Создать игры с рассадкой
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  confirmedPlayers: {
    type: Array,
    default: () => []
  },
  eventId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'generated'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = ref({
  gamesCount: 1
})

const generating = ref(false)

// Расчетные свойства
const requiredTables = computed(() => {
  return Math.ceil(props.confirmedPlayers.length / 10)
})

const totalGameSlots = computed(() => {
  return form.value.gamesCount * 10
})

const gamesPerPlayer = computed(() => {
  if (props.confirmedPlayers.length === 0) return 0
  return Math.floor(totalGameSlots.value / props.confirmedPlayers.length)
})

const isValidDistribution = computed(() => {
  if (props.confirmedPlayers.length === 0) return false
  return totalGameSlots.value % props.confirmedPlayers.length === 0
})

const tablesDistribution = computed(() => {
  if (!isValidDistribution.value) return []
  
  const tables = requiredTables.value
  const gamesPerTable = Math.floor(form.value.gamesCount / tables)
  const extraGames = form.value.gamesCount % tables
  
  const distribution = []
  for (let i = 0; i < tables; i++) {
    distribution.push(gamesPerTable + (i < extraGames ? 1 : 0))
  }
  
  return distribution
})

const suggestedOptions = computed(() => {
  const options = []
  const playerCount = props.confirmedPlayers.length
  
  // Найти ближайшие корректные варианты
  for (let games = 1; games <= 20; games++) {
    if ((games * 10) % playerCount === 0) {
      options.push(games)
    }
  }
  
  return options.slice(0, 5) // Показать только первые 5 вариантов
})

// Методы
const calculateDistribution = () => {
  // Функция вызывается при изменении количества игр
  // Все вычисления происходят в computed свойствах
}

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const generatePlayerRotation = () => {
  const players = [...props.confirmedPlayers]
  const games = []
  
  // Создаем циклическую ротацию игроков
  let playerIndex = 0
  
  for (let gameNum = 0; gameNum < form.value.gamesCount; gameNum++) {
    const gamePlayers = []
    
    for (let seat = 0; seat < 10; seat++) {
      gamePlayers.push(players[playerIndex % players.length])
      playerIndex++
    }
    
    // Перемешиваем игроков в каждой игре
    games.push(shuffleArray(gamePlayers))
  }
  
  return games
}

const generateSeating = async () => {
  if (!isValidDistribution.value) {
    ElMessage.error('Невозможно создать рассадку с текущими параметрами')
    return
  }

  generating.value = true
  
  try {
    const gamesWithSeating = generatePlayerRotation()
    
    // Здесь будет вызов API для создания игр
    console.log('Generated games:', gamesWithSeating)
    
    emit('generated', {
      games: gamesWithSeating,
      distribution: tablesDistribution.value
    })
    
    ElMessage.success(`Создано ${form.value.gamesCount} игр с рассадкой`)
    visible.value = false
    
  } catch (error) {
    console.error('Failed to generate seating:', error)
    ElMessage.error('Ошибка при генерации рассадки')
  } finally {
    generating.value = false
  }
}

// Инициализация
watch(() => props.confirmedPlayers.length, () => {
  if (props.confirmedPlayers.length >= 10) {
    // Установить первый валидный вариант по умолчанию
    const firstValid = suggestedOptions.value[0]
    if (firstValid) {
      form.value.gamesCount = firstValid
    }
  }
}, { immediate: true })

// Открытие диалога
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.confirmedPlayers.length >= 10) {
    // Сброс формы при открытии
    const firstValid = suggestedOptions.value[0] || 1
    form.value.gamesCount = firstValid
  }
})
</script>

<style scoped>
.seating-dialog {
  padding: 10px 0;
}

.players-info {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.label {
  font-size: 12px;
  color: #666;
}

.value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.calculation-result .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.distribution-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-size: 14px;
  color: #606266;
}

.info-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.info-row .value.highlight {
  color: #67c23a;
  font-size: 16px;
  font-weight: 600;
}

.tables-preview h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #303133;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.table-preview {
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e4e7ed;
}

.table-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.table-games {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.invalid-distribution {
  text-align: left;
}

.invalid-distribution ul {
  margin: 10px 0;
  padding-left: 20px;
}

.invalid-distribution li {
  margin: 5px 0;
}

.mb-4 {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>