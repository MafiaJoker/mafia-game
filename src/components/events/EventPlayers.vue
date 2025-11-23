<template>
  <div class="event-players">
    <!-- Регистрация игроков -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><UserFilled /></el-icon>
            <span>Регистрация на мероприятие</span>
          </div>
          <div class="header-actions">
            <el-button
              type="primary"
              size="small"
              @click="registrationsStore.fetchEventRegistrations(props.event.id)"
              :loading="registrationsStore.loading"
            >
              Обновить
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeRegistrationTab">
        <!-- Вкладка добавления игроков -->
        <el-tab-pane label="Добавить игроков" name="add">
          <div class="registration-content">
        <el-row :gutter="16">
          <el-col :span="16">
            <div class="player-selection">
              <div class="section-title">
                Добавить игроков ({{ playerSelections.filter(p => p.selectedUserId).length }})
              </div>
              
              <div class="player-selection-list">
                <div 
                  v-for="(selection, index) in playerSelections" 
                  :key="index"
                  class="player-selection-row"
                  >
                  <el-select 
                    v-model="selection.selectedUserId"
                    placeholder="Выберите игрока" 
                    filterable 
                    clearable
                    class="player-select"
                    @change="handlePlayerSelection(index, $event)"
                    >
                    <el-option
                      v-for="user in getAvailableUsersForSlot(index)"
                      :key="user.id"
                      :label="user.nickname"
                      :value="user.id"
                    />
                  </el-select>
                  <el-button 
                    v-if="selection.selectedUserId && playerSelections.length > 1"
                    type="danger" 
                    size="small" 
                    circle
                    @click="removePlayerSelection(index)"
                    title="Убрать игрока"
                    >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
                
                <!-- Кнопка добавления новых слотов -->
                <div v-if="!isLastSlotEmpty" class="add-slot-button">
                  <el-button 
                    type="primary" 
                    size="small" 
                    plain
                    @click="addNewSlot"
                    >
                    <el-icon><Plus /></el-icon>
                    Добавить ещё слот
                  </el-button>
                </div>
              </div>

              <!-- Список уже добавленных игроков -->
              <div v-if="confirmedPlayers.length > 0" class="confirmed-players">
                <div class="section-title">
                  Добавленные игроки ({{ confirmedPlayers.length }})
                </div>
                <div class="players-grid">
                  <div 
                    v-for="player in confirmedPlayers" 
                    :key="player.id"
                    class="player-card confirmed"
                    >
                    <div class="player-info">
                      <span class="player-name">{{ player.nickname }}</span>
                    </div>
                    <el-button 
                      type="danger" 
                      size="small" 
                      circle
                      @click="removeConfirmedPlayer(player)"
                      title="Убрать из мероприятия"
                      >
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- Кнопка сохранения -->
              <div v-if="hasNewSelections" class="save-section">
                <el-button 
                  type="primary" 
                  @click="savePlayerSelections"
                  :loading="addingPlayer"
                  :disabled="isPastEvent"
                  :title="isPastEvent ? 'Невозможно регистрировать участников на прошедшие мероприятия' : ''"
                  >
                  <el-icon><Check /></el-icon>
                  Добавить выбранных игроков
                </el-button>
              </div>

              <!-- Предупреждение для прошедших мероприятий -->
              <el-alert
                v-if="isPastEvent"
                title="Мероприятие завершено"
                description="Регистрация новых участников невозможна"
                type="warning"
                :closable="false"
                class="mb-3"
              />
              
              <!-- Кнопка для тестирования -->
              <div class="test-section">
                <el-button 
                  type="warning" 
                  @click="registerRandomPlayers"
                  :loading="addingRandomPlayers"
                  :disabled="isPastEvent"
                  :title="isPastEvent ? 'Невозможно регистрировать участников на прошедшие мероприятия' : ''"
                  >
                  <el-icon><UserFilled /></el-icon>
                  Зарегестрировать случайных 10 игроков
                </el-button>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="registration-settings">
              <div class="section-title">Настройки</div>
              
              <el-checkbox 
                v-model="isClosedSeating"
                @change="updateClosedSeating"
                >
                Закрытая рассадка
              </el-checkbox>
              
              <div class="setting-description">
                В режиме закрытой рассадки могут играть только зарегистрированные игроки.
              </div>
            </div>
          </el-col>
        </el-row>
          </div>
        </el-tab-pane>

        <!-- Вкладка списка регистраций -->
        <el-tab-pane label="Список регистраций" name="list">
          <div class="registrations-content">
            <!-- Статистика регистраций -->
            <div class="registrations-stats mb-4">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="stat-item">
                    <div class="stat-value">{{ registrationsStore.pagination.total }}</div>
                    <div class="stat-label">Всего заявок</div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="stat-item">
                    <div class="stat-value confirmed">{{ registrationsStore.confirmedRegistrations.length }}</div>
                    <div class="stat-label">Подтверждено</div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="stat-item">
                    <div class="stat-value pending">{{ registrationsStore.pendingRegistrations.length }}</div>
                    <div class="stat-label">Ожидает</div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- Таблица регистраций -->
            <el-table 
              :data="registrationsStore.registrations" 
              v-loading="registrationsStore.loading"
              stripe
              size="small"
            >
              <el-table-column 
                prop="user_nickname" 
                label="Игрок"
                width="200"
              />
              <el-table-column 
                prop="status" 
                label="Статус"
                width="120"
              >
                <template #default="{ row }">
                  <el-tag 
                    :type="getRegistrationStatusType(row.status)"
                    size="small"
                  >
                    {{ getRegistrationStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column 
                prop="created_at" 
                label="Дата регистрации"
                width="160"
              >
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column 
                label="Действия"
                width="100"
                align="center"
              >
                <template #default="{ row }">
                  <el-button
                    v-if="row.status === 'confirmed'"
                    type="warning"
                    size="small"
                    @click="confirmRejectRegistration(row)"
                    :loading="registrationsStore.loading"
                  >
                    Отклонить
                  </el-button>
                  <el-button
                    v-else-if="row.status === 'cancelled'"
                    type="success"
                    size="small"
                    @click="confirmConfirmRegistration(row)"
                    :loading="registrationsStore.loading"
                  >
                    Подтвердить
                  </el-button>
                  <el-button
                    v-else
                    type="primary"
                    size="small"
                    @click="confirmConfirmRegistration(row)"
                    :loading="registrationsStore.loading"
                  >
                    Подтвердить
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Статистика участников -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ totalPlayers }}</div>
            <div class="stat-label">Всего игроков</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ totalGames }}</div>
            <div class="stat-label">Всего игр</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ averageGamesPerPlayer.toFixed(1) }}</div>
            <div class="stat-label">Игр на игрока</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ activePlayers }}</div>
            <div class="stat-label">Активных игроков</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Список игроков -->
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Участники мероприятия</span>
          </div>
          <div class="header-actions">
            <el-input
              v-model="searchQuery"
              placeholder="Поиск игроков..."
              :prefix-icon="Search"
              size="small"
              style="width: 200px;"
              clearable
            />
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading">
        <el-skeleton :rows="8" animated />
      </div>

      <div v-else-if="filteredPlayers.length === 0" class="no-players">
        <el-empty description="Нет данных об игроках" />
      </div>

      <div v-else class="players-table">
        <el-table 
          :data="paginatedPlayers" 
          stripe 
          style="width: 100%"
          :default-sort="{ prop: 'gamesCount', order: 'descending' }"
          >
          <el-table-column prop="nickname" label="Никнейм" min-width="150" sortable>
            <template #default="{ row }">
              <div class="player-info">
                <span class="player-nickname">{{ row.nickname }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="gamesCount" label="Количество игр" width="120" align="center" sortable>
            <template #default="{ row }">
              <el-tag :type="getGameCountType(row.gamesCount)" size="small">
                {{ row.gamesCount }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Роли" min-width="200">
            <template #default="{ row }">
              <div class="roles-stats">
                <el-tag 
                  v-for="role in row.roles" 
                  :key="role.name"
                  :type="getRoleTagType(role.name)"
                  size="small"
                  class="role-tag"
                  >
                  {{ role.name }}: {{ role.count }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="winRate" label="Процент побед" width="120" align="center" sortable>
            <template #default="{ row }">
              <div class="win-rate">
                <el-progress 
                  :percentage="row.winRate" 
                  :color="getWinRateColor(row.winRate)"
                  :stroke-width="8"
                  />
                <span class="win-rate-text">{{ row.winRate }}%</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Последняя игра" width="140" align="center">
            <template #default="{ row }">
              {{ formatDate(row.lastGameDate) }}
            </template>
          </el-table-column>

          <el-table-column label="Столы" min-width="150">
            <template #default="{ row }">
              <div class="tables-list">
                <el-tag 
                  v-for="table in row.tables.slice(0, 3)" 
                  :key="table"
                  size="small"
                  type="info"
                  class="table-tag"
                  >
                  {{ table }}
                </el-tag>
                <el-tag 
                  v-if="row.tables.length > 3"
                  size="small"
                  type="info"
                  >
                  +{{ row.tables.length - 3 }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- Пагинация -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="filteredPlayers.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>

  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { apiService } from '@/services/api'
  import { useRegistrationsStore } from '@/stores/registrations'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      User,
      Search,
      UserFilled,
      Plus,
      Close,
      Check
  } from '@element-plus/icons-vue'

  const props = defineProps({
      event: {
          type: Object,
          required: false,
          default: null
      }
  })

  const registrationsStore = useRegistrationsStore()
  const players = ref([])
  const playerSelections = ref([
    { selectedUserId: null },
    { selectedUserId: null },
    { selectedUserId: null },
    { selectedUserId: null },
    { selectedUserId: null }
  ]) // Текущие выборы игроков
  const allUsers = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const pageSize = ref(20)
  const addingPlayer = ref(false)
  const addingRandomPlayers = ref(false)
  const isClosedSeating = ref(false)
  const activeRegistrationTab = ref('add')

  const loadEventPlayers = async () => {
      if (!props.event?.tables) return

      loading.value = true
      try {
          const playersMap = new Map()

          // Проходим по всем столам и играм
          for (const table of props.event.tables) {
              const games = table.games || []
              
              for (const game of games) {
                  if (game.players) {
                      for (const player of game.players) {
                          if (player.user_id && player.name) {
                              const playerId = player.user_id
                              
                              if (!playersMap.has(playerId)) {
                                  playersMap.set(playerId, {
                                      id: playerId,
                                      nickname: player.name,
                                      gamesCount: 0,
                                      roles: {},
                                      wins: 0,
                                      tables: new Set(),
                                      lastGameDate: null
                                  })
                              }

                              const playerData = playersMap.get(playerId)
                              playerData.gamesCount++
                              
                              // Подсчет ролей
                              const role = player.role || 'Неизвестно'
                              playerData.roles[role] = (playerData.roles[role] || 0) + 1
                              
                              // Подсчет побед (примерная логика)
                              if (game.result) {
                                  const isWin = checkPlayerWin(player.role, game.result)
                                  if (isWin) playerData.wins++
                              }
                              
                              // Столы
                              playerData.tables.add(table.table_name)
                              
                              // Последняя игра
                              const gameDate = new Date(game.started_at || game.created_at)
                              if (!playerData.lastGameDate || gameDate > playerData.lastGameDate) {
                                  playerData.lastGameDate = gameDate
                              }
                          }
                      }
                  }
              }
          }

          // Преобразуем Map в массив и обрабатываем данные
          players.value = Array.from(playersMap.values()).map(player => ({
              ...player,
              roles: Object.entries(player.roles).map(([name, count]) => ({ name, count })),
              tables: Array.from(player.tables),
              winRate: player.gamesCount > 0 ? Math.round((player.wins / player.gamesCount) * 100) : 0
          }))

      } catch (error) {
          console.error('Ошибка загрузки игроков:', error)
      } finally {
          loading.value = false
      }
  }

  const checkPlayerWin = (role, gameResult) => {
      // Логика определения победы игрока по роли и результату игры
      if (gameResult === 'draw') {
          return false // В ничьей никто не считается победителем
      } else if (gameResult === 'civilians_win') {
          return ['Мирный', 'Шериф'].includes(role)
      } else if (gameResult === 'mafia_win') {
          return ['Мафия', 'Дон'].includes(role)
      }
      return false
  }

  // Проверка прошедшего мероприятия
  const isPastEvent = computed(() => {
    if (!props.event?.start_date) return false
    const eventDate = new Date(props.event.start_date)
    const now = new Date()
    return eventDate < now
  })

  // Общее количество зарегистрированных игроков
  const totalRegisteredPlayers = computed(() => {
      return registrationsStore.confirmedRegistrations.length + playerSelections.value.filter(p => p.selectedUserId).length
  })

  // Подтвержденные игроки из store
  const confirmedPlayers = computed(() => {
      return registrationsStore.confirmedRegistrations.map(reg => ({
          id: reg.user_id,
          nickname: reg.user_nickname
      }))
  })

  // Проверка есть ли новые выборы для сохранения
  const hasNewSelections = computed(() => {
      return playerSelections.value.some(p => p.selectedUserId)
  })
  
  // Проверка пустой ли последний слот
  const isLastSlotEmpty = computed(() => {
      const lastSlot = playerSelections.value[playerSelections.value.length - 1]
      return !lastSlot || !lastSlot.selectedUserId
  })

  // Получить доступных пользователей для конкретного слота
  const getAvailableUsersForSlot = (slotIndex) => {
      // Исключаем уже подтвержденных игроков
      const confirmedIds = confirmedPlayers.value.map(p => p.id)
      
      // Исключаем игроков, выбранных в других слотах
      const selectedInOtherSlots = playerSelections.value
          .map((selection, index) => index !== slotIndex ? selection.selectedUserId : null)
          .filter(id => id !== null)
      
      return allUsers.value.filter(user => 
          !confirmedIds.includes(user.id) && 
          !selectedInOtherSlots.includes(user.id)
      )
  }

  // Вычисляемые свойства для статистики
  const totalPlayers = computed(() => players.value.length)
  
  const totalGames = computed(() => {
      return players.value.reduce((sum, player) => sum + player.gamesCount, 0)
  })

  const averageGamesPerPlayer = computed(() => {
      return totalPlayers.value > 0 ? totalGames.value / totalPlayers.value : 0
  })

  const activePlayers = computed(() => {
      // Считаем активными тех, кто играл больше 1 игры
      return players.value.filter(player => player.gamesCount > 1).length
  })

  // Фильтрация и пагинация
  const filteredPlayers = computed(() => {
      if (!searchQuery.value) return players.value
      
      const query = searchQuery.value.toLowerCase()
      return players.value.filter(player => 
          player.nickname.toLowerCase().includes(query)
      )
  })

  const paginatedPlayers = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredPlayers.value.slice(start, end)
  })

  // Вспомогательные функции
  const getGameCountType = (count) => {
      if (count >= 5) return 'success'
      if (count >= 3) return 'warning'
      return 'info'
  }

  const getRoleTagType = (role) => {
      const roleTypes = {
          'Мирный': 'success',
          'Шериф': 'primary',
          'Мафия': 'danger',
          'Дон': 'warning'
      }
      return roleTypes[role] || 'info'
  }

  const getWinRateColor = (winRate) => {
      if (winRate >= 70) return '#67c23a'
      if (winRate >= 50) return '#e6a23c'
      return '#f56c6c'
  }

  const formatDate = (date) => {
      if (!date) return 'Нет данных'
      return new Date(date).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
      })
  }

  // Функции для работы с регистрациями
  const getRegistrationStatusType = (status) => {
      const statusTypes = {
          pending: 'warning',
          confirmed: 'success',
          cancelled: 'info'
      }
      return statusTypes[status] || ''
  }

  const getRegistrationStatusLabel = (status) => {
      const statusLabels = {
          pending: 'Ожидает',
          confirmed: 'Подтверждено',
          cancelled: 'Отменено'
      }
      return statusLabels[status] || status
  }

  const confirmRejectRegistration = async (registration) => {
      try {
          await ElMessageBox.confirm(
              `Вы уверены, что хотите отклонить заявку игрока ${registration.user_nickname}?`,
              'Подтверждение отклонения',
              {
                  confirmButtonText: 'Отклонить',
                  cancelButtonText: 'Оставить',
                  type: 'warning'
              }
          )
          
          await registrationsStore.updateRegistrationStatus(props.event.id, registration.id, 'cancelled')
      } catch (error) {
          if (error !== 'cancel') {
              console.error('Ошибка отклонения заявки:', error)
          }
      }
  }

  const confirmConfirmRegistration = async (registration) => {
      try {
          await ElMessageBox.confirm(
              `Вы уверены, что хотите подтвердить заявку игрока ${registration.user_nickname}?`,
              'Подтверждение заявки',
              {
                  confirmButtonText: 'Подтвердить',
                  cancelButtonText: 'Отмена',
                  type: 'success'
              }
          )
          
          await registrationsStore.updateRegistrationStatus(props.event.id, registration.id, 'confirmed')
      } catch (error) {
          if (error !== 'cancel') {
              console.error('Ошибка подтверждения заявки:', error)
          }
      }
  }

  const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
  }

  const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
  }

  // Методы для работы с регистрацией игроков
  const loadAllUsers = async () => {
      try {
          const response = await apiService.getUsers()
          allUsers.value = response.items || response || []
      } catch (error) {
          console.error('Ошибка загрузки пользователей:', error)
      }
  }

  const loadRegisteredPlayers = async () => {
      if (!props.event?.id) return
      
      try {
          await registrationsStore.fetchEventRegistrations(props.event.id)
      } catch (error) {
          console.error('Ошибка загрузки регистраций:', error)
      }
  }

  // Обработка выбора игрока в слоте
  const handlePlayerSelection = (slotIndex, userId) => {
      // Если выбрали игрока и это последний пустой слот, добавляем новый
      if (userId && slotIndex === playerSelections.value.length - 1) {
          playerSelections.value.push({ selectedUserId: null })
      }
      
      // Если очистили слот и это не единственный, можем удалить пустые слоты в конце
      if (!userId && slotIndex < playerSelections.value.length - 1) {
          // Удаляем пустые слоты в конце, оставляя минимум 3
          while (playerSelections.value.length > 3 && 
                 !playerSelections.value[playerSelections.value.length - 1].selectedUserId) {
              playerSelections.value.pop()
          }
      }
  }

  // Удаление слота с выбором игрока
  const removePlayerSelection = (slotIndex) => {
      playerSelections.value.splice(slotIndex, 1)
      
      // Всегда должно остаться минимум 3 слота
      while (playerSelections.value.length < 3) {
          playerSelections.value.push({ selectedUserId: null })
      }
  }
  
  // Добавление нового пустого слота
  const addNewSlot = () => {
      playerSelections.value.push({ selectedUserId: null })
  }

  // Сохранение выбранных игроков
  const savePlayerSelections = async () => {
      const selectedUserIds = playerSelections.value
          .filter(p => p.selectedUserId)
          .map(p => p.selectedUserId)
      
      if (selectedUserIds.length === 0) return

      addingPlayer.value = true
      try {
          // Регистрируем каждого игрока через API
          for (const userId of selectedUserIds) {
              await registrationsStore.createRegistration(props.event.id, userId)
          }
          
          // Очищаем выборы и создаем новые пустые слоты
          playerSelections.value = [
              { selectedUserId: null },
              { selectedUserId: null },
              { selectedUserId: null },
              { selectedUserId: null },
              { selectedUserId: null }
          ]
          
          ElMessage.success(`Добавлено игроков: ${selectedUserIds.length}`)
          
      } catch (error) {
          console.error('Ошибка добавления игроков:', error)
      } finally {
          addingPlayer.value = false
      }
  }

  // Удаление подтвержденного игрока
  const removeConfirmedPlayer = async (player) => {
      try {
          await ElMessageBox.confirm(
              `Вы уверены, что хотите отклонить заявку игрока ${player.nickname}?`,
              'Подтверждение отклонения',
              {
                  confirmButtonText: 'Отклонить',
                  cancelButtonText: 'Оставить',
                  type: 'warning'
              }
          )

          // Находим регистрацию игрока
          const registration = registrationsStore.registrations.find(reg => reg.user_id === player.id)
          if (registration) {
              await registrationsStore.updateRegistrationStatus(props.event.id, registration.id, 'cancelled')
          }

      } catch (error) {
          if (error !== 'cancel') {
              console.error('Ошибка отклонения заявки:', error)
          }
      }
  }

  const updateClosedSeating = async () => {
      try {
          // TODO: Добавить API вызов для обновления настроек мероприятия
          // await apiService.updateEvent(props.event.id, { closed_seating: isClosedSeating.value })
          
          const status = isClosedSeating.value ? 'включена' : 'отключена'
          ElMessage.success(`Закрытая рассадка ${status}`)
          
      } catch (error) {
          console.error('Ошибка обновления настроек:', error)
          ElMessage.error('Ошибка при обновлении настроек')
          // Возвращаем обратно при ошибке
          isClosedSeating.value = !isClosedSeating.value
      }
  }

  // Регистрация 10 случайных игроков для тестирования
  const registerRandomPlayers = async () => {
      // Проверяем, не прошло ли мероприятие
      if (props.event?.start_date) {
          const eventDate = new Date(props.event.start_date)
          const now = new Date()
          if (eventDate < now) {
              ElMessage.error('Невозможно регистрировать участников на прошедшие мероприятия')
              return
          }
      }
      
      addingRandomPlayers.value = true
      try {
          // Получаем список всех пользователей, которые еще не зарегистрированы
          const confirmedIds = confirmedPlayers.value.map(p => p.id)
          const availableUsers = allUsers.value.filter(user => !confirmedIds.includes(user.id))
          
          if (availableUsers.length === 0) {
              ElMessage.warning('Нет доступных игроков для регистрации')
              return
          }
          
          // Перемешиваем массив и берем первые 10 (или меньше, если недостаточно)
          const shuffled = [...availableUsers].sort(() => Math.random() - 0.5)
          const playersToRegister = shuffled.slice(0, Math.min(10, shuffled.length))
          
          // Регистрируем каждого игрока
          let registered = 0
          let failed = 0
          
          for (const user of playersToRegister) {
              try {
                  await registrationsStore.createRegistration(props.event.id, user.id)
                  registered++
              } catch (error) {
                  console.error(`Failed to register user ${user.id}:`, error)
                  failed++
                  // Продолжаем регистрацию остальных игроков
              }
          }
          
          if (registered > 0) {
              ElMessage.success(`Зарегистрировано ${registered} игроков`)
          }
          if (failed > 0) {
              ElMessage.warning(`Не удалось зарегистрировать ${failed} игроков`)
          }
          
      } catch (error) {
          console.error('Ошибка при регистрации случайных игроков:', error)
          ElMessage.error('Ошибка при добавлении игроков')
      } finally {
          addingRandomPlayers.value = false
      }
  }

  onMounted(() => {
      if (props.event?.id) {
          loadEventPlayers()
          loadRegisteredPlayers()
      }
      loadAllUsers()
  })

  // Следим за изменениями event
  watch(() => props.event, (newEvent) => {
      if (newEvent?.id) {
          loadEventPlayers()
          loadRegisteredPlayers()
      }
  })
