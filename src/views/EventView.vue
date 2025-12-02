<template>
  <div class="event-view">
    <el-container>
      <el-header>
        <div class="event-header">
          <el-button 
            @click="$router.push('/')"
            :icon="ArrowLeft"
            >
            Назад к мероприятиям
          </el-button>
          <h1>{{ event?.label || 'Загрузка мероприятия...' }}</h1>
          <div class="header-actions">
            <el-button
              v-if="event"
              type="primary"
              @click="goToRegistration"
            >
              Регистрация на мероприятие
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main>
        <el-row>
          <!-- Основной контент с вкладками на всю ширину -->
          <el-col :span="24">
            <el-card>
              <el-tabs v-model="activeTab" type="border-card">
                <!-- Вкладка Информация -->
                <el-tab-pane label="Информация" name="info">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><InfoFilled /></el-icon>
                      Информация
                    </span>
                  </template>

                  <div class="tab-content">
                    <div v-if="event" class="event-detailed-info">
                      <!-- Режим редактирования / просмотра -->
                      <div class="edit-mode-controls">
                        <el-button 
                          v-if="!isEditMode" 
                          type="primary" 
                          size="small"
                          @click="isEditMode = true"
                          :icon="Edit"
                        >
                          Редактировать
                        </el-button>
                        <div v-else>
                          <el-button 
                            type="success" 
                            size="small"
                            @click="saveEventChanges"
                            :loading="saving"
                          >
                            Сохранить
                          </el-button>
                          <el-button 
                            size="small"
                            @click="cancelEdit"
                          >
                            Отмена
                          </el-button>
                        </div>
                      </div>

                      <!-- Основная информация -->
                      <el-row :gutter="20">
                        <el-col :md="12">
                          <div class="info-section">
                            <h4>Основная информация</h4>
                            <el-form :model="editForm" label-position="left" label-width="150px">
                              <el-form-item label="Название">
                                <span v-if="!isEditMode">{{ event.label }}</span>
                                <el-input v-else v-model="editForm.label" />
                              </el-form-item>
                              
                              <el-form-item label="Дата проведения">
                                <span v-if="!isEditMode">{{ formatDate(event.start_date) }}</span>
                                <el-date-picker
                                  v-else
                                  v-model="editForm.start_date"
                                  type="date"
                                  placeholder="Выберите дату"
                                  format="DD.MM.YYYY"
                                  value-format="YYYY-MM-DD"
                                  style="width: 100%"
                                />
                              </el-form-item>
                              
                              <el-form-item label="Язык">
                                <span v-if="!isEditMode">{{ getLanguageLabel(event.language) }}</span>
                                <el-select v-else v-model="editForm.language" style="width: 100%">
                                  <el-option label="Русский" value="rus" />
                                  <el-option label="English" value="eng" />
                                  <el-option label="Հայերեն" value="arm" />
                                </el-select>
                              </el-form-item>
                              
                              <el-form-item label="Статус">
                                <el-tag v-if="!isEditMode" :type="getStatusTagType(event.status)">
                                  {{ getStatusLabel(event.status) }}
                                </el-tag>
                                <el-select v-else v-model="editForm.status" style="width: 100%">
                                  <el-option label="Запланировано" value="planned" />
                                  <el-option label="Активно" value="active" />
                                  <el-option label="Завершено" value="completed" />
                                </el-select>
                              </el-form-item>
                              
                              <el-form-item label="Категория" v-if="event.event_type || isEditMode">
                                <el-tag 
                                  v-if="!isEditMode && event.event_type"
                                  :style="{ 
                                    backgroundColor: getEventTypeColor(), 
                                    color: 'white',
                                    border: 'none'
                                  }"
                                >
                                  {{ event.event_type.label }}
                                </el-tag>
                                <el-select 
                                  v-else-if="isEditMode && eventTypes.length > 0" 
                                  v-model="editForm.event_type_id" 
                                  style="width: 100%"
                                  placeholder="Выберите категорию"
                                >
                                  <el-option 
                                    v-for="eventType in eventTypes" 
                                    :key="eventType.id" 
                                    :label="eventType.label" 
                                    :value="eventType.id" 
                                  />
                                </el-select>
                              </el-form-item>
                            </el-form>
                          </div>
                        </el-col>
                        
                        <el-col :md="12">
                          <div class="info-section">
                            <h4>Статистика</h4>
                            <el-descriptions :column="1" border>
                              <el-descriptions-item label="Всего столов">
                                {{ tableCount }}
                              </el-descriptions-item>
                              <el-descriptions-item label="Активных столов">
                                {{ activeTables.length }}
                              </el-descriptions-item>
                              <el-descriptions-item label="Всего игр">
                                {{ totalGamesCount }}
                              </el-descriptions-item>
                              <el-descriptions-item label="Завершенных игр">
                                {{ completedGamesCount }}
                              </el-descriptions-item>
                              <el-descriptions-item label="Дата создания">
                                {{ formatDateTime(event.created_at) }}
                              </el-descriptions-item>
                            </el-descriptions>
                          </div>
                        </el-col>
                      </el-row>

                      <!-- Информация о мероприятии -->
                      <div class="event-description">
                        <h3>Информация о мероприятии</h3>
                        <div v-if="!isEditMode" class="description-content">
                          <div v-if="editForm.description" class="description-markdown">
                            <MdPreview :model-value="editForm.description" />
                          </div>
                          <div v-else class="description-placeholder">
                            Информация о мероприятии не добавлена. Нажмите "Редактировать" чтобы добавить подробное описание.
                          </div>
                        </div>
                        <div v-else class="markdown-editor">
                          <MdEditor
                            v-model="editForm.description"
                            :placeholder="markdownPlaceholder"
                            language="ru"
                            preview-theme="default"
                            code-theme="atom"
                            :toolbars="markdownToolbars"
                          />
                        </div>
                      </div>

                      <!-- Дополнительная информация если есть -->
                      <div v-if="event.notes || event.location" class="info-section mt-4">
                        <h4>Дополнительная информация</h4>
                        <el-descriptions :column="1" border>
                          <el-descriptions-item label="Место проведения" v-if="event.location">
                            {{ event.location }}
                          </el-descriptions-item>
                          <el-descriptions-item label="Заметки" v-if="event.notes">
                            {{ event.notes }}
                          </el-descriptions-item>
                        </el-descriptions>
                      </div>
                    </div>

                    <el-skeleton v-else :rows="8" animated />
                  </div>
                </el-tab-pane>

                <!-- Вкладка Столы -->
                <el-tab-pane label="Столы" name="tables">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Grid /></el-icon>
                      Столы
                    </span>
                  </template>

                  <!-- Список столов -->
                  <div class="tab-content">
                    <div class="tab-header">
                      <span class="tab-title">Игровые столы</span>
                      <div class="header-actions">
                        <el-button 
                          v-if="canGenerateSeating"
                          type="success" 
                          size="small"
                          @click="showSeatingDialog = true"
                          >
                          <el-icon><Grid /></el-icon>
                          Сгенерировать рассадку ({{ confirmedPlayersCount }} игроков)
                        </el-button>
                        <el-button 
                          type="primary" 
                          size="small"
                          @click="createNewTable"
                          >
                          <el-icon><Plus /></el-icon>
                          Добавить стол
                        </el-button>
                      </div>
                    </div>

                    <div v-if="event">
                      <div v-if="tableCount === 0" class="no-tables">
                        <el-empty description="У этого мероприятия нет столов" />
                      </div>

                      <div v-else class="tables-list">
                        <div
                          v-for="(table, index) in tables"
                          :key="index"
                          class="table-item"
                          :class="{ active: selectedTable === table, virtual: table.isVirtual }"
                          @click="selectTable(table)"
                          >
                          <el-button 
                            class="table-delete-btn"
                            link
                            size="small"
                            @click.stop="deleteTable(table)"
                            >
                            <el-icon><Close /></el-icon>
                          </el-button>
                          
                          <div class="table-content">
                            <div class="table-name">
                              {{ table.table_name }}
                              <el-tag 
                                v-if="table.isVirtual" 
                                type="warning" 
                                size="small" 
                                class="ml-2"
                              >
                                Временный
                              </el-tag>
                            </div>
                            <div v-if="table.game_masters && table.game_masters.length > 0" class="table-judge">
                              {{ table.game_masters.map(m => m.nickname).join(', ') }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <el-skeleton v-else :rows="3" animated />

                    <!-- Детали выбранного стола -->
                    <el-divider v-if="selectedTable" />
                    
                    <div v-if="selectedTable" class="table-details">
                      <div class="tab-header">
                        <span class="tab-title">{{ selectedTable.table_name }}</span>
                        <el-button 
                          v-if="event?.status !== 'completed'"
                          type="success" 
                          size="small"
                          @click="createNewGame"
                          >
                          <el-icon><Plus /></el-icon>
                          Новая игра
                        </el-button>
                      </div>

                      <!-- Предупреждение для виртуальных столов -->
                      <el-alert
                        v-if="selectedTable.isVirtual"
                        title="Временный стол"
                        type="warning"
                        description="Этот стол будет сохранен только после создания первой игры на нем. До этого момента стол будет пропадать при обновлении страницы."
                        :closable="false"
                        class="mb-4"
                      />

                      <!-- Игры стола -->
                      <div class="games-section">
                        <h5 class="section-title">Игры ({{ games.length }})</h5>

                        <div v-if="games.length === 0" class="no-games">
                          <el-empty description="У этого стола еще нет игр" />
                        </div>

                        <div v-else class="games-list">
                          <div 
                            v-for="game in games"
                            :key="game.id"
                            class="game-item clickable"
                            @click="openGame(game.id)"
                            >
                            <el-button 
                              class="game-delete-btn"
                              link
                              size="small"
                              @click.stop="deleteGame(game.id)"
                              >
                              <el-icon><Close /></el-icon>
                            </el-button>
                            
                            <div class="game-main-content">
                              <div class="game-header">
                                <h6 class="game-name">{{ game.label }}</h6>
                                <el-tag 
                                  v-if="game.result" 
                                  :type="getResultType(game.result)" 
                                  :class="{ 'mafia-win-tag': game.result === 'mafia_win' }"
                                  size="small"
                                >
                                  {{ getResultLabel(game.result) }}
                                </el-tag>
                              </div>
                              
                              <div class="game-info">
                                <div class="game-datetime">
                                  <el-icon size="14"><Calendar /></el-icon>
                                  {{ formatDateTime(game.started_at) }}
                                </div>
                                <span v-if="game.game_master && !isGameMasterSameAsTable(game)" class="game-master">
                                  <el-icon size="14"><User /></el-icon>
                                  {{ game.game_master.nickname }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- Вкладка Финансы -->
                <el-tab-pane label="Финансы" name="finances">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Money /></el-icon>
                      Финансы
                    </span>
                  </template>

                  <EventFinances v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

                <!-- Вкладка Игроки -->
                <el-tab-pane label="Игроки" name="players">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><User /></el-icon>
                      Игроки
                    </span>
                  </template>

                  <EventPlayers v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

                <!-- Вкладка Результаты -->
                <el-tab-pane label="Результаты" name="results">
                  <template #label>
                    <span style="display: flex; align-items: center; gap: 4px;">
                      <el-icon><Trophy /></el-icon>
                      Результаты
                    </span>
                  </template>

                  <EventResults v-if="event" :event="event" />
                  <el-skeleton v-else :rows="5" animated />
                </el-tab-pane>

              </el-tabs>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>

    <!-- Диалог генерации рассадки -->
    <GenerateSeatingDialog
      v-if="event"
      v-model="showSeatingDialog"
      :confirmed-players="registrationsStore.confirmedRegistrations"
      :event-id="event.id"
      @generated="handleSeatingGenerated"
    />


  </div>
</template>

<script setup>
  import { ref, computed, reactive, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import { useRegistrationsStore } from '@/stores/registrations'
  import { useEventTypesStore } from '@/stores/eventTypes'
  import { apiService } from '@/services/api'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import EventFinances from '@/components/events/EventFinances.vue'
  import EventPlayers from '@/components/events/EventPlayers.vue'
  import EventResults from '@/components/events/EventResults.vue'
  import GenerateSeatingDialog from '@/components/events/GenerateSeatingDialog.vue'
  import { 
      ArrowLeft, 
      InfoFilled,
      Plus,
      Delete,
      Close,
      Grid,
      Calendar,
      User,
      Money,
      Trophy,
      Edit
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const eventsStore = useEventsStore()
  const registrationsStore = useRegistrationsStore()
  const eventTypesStore = useEventTypesStore()

  const event = ref(null)
  const selectedTable = ref(null)
  const games = ref([])
  const virtualTables = ref([])
  const activeTab = ref('info')
  const showSeatingDialog = ref(false)
  const isEditMode = ref(false)
  const saving = ref(false)
  const eventTypes = ref([])
  
  const editForm = reactive({
    label: '',
    description: '',
    start_date: '',
    language: 'rus',
    event_type_id: '',
    status: 'planned'
  })

  // Настройки для Markdown редактора
  const markdownToolbars = [
    'bold', 'underline', 'italic', 'strikeThrough', '-',
    'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-',
    'codeRow', 'code', 'link', 'image', 'table', 'mermaid', 'katex', '-',
    'revoke', 'next', 'save', '=', 'pageFullscreen', 'fullscreen', 'preview', 'previewOnly'
  ]
  
  const markdownPlaceholder = `# Информация о мероприятии

## Описание
Добавьте краткое описание мероприятия...

## Цели и задачи
- Первая цель
- Вторая цель

## Формат проведения
Опишите формат турнира...

## Правила и регламент
1. Первое правило
2. Второе правило

## Контактная информация
**Организатор:** Ваше имя  
**Телефон:** +7 (xxx) xxx-xx-xx  
**Email:** example@example.com

## Дополнительные условия
> Важная информация для участников

---
*Используйте Markdown для форматирования текста*`

  const tables = computed(() => {
    const realTables = event.value?.tables || []
    return [...realTables, ...virtualTables.value]
  })

  const tableCount = computed(() => {
    return tables.value.length
  })

  const confirmedPlayersCount = computed(() => {
    return registrationsStore.confirmedRegistrations.length
  })

  const canGenerateSeating = computed(() => {
    return event.value && confirmedPlayersCount.value >= 10
  })

  const selectTable = (table) => {
    selectedTable.value = table
    // Сортируем игры по названию (Игра 1, Игра 2, и т.д.)
    const sortedGames = (table.games || []).sort((a, b) => {
      // Извлекаем числа из названий игр
      const getGameNumber = (label) => {
        const match = label.match(/Игра\s*[#№]?\s*(\d+)/i)
        return match ? parseInt(match[1]) : 0
      }
      
      const aNum = getGameNumber(a.label)
      const bNum = getGameNumber(b.label)
      
      return aNum - bNum
    })
    games.value = sortedGames
  }


  const openGame = (gameId) => {
    router.push(`/game/${gameId}`)
  }

  const deleteGame = async (gameId) => {
    try {
      await apiService.updateGame(gameId, { is_hidden: true })
      // Удаляем игру из локального состояния
      if (selectedTable.value && selectedTable.value.games) {
        selectedTable.value.games = selectedTable.value.games.filter(game => game.id !== gameId)
        games.value = selectedTable.value.games
      }
      ElMessage.success('Игра скрыта!')
    } catch (error) {
      console.error('Ошибка при скрытии игры:', error)
      ElMessage.error('Не удалось скрыть игру')
    }
  }

  const createNewTable = () => {
    const tableNumber = tables.value.length + 1
    
    // Используем template из события, или "Стол {}" по умолчанию
    const template = event.value?.table_name_template || 'Стол {}'
    const tableName = template.replace('{}', tableNumber)
    
    const newTable = {
      table_name: tableName,
      game_masters: [],
      games: [],
      isVirtual: true
    }
    
    virtualTables.value.push(newTable)
    selectTable(newTable)
    ElMessage.success('Стол создан!')
  }

  const deleteTable = async (table) => {
    try {
      // Подтверждение удаления
      await ElMessageBox.confirm(
        `Вы уверены, что хотите удалить стол "${table.table_name}" и все его игры (${table.games?.length || 0} игр)?`,
        'Подтверждение удаления',
        {
          confirmButtonText: 'Удалить',
          cancelButtonText: 'Отмена',
          type: 'warning'
        }
      )

      // Если это виртуальный стол, просто удаляем его из списка
      if (table.isVirtual) {
        virtualTables.value = virtualTables.value.filter(t => t !== table)
        if (selectedTable.value === table) {
          selectedTable.value = null
          games.value = []
        }
        ElMessage.success('Временный стол удален')
        return
      }

      // Для реальных столов - удаляем все игры
      const tableIndex = tables.value.indexOf(table)
      if (tableIndex === -1) return

      const tableId = tableIndex + 1
      const gamesToDelete = table.games || []
      
      // Удаляем все игры стола
      for (const game of gamesToDelete) {
        await apiService.updateGame(game.id, { is_hidden: true })
      }

      // Если удаляемый стол был выбран, сбрасываем выбор
      if (selectedTable.value === table) {
        selectedTable.value = null
        games.value = []
      }

      // Перезагружаем данные события
      await loadEvent()
      
      ElMessage.success(`Стол "${table.table_name}" и все его игры удалены`)
      
    } catch (error) {
      if (error !== 'cancel') {
        console.error('Ошибка при удалении стола:', error)
        ElMessage.error('Не удалось удалить стол')
      }
    }
  }

  const createNewGame = async () => {
    if (!selectedTable.value) {
      ElMessage.error('Выберите стол для создания игры')
      return
    }

    try {
      const gameNumber = (selectedTable.value.games?.length || 0) + 1
      const tableId = tables.value.indexOf(selectedTable.value) + 1
      
      const gameData = {
        label: `Игра #${gameNumber}`,
        event_id: route.params.id,
        table_id: tableId
      }
      
      const newGame = await apiService.createGame(gameData)
      
      // Перезагружаем данные события с сервера для получения актуальной информации
      await loadEvent()
      
      // Очищаем виртуальные столы, так как они могли стать реальными
      virtualTables.value = virtualTables.value.filter(virtualTable => {
        // Удаляем виртуальный стол, если появился реальный стол с таким же именем
        return !event.value?.tables?.some(realTable => realTable.table_name === virtualTable.table_name)
      })
      
      // Находим обновленный стол и обновляем игры
      // Сохраняем имя выбранного стола для поиска после обновления
      const selectedTableName = selectedTable.value.table_name
      const updatedTable = tables.value.find(table => table.table_name === selectedTableName)
      if (updatedTable) {
        selectTable(updatedTable)
      }
      
      ElMessage.success('Игра создана!')
    } catch (error) {
      console.error('Ошибка создания игры:', error)
      ElMessage.error('Ошибка при создании игры')
    }
  }



  const loadEvent = async () => {
      try {
	  const eventId = route.params.id  // Убираем parseInt, чтобы сохранить UUID
	  console.log('Loading event with ID:', eventId)
	  console.log('Route params:', route.params)
	  event.value = await apiService.getEvent(eventId)
	  console.log('Event loaded:', event.value)
	  console.log('Event type:', event.value?.event_type)
	  console.log('Event type color:', event.value?.event_type?.color)
	  
	  // Заполняем форму редактирования
	  if (event.value) {
	      editForm.label = event.value.label || ''
	      editForm.description = event.value.description || ''
	      editForm.start_date = event.value.start_date || ''
	      editForm.language = event.value.language || 'rus'
	      // Берем ID типа события из объекта event_type или напрямую из event_type_id
	      editForm.event_type_id = event.value.event_type?.id || event.value.event_type_id || ''
	      editForm.status = event.value.status || 'planned'
	      
	      console.log('Form initialized with event_type_id:', editForm.event_type_id)
	      console.log('Available event types:', eventTypes.value)
	  }
	  
	  // Проверяем и исправляем имена столов, если они не соответствуют шаблону
	  if (event.value?.tables && event.value?.table_name_template) {
	      const template = event.value.table_name_template
	      event.value.tables.forEach((table, index) => {
	          // Если имя стола пустое или не соответствует шаблону
	          if (!table.table_name || table.table_name === '') {
	              const expectedName = template.replace('{}', index + 1)
	              table.table_name = expectedName
	              console.log(`Fixed table name: ${expectedName}`)
	          }
	      })
	  }
	  
	  // Загружаем регистрации для подсчета игроков
	  try {
	    await registrationsStore.fetchEventRegistrations(eventId)
	  } catch (error) {
	    console.warn('Failed to load registrations:', error)
	  }
	  
	  // Автоматически выбираем первый стол только если ни один стол не выбран
	  if (tables.value.length > 0 && !selectedTable.value) {
	    selectTable(tables.value[0])
	  }
      } catch (error) {
	  console.error('Error loading event:', error)
	  ElMessage.error(`Ошибка загрузки мероприятия: ${error.message}`)
	  router.push('/')
      }
  }

  // Вспомогательные функции

  const getLanguageLabel = (language) => {
      const labels = {
	  'ru': 'Русский',
	  'en': 'English',
	  'am': 'Հայերեն'
      }
      return labels[language] || 'Русский'
  }

  const getTableNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'столов'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'стол'
      if (lastDigit >= 2 && lastDigit <= 4) return 'стола'
      return 'столов'
  }

  const getGameStatusLabel = (status) => {
      const labels = {
	  'not_started': 'Не начата',
	  'in_progress': 'В процессе', 
	  'finished': 'Завершена'
      }
      return labels[status] || 'Неизвестно'
  }

  const getGameStatusType = (status) => {
    if (!status) return 'info'
    const types = {
      'not_started': 'info',
      'in_progress': 'primary',
      'finished': 'success'
    }
    return types[status] || 'info'
  }

  const getResultLabel = (result) => {
    const labels = {
      'civilians_win': 'Победа города',
      'mafia_win': 'Победа мафии',
      'draw': 'Ничья',
      'created': 'Создана',
      'seating_ready': 'Рассадка готова',
      'roles_assigned': 'Роли розданы',
      'role_distribution': 'Роздача ролей',
      'in_progress': 'В процессе',
      'finished_no_scores': 'Завершена без баллов',
      'finished_with_scores': 'Завершена с баллами',
      'cancelled': 'Отменена'
    }
    return labels[result] || result
  }

  const getResultType = (result) => {
    if (!result) return 'info'
    const types = {
      'civilians_win': 'danger',
      'mafia_win': undefined,
      'draw': 'warning',
      'created': 'info',
      'seating_ready': 'warning',
      'roles_assigned': 'warning',
      'role_distribution': 'warning',
      'in_progress': 'primary',
      'finished_no_scores': 'success',
      'finished_with_scores': 'success',
      'cancelled': 'info'
    }
    return types[result] || 'info'
  }

  const isGameMasterSameAsTable = (game) => {
    // Проверяем, есть ли судья игры и судьи стола
    if (!game.game_master || !selectedTable.value?.game_masters || selectedTable.value.game_masters.length === 0) {
      return false
    }
    
    // Проверяем, является ли судья игры одним из судей стола
    return selectedTable.value.game_masters.some(
      tableMaster => tableMaster.id === game.game_master.id
    )
  }


  const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: 'long',
	  year: 'numeric'
      })
  }

  const formatDateTime = (dateString) => {
      if (!dateString) return 'Не указано'
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

  const getEventTypeColor = () => {
      if (!event.value?.event_type?.color) {
          return '#409eff' // Синий по умолчанию
      }
      
      let color = event.value.event_type.color
      console.log('Original color from API:', color)
      
      // Если цвет не начинается с #, добавляем его
      if (!color.startsWith('#')) {
          color = '#' + color
      }
      
      console.log('Final color to apply:', color)
      return color
  }

  const goToRegistration = () => {
      router.push(`/event/${route.params.id}/register`)
  }

  const getStatusLabel = (status) => {
      const labels = {
          'planned': 'Запланировано',
          'active': 'Активно',
          'completed': 'Завершено'
      }
      return labels[status] || 'Неизвестно'
  }

  const getStatusTagType = (status) => {
      const types = {
          'planned': 'info',
          'active': 'success',
          'completed': 'warning'
      }
      return types[status] || 'info'
  }


  // Computed properties для статистики
  const activeTables = computed(() => {
      return tables.value.filter(table => !table.isVirtual)
  })

  const totalGamesCount = computed(() => {
      return tables.value.reduce((total, table) => {
          return total + (table.games ? table.games.length : 0)
      }, 0)
  })

  const completedGamesCount = computed(() => {
      return tables.value.reduce((total, table) => {
          const completedGames = table.games ? table.games.filter(game => game.status === 'finished').length : 0
          return total + completedGames
      }, 0)
  })

  const handleSeatingGenerated = async (result) => {
      console.log('Seating generated:', result)
      
      try {
          const { games, distribution } = result
          const eventId = route.params.id
          
          // Получаем количество столов из результата генерации
          const tablesCount = distribution.length
          const currentTables = tables.value.filter(t => !t.isVirtual).length
          
          // НЕ создаем виртуальные столы, так как они будут созданы автоматически
          // при создании игр на бэкенде
          
          // Создаем игры с рассадкой
          let createdGames = 0
          
          // Получаем существующие столы для расчета смещения
          const existingTablesCount = event.value?.tables?.length || 0
          
          // Группируем игры по столам для правильной нумерации
          const gamesPerTable = {}
          
          // Создаем игры последовательно для сохранения правильного порядка
          for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
              const gameInfo = games[gameIndex]
              const gamePlayers = gameInfo.playing || gameInfo // Поддержка обоих форматов
              
              // Распределяем игры по столам равномерно
              // Если у нас N столов и M игр, то на каждый стол приходится M/N игр
              const gamesPerTableCount = Math.ceil(games.length / tablesCount)
              const tableIndex = Math.floor(gameIndex / gamesPerTableCount)
              
              // Добавляем смещение для новых столов
              const tableNumber = existingTablesCount + tableIndex + 1
              
              console.log(`Game ${gameIndex + 1}/${games.length} -> Table ${tableNumber} (new table, offset: ${existingTablesCount})`)
              
              // Формируем имя стола
              const template = event.value?.table_name_template || 'Стол {}'
              const tableName = template.replace('{}', tableNumber)
              
              // Считаем количество игр на этом столе (используем относительный индекс)
              const relativeTableNumber = tableIndex + 1
              if (!gamesPerTable[relativeTableNumber]) {
                  gamesPerTable[relativeTableNumber] = 0
              }
              gamesPerTable[relativeTableNumber]++
              
              // Используем общий номер игры (gameIndex + 1) для последовательной нумерации
              const gameData = {
                  label: `Игра ${gameIndex + 1}`,
                  event_id: eventId,
                  table_id: tableNumber
              }
              
              console.log('Creating game with data:', gameData, 'Table name:', tableName)
              
              try {
                  // Создаем игру и ждем завершения перед созданием следующей
                  const createdGame = await apiService.createGameWithPlayers(gameData, gamePlayers)
                  console.log('Game created:', createdGame)
                  createdGames++
                  
                  // Логируем информацию о пропускающих игроках
                  if (gameInfo.sittingOut && gameInfo.sittingOut.length > 0) {
                      console.log(`Игра ${gameIndex + 1}: пропускают ${gameInfo.sittingOut.map(p => p.nickname).join(', ')}`)
                  }
              } catch (error) {
                  console.error('Ошибка создания игры:', error)
                  ElMessage.error(`Ошибка создания игры ${gameIndex + 1}`)
              }
          }
          
          ElMessage.success(`Создано ${createdGames} игр с автоматической рассадкой`)
          
          // Очищаем виртуальные столы перед перезагрузкой
          virtualTables.value = []
          
          // Перезагрузить данные события
          await loadEvent()
          
          console.log('Event tables after reload:', event.value?.tables)
          
      } catch (error) {
          console.error('Ошибка генерации рассадки:', error)
          ElMessage.error('Ошибка при создании игр с рассадкой')
      }
  }

  const saveEventChanges = async () => {
      saving.value = true
      try {
          const updatedEvent = await eventsStore.updateEvent(event.value.id, editForm)
          
          if (updatedEvent) {
              ElMessage.success('Изменения сохранены!')
              event.value = updatedEvent
              isEditMode.value = false
              await loadEvent()
          } else {
              ElMessage.error('Не удалось сохранить изменения')
          }
      } catch (error) {
          console.error('Ошибка сохранения:', error)
          ElMessage.error(error.response?.data?.message || 'Ошибка при сохранении изменений')
      } finally {
          saving.value = false
      }
  }

  const cancelEdit = () => {
      // Восстанавливаем оригинальные значения
      if (event.value) {
          editForm.label = event.value.label || ''
          editForm.description = event.value.description || ''
          editForm.start_date = event.value.start_date || ''
          editForm.language = event.value.language || 'rus'
          // Берем ID типа события из объекта event_type или напрямую из event_type_id
          editForm.event_type_id = event.value.event_type?.id || event.value.event_type_id || ''
          editForm.status = event.value.status || 'planned'
      }
      isEditMode.value = false
  }

  const handleEventUpdated = (updatedEvent) => {
      // Обновляем локальное состояние события
      event.value = updatedEvent
      // Перезагружаем данные события
      loadEvent()
  }

  onMounted(async () => {
      // Сначала загружаем типы событий для редактирования
      try {
          await eventTypesStore.loadEventTypes()
          eventTypes.value = eventTypesStore.eventTypes
          console.log('Event types loaded:', eventTypes.value)
      } catch (error) {
          console.error('Ошибка загрузки типов событий:', error)
      }
      
      // Затем загружаем мероприятие (форма будет правильно инициализирована)
      await loadEvent()
  })
</script>

<style scoped>
  .event-view {
      min-height: 100vh;
      background-color: #f5f7fa;
  }

  .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
  }

  .header-actions {
      display: flex;
      gap: 10px;
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



  .no-tables, .no-selection, .no-games {
      padding: 32px 0;
      text-align: center;
  }

  .table-item {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 12px 16px;
      transition: all 0.3s ease;
      border-radius: 6px;
      margin-bottom: 8px;
      border: 1px solid #ebeef5;
  }

  .table-item:hover {
      background-color: #f0f9ff;
      border-color: #409eff;
  }

  .table-item:hover .table-delete-btn {
      opacity: 1;
  }

  .table-item.active {
      background-color: #ecf5ff;
      border-color: #409eff;
  }

  .table-item.virtual {
      border: 1px dashed #e6a23c;
      background-color: #fdf6ec;
  }

  .table-item.virtual:hover {
      background-color: #faecd8;
  }

  .table-delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 4px;
      min-width: auto;
      width: 24px;
      height: 24px;
  }

  .table-delete-btn:hover {
      color: #f56c6c;
      background-color: #fee;
  }

  .table-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .table-item.virtual.active {
      background-color: #f5dab1;
      border-color: #e6a23c;
  }

  .table-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .table-judge {
      color: #606266;
      font-size: 14px;
  }

  .table-masters {
      margin-top: 8px;
  }

  .master-name {
      font-size: 12px;
      color: #606266;
      margin-top: 2px;
  }

  .text-muted {
      color: #909399;
      font-size: 11px;
  }

  .table-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .judge-info {
      font-size: 12px;
      color: #909399;
  }

  .section-title {
      margin: 0 0 16px 0;
      font-weight: 600;
      border-bottom: 1px solid #ebeef5;
      padding-bottom: 8px;
  }

  .games-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .game-item {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid #ebeef5;
      border-radius: 6px;
      background-color: #fff;
      transition: all 0.3s ease;
  }

  .game-item.clickable {
      cursor: pointer;
  }

  .game-item:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
      transform: translateY(-1px);
  }

  .game-item:hover .game-delete-btn {
      opacity: 1;
  }

  .game-delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 4px;
      min-width: auto;
      width: 24px;
      height: 24px;
  }

  .game-delete-btn:hover {
      color: #f56c6c;
      background-color: #fee;
  }

  .game-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .game-header {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .game-name {
      margin: 0;
      font-weight: 600;
      font-size: 16px;
      color: #303133;
  }

  .game-info {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: #606266;
  }

  .game-datetime {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #909399;
  }

  .game-master {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #606266;
      align-items: center;
  }

  .game-meta {
      display: flex;
      gap: 16px;
  }

  .game-master {
      font-size: 12px;
      color: #606266;
  }

  .game-status {
      display: flex;
      align-items: center;
  }

  .game-actions {
      display: flex;
      gap: 8px;
      align-items: center;
  }


  .mb-2 {
      margin-bottom: 8px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .ml-2 {
      margin-left: 8px;
  }

  .tab-content {
      padding: 16px 0;
  }

  .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ebeef5;
  }

  .tab-title {
      font-weight: 600;
      font-size: 16px;
      color: #303133;
  }

  .tab-header .header-actions {
      display: flex;
      gap: 8px;
  }

  .event-detailed-info {
      max-width: 100%;
  }

  .info-section {
      margin-bottom: 24px;
  }

  .info-section h4 {
      margin: 0 0 16px 0;
      color: #303133;
      font-weight: 600;
      font-size: 16px;
      border-bottom: 2px solid #409eff;
      padding-bottom: 8px;
  }

  .mt-4 {
      margin-top: 24px;
  }

  .edit-mode-controls {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e4e7ed;
  }

  .edit-mode-controls div {
      display: flex;
      gap: 8px;
  }

  .event-description {
      margin: 32px 0;
  }

  .event-description h3 {
      margin: 0 0 20px 0;
      color: #303133;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #409eff;
      padding-bottom: 8px;
  }

  .description-content {
      min-height: 120px;
  }

  .description-text {
      font-size: 16px;
      line-height: 1.8;
      color: #303133;
      white-space: pre-wrap;
      padding: 16px 0;
  }

  .description-placeholder {
      font-size: 16px;
      line-height: 1.6;
      color: #909399;
      font-style: italic;
      padding: 16px 0;
  }

  .event-description :deep(.el-textarea__inner) {
      font-size: 16px;
      line-height: 1.6;
      min-height: 300px !important;
  }

  .event-description :deep(.el-textarea) {
      margin-top: 8px;
  }

  .event-detailed-info :deep(.el-form-item__label) {
      font-weight: 600;
      color: #606266;
  }

  .event-detailed-info :deep(.el-form-item__content) {
      font-size: 14px;
  }
  
  /* Серый фон для победы мафии */
  :deep(.el-tag.el-tag--small:not(.el-tag--danger):not(.el-tag--warning):not(.el-tag--primary):not(.el-tag--success):not(.el-tag--info)) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }
  
  /* Альтернативный селектор для тегов с дефолтным стилем */
  :deep(.el-tag.el-tag--small[class*="el-tag"]:not([class*="el-tag--"])) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }
  
  /* Прямой стиль для победы мафии */
  :deep(.mafia-win-tag) {
      background-color: #606266 !important;
      border-color: #606266 !important;
      color: white !important;
  }

  /* Стили для Markdown редактора и просмотра */
  .markdown-editor {
    margin-top: 16px;
  }

  .markdown-editor :deep(.md-editor) {
    height: 500px;
    font-size: 14px;
  }

  .description-markdown {
    padding: 16px 0;
  }

  .description-markdown :deep(.md-preview) {
    padding: 0;
    font-size: 16px;
    line-height: 1.6;
  }

  .description-markdown :deep(h1) {
    font-size: 24px;
    margin: 24px 0 16px 0;
    border-bottom: 2px solid #409eff;
    padding-bottom: 8px;
  }

  .description-markdown :deep(h2) {
    font-size: 20px;
    margin: 20px 0 12px 0;
    color: #303133;
  }

  .description-markdown :deep(h3) {
    font-size: 18px;
    margin: 16px 0 8px 0;
    color: #606266;
  }

  .description-markdown :deep(p) {
    margin: 12px 0;
    line-height: 1.8;
  }

  .description-markdown :deep(ul, ol) {
    margin: 12px 0;
    padding-left: 24px;
  }

  .description-markdown :deep(li) {
    margin: 8px 0;
    line-height: 1.6;
  }

  .description-markdown :deep(blockquote) {
    border-left: 4px solid #409eff;
    background-color: #f0f9ff;
    padding: 12px 16px;
    margin: 16px 0;
    color: #606266;
  }

  .description-markdown :deep(code) {
    background-color: #f5f7fa;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
  }

  .description-markdown :deep(pre) {
    background-color: #f5f7fa;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
  }

  .description-markdown :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }

  .description-markdown :deep(th, td) {
    border: 1px solid #e4e7ed;
    padding: 8px 12px;
    text-align: left;
  }

  .description-markdown :deep(th) {
    background-color: #f5f7fa;
    font-weight: 600;
  }
</style>
