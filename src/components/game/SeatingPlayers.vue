<template>
  <div class="seating-players">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><UserFilled /></el-icon>
            <span>Рассадка игроков</span>
          </div>
          <el-button type="primary" @click="handleSeatingComplete">
            Рассадка готова
          </el-button>
        </div>
      </template>

      <el-table
        :data="players"
        stripe
        style="width: 100%"
        :border="true"
      >
        <el-table-column
          label="№"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            {{ row.box_id }}
          </template>
        </el-table-column>

        <el-table-column
          label="Игрок"
          min-width="300"
        >
          <template #default="{ row }">
            <el-autocomplete
              v-model="row.searchQuery"
              :fetch-suggestions="querySearch"
              placeholder="Введите имя игрока"
              clearable
              :debounce="300"
              value-key="nickname"
              @select="(item) => handleSelect(item, row.box_id)"
              @clear="() => handleClear(row.box_id)"
              style="width: 100%"
            >
              <template #default="{ item }">
                <div class="autocomplete-item">
                  <span>{{ item.nickname }}</span>
                </div>
              </template>
            </el-autocomplete>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'

const emit = defineEmits(['seating-complete'])

// Инициализируем массив игроков (10 мест)
const players = ref(
  Array.from({ length: 10 }, (_, i) => ({
    box_id: i + 1,
    searchQuery: '',
    user_id: null
  }))
)

// Список выбранных пользователей для передачи в API
const selectedUsers = ref([])

// Функция для поиска пользователей
const querySearch = async (queryString, cb) => {
  if (!queryString || queryString.trim().length === 0) {
    cb([])
    return
  }

  try {
    const users = await apiService.getUsers({ nickname: queryString })
    // Преобразуем результаты в формат для autocomplete
    const suggestions = users.items.map(user => ({
      value: user.nickname,
      nickname: user.nickname,
      id: user.id
    }))
    cb(suggestions)
  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error)
    cb([])
  }
}

// Обработчик выбора игрока
const handleSelect = (item, boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = item.id
    player.searchQuery = item.nickname
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()
}

// Обработчик очистки поля
const handleClear = (boxId) => {
  // Находим игрока по box_id
  const player = players.value.find(p => p.box_id === boxId)
  if (player) {
    player.user_id = null
    player.searchQuery = ''
  }

  // Обновляем список выбранных пользователей
  updateSelectedUsers()
}

// Функция для обновления списка выбранных пользователей
const updateSelectedUsers = () => {
  selectedUsers.value = players.value
    .filter(p => p.user_id !== null)
    .map(p => ({
      user_id: p.user_id,
      box_id: p.box_id
    }))
}

// Обработчик нажатия кнопки "Рассадка готова"
const handleSeatingComplete = () => {
  console.log('объект игроков', selectedUsers.value)
}
</script>

<style scoped>
.seating-players {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
