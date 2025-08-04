<template>
  <div class="night-section mb-4">
      <!-- Стрельба мафии -->
      <div class="action-group mb-3">
        <div class="action-row">
          <div class="action-icon">
            <MafiaIcon color="#000000" />
          </div>
          
          <div class="action-content">
            <div v-if="!hasMafiaAlive" class="no-players">
              <el-alert 
                title="Нет живых игроков команды мафии"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else class="targets-buttons">
              <el-button-group>
                <el-button 
                  v-for="player in aliveTargets"
                  :key="`mafia-${player.id}`"
                  :type="getMafiaTargetType(player.id)"
                  :class="{ 'kill-target': pressingMafiaTargetId === player.id }"
                  @click="selectMafiaTarget(player.id)"
                  @mousedown="startPressingMafiaTarget(player.id)"
                  @mouseup="stopPressingMafiaTarget"
                  @mouseleave="stopPressingMafiaTarget"
                  @touchstart="startPressingMafiaTarget(player.id)"
                  @touchend="stopPressingMafiaTarget"
                  >
                  {{ player.id }}
                </el-button>
                <el-button 
                  :type="getMafiaTargetType(0)"
                  :class="{ 'miss-target': pressingMafiaTargetId === 0 }"
                  @click="selectMafiaTarget(0)"
                  @mousedown="startPressingMafiaTarget(0)"
                  @mouseup="stopPressingMafiaTarget"
                  @mouseleave="stopPressingMafiaTarget"
                  @touchstart="startPressingMafiaTarget(0)"
                  @touchend="stopPressingMafiaTarget"
                  >
                  Промах
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
      </div>

      <!-- Проверка дона -->
      <div class="action-group mb-3">
        <div class="action-row">
          <div class="action-icon">
            <DonIcon color="#000000" />
          </div>
          
          <div class="action-content">
            <div v-if="!hasDonAlive" class="no-players">
              <el-alert 
                title="Дон мертв или отсутствует"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else>
              <div class="targets-buttons mb-2">
                <el-button-group>
                  <el-button 
                    v-for="player in aliveTargets"
                    :key="`don-${player.id}`"
                    :type="getDonTargetType(player.id)"
                    :class="getDonTargetClass(player.id)"
                    @click="selectDonTarget(player.id)"
                    @mousedown="startPressingDonTarget(player.id)"
                    @mouseup="stopPressingDonTarget"
                    @mouseleave="stopPressingDonTarget"
                    @touchstart="startPressingDonTarget(player.id)"
                    @touchend="stopPressingDonTarget"
		    >
                    {{ player.id }}
                  </el-button>
                </el-button-group>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <!-- Проверка шерифа -->
      <div class="action-group">
        <div class="action-row">
          <div class="action-icon">
            <SheriffIcon color="#f56c6c" />
          </div>
          
          <div class="action-content">
            <div v-if="!hasSheriffAlive" class="no-players">
              <el-alert 
                title="Шериф мертв или отсутствует"
                type="info"
                :closable="false"
                />
            </div>
            
            <div v-else>
              <div class="targets-buttons mb-2">
                <el-button-group>
                  <el-button 
                    v-for="player in aliveTargets"
                    :key="`sheriff-${player.id}`"
                    :type="getSheriffTargetType(player.id)"
                    :class="getSheriffTargetClass(player.id)"
                    @click="selectSheriffTarget(player.id)"
                    @mousedown="startPressingSheriffTarget(player.id)"
                    @mouseup="stopPressingSheriffTarget"
                    @mouseleave="stopPressingSheriffTarget"
                    @touchstart="startPressingSheriffTarget(player.id)"
                    @touchend="stopPressingSheriffTarget"
		    >
                    {{ player.id }}
                  </el-button>
                </el-button-group>
              </div>
              
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useGameStore } from '@/stores/game'
  import { useNightActionsStore } from '@/stores/nightActions'
  import { PLAYER_ROLES } from '@/utils/constants'
  import { Moon } from '@element-plus/icons-vue'
  import MafiaIcon from './icons/MafiaIcon.vue'
  import DonIcon from './icons/DonIcon.vue'
  import SheriffIcon from './icons/SheriffIcon.vue'

  const gameStore = useGameStore()
  const nightActionsStore = useNightActionsStore()

  // Состояния для отслеживания нажатий
  const pressingMafiaTargetId = ref(null)
  const pressingDonTargetId = ref(null)
  const pressingSheriffTargetId = ref(null)


  const aliveTargets = computed(() => {
      return gameStore.gameState.players.filter(p => p.isAlive && !p.isEliminated)
  })

  const hasMafiaAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  (p.originalRole === PLAYER_ROLES.MAFIA || p.originalRole === PLAYER_ROLES.DON) && 
	      p.isAlive && !p.isEliminated
      )
  })

  const hasDonAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  p.originalRole === PLAYER_ROLES.DON && p.isAlive && !p.isEliminated
      )
  })

  const hasSheriffAlive = computed(() => {
      return gameStore.gameState.players.some(p => 
	  p.originalRole === PLAYER_ROLES.SHERIFF && p.isAlive && !p.isEliminated
      )
  })

  const getMafiaTargetType = (playerId) => {
      // Не показываем стандартные типы кнопок - только через наши кастомные классы при нажатии
      return 'info'
  }

  const getDonTargetType = (playerId) => {
      // Не показываем стандартные типы кнопок - только через наши кастомные классы при нажатии
      return 'info'
  }

  const getSheriffTargetType = (playerId) => {
      // Не показываем стандартные типы кнопок - только через наши кастомные классы при нажатии
      return 'info'
  }

  const selectMafiaTarget = (playerId) => {
      gameStore.gameState.mafiaTarget = playerId
  }

  const selectDonTarget = (playerId) => {
      gameStore.gameState.donTarget = playerId
  }

  const selectSheriffTarget = (playerId) => {
      gameStore.gameState.sheriffTarget = playerId
  }

  // Методы для обработки нажатий мафии
  const startPressingMafiaTarget = (playerId) => {
      pressingMafiaTargetId.value = playerId
  }

  const stopPressingMafiaTarget = () => {
      pressingMafiaTargetId.value = null
  }

  // Методы для обработки нажатий дона
  const startPressingDonTarget = (playerId) => {
      pressingDonTargetId.value = playerId
  }

  const stopPressingDonTarget = () => {
      pressingDonTargetId.value = null
  }

  // Методы для обработки нажатий шерифа
  const startPressingSheriffTarget = (playerId) => {
      pressingSheriffTargetId.value = playerId
  }

  const stopPressingSheriffTarget = () => {
      pressingSheriffTargetId.value = null
  }

  // Получение класса для кнопки дона с проверкой роли
  const getDonTargetClass = (playerId) => {
      if (pressingDonTargetId.value !== playerId) {
          return ''
      }
      
      const result = nightActionsStore.checkDon(playerId)
      if (!result) return ''
      
      return result.isSheriff ? 'don-check-sheriff' : 'don-check-not-sheriff'
  }

  // Получение класса для кнопки шерифа с проверкой роли
  const getSheriffTargetClass = (playerId) => {
      if (pressingSheriffTargetId.value !== playerId) {
          return ''
      }
      
      const result = nightActionsStore.checkSheriff(playerId)
      if (!result) return ''
      
      return result.isMafia ? 'sheriff-check-mafia' : 'sheriff-check-civilian'
  }
