<template>
  <div class="game-timer">
    <div class="timer-display">
      <span class="time-text">{{ formattedTime }}</span>
    </div>
    
    <div class="timer-controls">
      <el-button-group>
        <el-tooltip content="Старт">
          <el-button 
            :icon="VideoPlay"
            :type="isRunning ? 'success' : 'primary'"
            size="small"
            @click="startTimer"
            :disabled="isRunning"
            />
        </el-tooltip>
        
        <el-tooltip content="Пауза">
          <el-button 
            :icon="VideoPause"
            type="warning"
            size="small"
            @click="stopTimer"
            :disabled="!isRunning"
            />
        </el-tooltip>
        
        <el-tooltip content="Сброс">
          <el-button 
            :icon="RefreshRight"
            type="info"
            size="small"
            @click="resetTimer"
            />
        </el-tooltip>
      </el-button-group>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onUnmounted } from 'vue'
  import { 
      VideoPlay, 
      VideoPause, 
      RefreshRight 
  } from '@element-plus/icons-vue'

  const seconds = ref(0)
  const isRunning = ref(false)
  let interval = null

  const formattedTime = computed(() => {
      const mins = Math.floor(seconds.value / 60)
      const secs = seconds.value % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const startTimer = () => {
      if (isRunning.value) return
      
      isRunning.value = true
      interval = setInterval(() => {
	  seconds.value++
      }, 1000)
  }

  const stopTimer = () => {
      if (!isRunning.value) return
      
      isRunning.value = false
      if (interval) {
	  clearInterval(interval)
	  interval = null
      }
  }

  const resetTimer = () => {
      stopTimer()
      seconds.value = 0
  }

  onUnmounted(() => {
      if (interval) {
	  clearInterval(interval)
      }
  })
</script>

<style scoped>
  .game-timer {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .timer-display {
      background-color: #303133;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
  }

  .time-text {
      font-size: 20px;
      font-weight: bold;
  }

  .timer-controls {
      display: flex;
  }
</style>
