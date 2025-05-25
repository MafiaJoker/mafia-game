<template>
  <div class="game-view">
    <el-container>
      <!-- Заголовок игры -->
      <el-header>
        <div class="game-header">
          <div class="round-info">
            <h2>Круг: {{ gameStore.gameState.round }}</h2>
          </div>
          
          <div class="timer-section">
            <GameTimer />
          </div>
          
          <div class="game-actions">
            <GameControls />
          </div>
        </div>
      </el-header>

      <el-main>
        <!-- Статус игры -->
        <GameStatusCard />

        <!-- Секция голосования -->
        <VotingSection v-if="showVotingSection" />

        <!-- Секция ночных действий -->
        <NightActionsSection v-if="showNightSection" />

        <!-- Секция лучшего хода -->
        <BestMoveSection v-if="showBestMoveSection" />

        <!-- Список игроков -->
        <PlayersTable />
      </el-main>
    </el-container>

    <!-- Модальные окна -->
    <PlayerEliminationDialog />
    <GameCancellationDialog />
    <ScoreManagerDialog />
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useGameStore } from '@/stores/game'
  import { GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'
  import GameTimer from '@/components/game/GameTimer.vue'
  import GameControls from '@/components/game/GameControls.vue'
  import GameStatusCard from '@/components/game/GameStatusCard.vue'
  import VotingSection from '@/components/game/VotingSection.vue'
  import NightActionsSection from '@/components/game/NightActionsSection.vue'
  import BestMoveSection from '@/components/game/BestMoveSection.vue'
  import PlayersTable from '@/components/game/PlayersTable.vue'
  import PlayerEliminationDialog from '@/components/game/dialogs/PlayerEliminationDialog.vue'
  import GameCancellationDialog from '@/components/game/dialogs/GameCancellationDialog.vue'
  import ScoreManagerDialog from '@/components/game/dialogs/ScoreManagerDialog.vue'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      eventId: Number,
      tableId: Number,
      gameId: Number
  })

  const route = useRoute()
  const gameStore = useGameStore()

  const showVotingSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.gameSubstatus === GAME_SUBSTATUS.VOTING
  })

  const showNightSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.gameSubstatus === GAME_SUBSTATUS.NIGHT
  })

  const showBestMoveSection = computed(() => {
      return gameStore.gameState.gameStatus === GAME_STATUSES.IN_PROGRESS &&
          gameStore.gameState.showBestMove
  })

  let autoSaveInterval = null

  onMounted(async () => {
      try {
	  await gameStore.initGame(props.eventId, props.tableId, props.gameId)
	  
	  // Автосохранение каждые 30 секунд
	  autoSaveInterval = setInterval(() => {
	      gameStore.saveGameState()
	  }, 30000)
	  
      } catch (error) {
	  console.error('Ошибка инициализации игры:', error)
	  ElMessage.error('Не удалось загрузить игру')
      }
  })

  onUnmounted(() => {
      if (autoSaveInterval) {
	  clearInterval(autoSaveInterval)
      }
      
      // Сохраняем состояние при выходе
      gameStore.saveGameState()
  })
</script>

<style scoped>
  .game-view {
      min-height: 100vh;
      background-color: #f5f7fa;
  }

  .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 0 16px;
  }

  .round-info h2 {
      margin: 0;
      color: #303133;
  }

  .timer-section {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .game-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
  }

  @media (max-width: 768px) {
      .game-header {
	  flex-direction: column;
	  gap: 12px;
	  padding: 12px 16px;
      }
      
      .game-actions {
	  width: 100%;
	  justify-content: center;
      }
  }
</style>