</script>

<style scoped>
  .event-players {
      padding: 0;
  }

  .stat-card {
      text-align: center;
  }

  .stat-content {
      padding: 8px;
  }

  .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #409eff;
      margin-bottom: 4px;
  }

  .stat-label {
      font-size: 12px;
      color: #909399;
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

  .loading {
      padding: 32px 0;
  }

  .no-players {
      padding: 32px 0;
      text-align: center;
  }

  .player-info {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .player-nickname {
      font-weight: 500;
  }

  .roles-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
  }

  .role-tag {
      margin: 2px;
  }

  .win-rate {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
  }

  .win-rate-text {
      font-size: 12px;
      font-weight: 500;
  }

  .tables-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
  }

  .table-tag {
      margin: 2px;
  }

  .pagination-wrapper {
      margin-top: 16px;
      display: flex;
      justify-content: center;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  /* Стили для регистрации игроков */
  .registration-content {
      padding: 16px 0;
  }

  .add-instructions {
      font-size: 14px;
      color: #606266;
      font-style: italic;
  }

  .section-title {
      font-weight: 600;
      font-size: 14px;
      color: #303133;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ebeef5;
  }

  .no-registered {
      padding: 20px 0;
      text-align: center;
  }

  .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
  }

  .player-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border: 1px solid #ebeef5;
      border-radius: 4px;
      background-color: #fafafa;
      transition: all 0.3s ease;
  }

  .player-card:hover {
      border-color: #409eff;
      background-color: #f0f9ff;
  }

  .player-info {
      display: flex;
      align-items: center;
      flex: 1;
  }

  .player-name {
      font-weight: 500;
      font-size: 14px;
      color: #303133;
  }

  .registration-settings {
      padding-left: 16px;
      border-left: 1px solid #ebeef5;
  }

  .setting-description {
      font-size: 12px;
      color: #909399;
      margin: 8px 0;
      line-height: 1.4;
  }

  .closed-seating-info {
      margin-top: 12px;
  }

  /* Стили для выбора игроков */
  .player-selection-list {
      margin-bottom: 20px;
  }

  .player-selection-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
  }

  .player-select {
      flex: 1;
  }

  .confirmed-players {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
  }

  .player-card.confirmed {
      background-color: #f0f9ff;
      border-color: #409eff;
  }

  .save-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
      text-align: center;
  }
  
  .test-section {
      margin-top: 12px;
      text-align: center;
  }
  
  .add-slot-button {
      margin-top: 8px;
      text-align: center;
  }

  /* Стили для регистраций */
  .registrations-content {
      padding: 16px 0;
  }

  .registrations-stats {
      background-color: #fafafa;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid #ebeef5;
  }

  .stat-item {
      text-align: center;
  }

  .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 4px;
  }

  .stat-value.confirmed {
      color: #67c23a;
  }

  .stat-value.pending {
      color: #e6a23c;
  }

  .stat-label {
      font-size: 12px;
      color: #909399;
  }
</style>