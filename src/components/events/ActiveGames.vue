<template>
  <div class="active-games">
    <div v-if="!judgeId" class="no-judge">
      <el-empty description="Выберите ведущего, чтобы увидеть его активные игры" />
    </div>
    
    <div v-else-if="loading" class="loading">
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else-if="activeGames.length === 0" class="no-games">
      <el-empty description="У выбранного ведущего нет активных игр">
        <template #image>
          <el-icon size="100" color="#c0c4cc">
            <VideoPlay />
          </el-icon>
        </template>
      </el-empty>
    </div>
    
    <div v-else class="games-grid">
      <el-card 
        v-for="game in activeGames"
        :key="`${game.eventId}-${game.tableId}-${game.gameId}`"
        class="game-card"
        shadow="hover"
        >
        <template #header>
          <div class="game-header">
            <h5 class="game-name">{{ game.gameName }}</h5>
            <el-tag type="success" size="small">В процессе</el-tag>
          </div>
        </template>
        
        <div class="game-content">
          <div class="game-info">
            <div class="info-row">
              <span class="info-label">Мероприятие:</span>
              <span class="info-value">{{ game.eventName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Стол:</span>
              <span class="info-value">{{ game.tableName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Текущий круг:</span>
              <el-tag type="primary">{{ game.round }}</el-tag>
            </div>
          </div>
        </div>
        
        <template #footer>
          <el-button 
            type="primary" 
            @click="openGame(game)"
            style="width: 100%"
            >
            <el-icon><VideoPlay /></el-icon>
            Продолжить игру
          </el-button>
        </template>
      </el-card>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import { useJudgesStore } from '@/stores/judges'
  import { VideoPlay } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      judgeId: {
	  type: [String, Number],
	  default: null
      }
  })

  const router = useRouter()
  const eventsStore = useEventsStore()
  const judgesStore = useJudgesStore()

  const loading = ref(false)
  const activeGames = ref([])

  const loadActiveGames = async () => {
      if (!props.judgeId) {
	  activeGames.value = []
	  return
      }
      
      loading.value = true
      
      try {
	  // Получаем данные о ведущем
	  const judge = judgesStore.getJudgeById(props.judgeId)
	  if (!judge) {
	      throw new Error('Ведущий не найден')
	  }
	  
	  // Загружаем мероприятия, если они еще не загружены
	  if (eventsStore.events.length === 0) {
	      await eventsStore.loadEvents()
	  }
	  
	  // Ищем все активные игры, где этот ведущий является ведущим стола
	  const foundGames = []
	  
	  eventsStore.events.forEach(event => {
	      if (event.tables && Array.isArray(event.tables)) {
		  event.tables.forEach(table => {
		      // Проверяем, является ли выбранный ведущий ведущим стола
		      if (table.judge && table.judge.includes(judge.name)) {
			  if (table.games && Array.isArray(table.games)) {
			      table.games.forEach(game => {
				  if (game.status === 'in_progress') {
				      foundGames.push({
					  eventId: event.id,
					  eventName: event.name,
					  tableId: table.id,
					  tableName: table.name,
					  gameId: game.id,
					  gameName: game.name,
					  round: game.currentRound || 0
				      })
				  }
			      })
			  }
		      }
		  })
	      }
	  })
	  
	  activeGames.value = foundGames
	  
      } catch (error) {
	  console.error('Ошибка при загрузке активных игр ведущего:', error)
	  ElMessage.error(`Ошибка при загрузке активных игр: ${error.message}`)
	  activeGames.value = []
      } finally {
	  loading.value = false
      }
  }

  const openGame = (game) => {
      // Сохраняем информацию о текущей игре в localStorage
      localStorage.setItem('currentGame', JSON.stringify({
	  eventId: game.eventId,
	  tableId: game.tableId, 
	  gameId: game.gameId
      }))
      
      // Переходим к игре
      router.push(`/game?eventId=${game.eventId}&tableId=${game.tableId}&gameId=${game.gameId}`)
  }

  // Отслеживаем изменения judgeId
  watch(() => props.judgeId, () => {
      loadActiveGames()
  }, { immediate: true })

  // Загружаем при монтировании компонента
  onMounted(() => {
      loadActiveGames()
  })
</script>

<style scoped>
  .active-games {
      min-height: 200px;
  }

  .no-judge,
  .no-games,
  .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
  }

  .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
  }

  .game-card {
      transition: all 0.3s ease;
  }

  .game-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .game-name {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
  }

  .game-content {
      padding: 8px 0;
  }

  .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
  }

  .info-row:last-child {
      margin-bottom: 0;
  }

  .info-label {
      font-size: 14px;
      color: #606266;
      font-weight: 500;
  }

  .info-value {
      font-size: 14px;
      color: #303133;
      text-align: right;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
  }

  @media (max-width: 768px) {
      .games-grid {
	  grid-template-columns: 1fr;
      }
      
      .info-value {
	  max-width: 120px;
      }
  }
</style>