</script>

<style scoped>
  .night-section {
      border: 1px solid #409eff;
      border-radius: 4px;
      padding: 8px;
      background-color: #fafcff;
  }

  .action-group {
      padding: 4px 0;
  }

  .action-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
  }

  .action-icon {
      display: flex;
      align-items: center;
      color: #409eff;
      margin-top: 4px;
  }

  .action-content {
      flex: 1;
  }

  .no-players {
      padding: 8px 0;
  }

  .targets-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
  }

  .check-result {
      margin-top: 8px;
  }

  .mb-2 {
      margin-bottom: 8px;
  }

  .mb-3 {
      margin-bottom: 12px;
  }

  /* Стили для скрытой подсветки результатов */
  :deep(.kill-target) {
      background-color: #f56c6c !important;
      border-color: #f56c6c !important;
      color: white !important;
  }

  :deep(.miss-target) {
      background-color: #909399 !important;
      border-color: #909399 !important;
      color: white !important;
  }

  :deep(.don-check-sheriff) {
      background-color: #f56c6c !important;
      border-color: #f56c6c !important;
      color: white !important;
  }

  :deep(.don-check-not-sheriff) {
      background-color: #000000 !important;
      border-color: #000000 !important;
      color: white !important;
  }

  :deep(.sheriff-check-civilian) {
      background-color: #f56c6c !important;
      border-color: #f56c6c !important;
      color: white !important;
  }

  :deep(.sheriff-check-mafia) {
      background-color: #000000 !important;
      border-color: #000000 !important;
      color: white !important;
  }
</style>
