<template>
  <div class="event-finances">
    <!-- Общая информация о стоимости -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <el-icon><Money /></el-icon>
          <span>Стоимость участия</span>
        </div>
      </template>

      <div v-if="eventTariff" class="tariff-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Тариф">
            {{ eventTariff.label }}
          </el-descriptions-item>
          <el-descriptions-item label="Стоимость за игру">
            {{ formatPrice(eventTariff.price, eventTariff.iso_4217_code) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-empty v-else description="Тариф для мероприятия не установлен" />
    </el-card>

    <!-- Счета игроков -->
    <el-card>
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>Счета участников</span>
          <el-button 
            type="primary" 
            size="small"
            @click="showCreateInvoiceDialog = true"
            >
            <el-icon><Plus /></el-icon>
            Создать счет
          </el-button>
        </div>
      </template>

      <div v-if="loading" class="loading">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="invoices.length === 0" class="no-invoices">
        <el-empty description="Нет счетов для этого мероприятия" />
      </div>

      <div v-else class="invoices-list">
        <el-table :data="invoices" stripe style="width: 100%">
          <el-table-column prop="user.nickname" label="Игрок" width="200" />
          <el-table-column label="Количество игр" width="120" align="center">
            <template #default="{ row }">
              {{ getPlayerGameCount(row.user.id) }}
            </template>
          </el-table-column>
          <el-table-column label="К доплате" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getPaymentStatusType(row)">
                {{ formatPrice(calculateAmountToPay(row), eventTariff?.iso_4217_code || 'RUB') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sum" label="Уплачено" width="120" align="center">
            <template #default="{ row }">
              {{ formatPrice(row.sum, row.currency || 'RUB') }}
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="Дата создания" width="140">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="Статус" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.closed_at ? 'success' : 'warning'" size="small">
                {{ row.closed_at ? 'Закрыт' : 'Открыт' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Действия" width="120" align="center">
            <template #default="{ row }">
              <el-button 
                v-if="!row.closed_at"
                type="success" 
                size="small" 
                circle
                @click="closeInvoice(row)"
                title="Закрыть счет"
                >
                <el-icon><Check /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle
                @click="deleteInvoice(row)"
                title="Удалить счет"
                >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- Диалог создания счета -->
    <el-dialog 
      v-model="showCreateInvoiceDialog" 
      title="Создать счет" 
      width="500px"
      >
      <el-form :model="invoiceForm" label-width="120px">
        <el-form-item label="Игрок" required>
          <el-select v-model="invoiceForm.user_id" placeholder="Выберите игрока" filterable>
            <el-option
              v-for="player in availablePlayers"
              :key="player.id"
              :label="player.nickname"
              :value="player.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateInvoiceDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createInvoice" :disabled="!invoiceForm.user_id">
          Создать
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { apiService } from '@/services/api'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Money, 
      Document, 
      Plus, 
      Check, 
      Delete 
  } from '@element-plus/icons-vue'

  const props = defineProps({
      event: {
          type: Object,
          required: false,
          default: null
      }
  })

  const invoices = ref([])
  const eventTariff = ref(null)
  const allPlayers = ref([])
  const playerGameCounts = ref({})
  const loading = ref(false)
  const showCreateInvoiceDialog = ref(false)

  const invoiceForm = ref({
      user_id: null
  })

  // Игроки, которые еще не имеют счетов
  const availablePlayers = computed(() => {
      const existingUserIds = invoices.value.map(invoice => invoice.user.id)
      return allPlayers.value.filter(player => !existingUserIds.includes(player.id))
  })

  const loadEventFinances = async () => {
      if (!props.event?.id) return

      loading.value = true
      try {
          // Пока отключаем загрузку счетов
          // const allInvoices = await apiService.getInvoices()
          // invoices.value = allInvoices.filter(invoice => invoice.event?.id === props.event.id)
          invoices.value = []

          // Загружаем всех игроков, участвующих в мероприятии
          await loadEventPlayers()

          // Загружаем тарифы для определения стоимости
          await loadEventTariff()

      } catch (error) {
          console.error('Ошибка загрузки финансовой информации:', error)
          ElMessage.error('Ошибка загрузки финансовой информации')
      } finally {
          loading.value = false
      }
  }

  const loadEventPlayers = async () => {
      try {
          // Получаем всех игроков из игр мероприятия
          const tables = props.event.tables || []
          const playersSet = new Set()
          const gameCountMap = {}

          for (const table of tables) {
              const games = table.games || []
              for (const game of games) {
                  if (game.players) {
                      for (const player of game.players) {
                          if (player.user_id) {
                              playersSet.add(JSON.stringify({
                                  id: player.user_id,
                                  nickname: player.name
                              }))
                              
                              // Подсчитываем количество игр для каждого игрока
                              gameCountMap[player.user_id] = (gameCountMap[player.user_id] || 0) + 1
                          }
                      }
                  }
              }
          }

          allPlayers.value = Array.from(playersSet).map(playerStr => JSON.parse(playerStr))
          playerGameCounts.value = gameCountMap

      } catch (error) {
          console.error('Ошибка загрузки игроков:', error)
      }
  }

  const loadEventTariff = async () => {
      try {
          const tariffs = await apiService.getTariffs()
          // Предполагаем, что есть базовый тариф или тариф по умолчанию
          eventTariff.value = tariffs.items?.[0] || tariffs[0] || null
      } catch (error) {
          console.error('Ошибка загрузки тарифов:', error)
      }
  }

  const getPlayerGameCount = (userId) => {
      return playerGameCounts.value[userId] || 0
  }

  const calculateAmountToPay = (invoice) => {
      if (!eventTariff.value) return 0
      
      const gamesCount = getPlayerGameCount(invoice.user.id)
      const totalCost = gamesCount * eventTariff.value.price
      const paid = invoice.sum || 0
      
      return Math.max(0, totalCost - paid)
  }

  const getPaymentStatusType = (invoice) => {
      const amountToPay = calculateAmountToPay(invoice)
      
      if (amountToPay === 0) return 'success'
      if (amountToPay > 0 && invoice.sum > 0) return 'warning'
      return 'danger'
  }

  const createInvoice = async () => {
      try {
          // TODO: Временно отключено до реализации API
          ElMessage.info('Функция создания счетов временно недоступна')
          
          showCreateInvoiceDialog.value = false
          invoiceForm.value.user_id = null

      } catch (error) {
          console.error('Ошибка создания счета:', error)
          ElMessage.error('Ошибка при создании счета')
      }
  }

  const closeInvoice = async (invoice) => {
      try {
          // TODO: Временно отключено до реализации API
          ElMessage.info('Функция закрытия счетов временно недоступна')

      } catch (error) {
          console.error('Ошибка закрытия счета:', error)
          ElMessage.error('Ошибка при закрытии счета')
      }
  }

  const deleteInvoice = async (invoice) => {
      try {
          // TODO: Временно отключено до реализации API
          ElMessage.info('Функция удаления счетов временно недоступна')

      } catch (error) {
          console.error('Ошибка удаления счета:', error)
          ElMessage.error('Ошибка при удалении счета')
      }
  }

  const formatPrice = (price, currency = 'RUB') => {
      const currencySymbols = {
          'RUB': '₽',
          'USD': '$',
          'EUR': '€',
          'AMD': '֏'
      }
      
      return `${price || 0} ${currencySymbols[currency] || currency}`
  }

  const formatDate = (dateString) => {
      if (!dateString) return 'Не указано'
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
      })
  }

  onMounted(() => {
      if (props.event?.id) {
          loadEventFinances()
      }
  })

  // Следим за изменениями event
  watch(() => props.event, (newEvent) => {
      if (newEvent?.id) {
          loadEventFinances()
      }
  })
</script>

<style scoped>
  .event-finances {
      padding: 0;
  }

  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 600;
  }

  .tariff-info {
      margin-bottom: 16px;
  }

  .loading {
      padding: 32px 0;
  }

  .no-invoices {
      padding: 32px 0;
      text-align: center;
  }

  .invoices-list {
      margin-top: 16px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }
</style>