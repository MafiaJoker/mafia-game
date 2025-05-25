<template>
  <div class="app-header-content">
    <div class="logo-section">
      <router-link to="/" class="logo-link">
        <h2 class="app-title">
          <el-icon><Trophy /></el-icon>
          Мафия Helper
        </h2>
      </router-link>
    </div>

    <div class="nav-section">
      <el-menu
        :default-active="activeIndex"
        mode="horizontal"
        @select="handleSelect"
        class="app-menu"
	>
        <el-menu-item index="/">
          <el-icon><Calendar /></el-icon>
          <span>Мероприятия</span>
        </el-menu-item>
        
        <el-menu-item v-if="currentGameLink" :index="currentGameLink">
          <el-icon><VideoPlay /></el-icon>
          <span>Текущая игра</span>
        </el-menu-item>
      </el-menu>
    </div>

    <div class="user-section">
      <JudgeSelector />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import JudgeSelector from './JudgeSelector.vue'
  import { 
      Trophy, 
      Calendar, 
      VideoPlay 
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()

  const activeIndex = computed(() => route.path)

  // Ссылка на текущую игру (если есть)
  const currentGameLink = computed(() => {
      const gameInfo = localStorage.getItem('currentGame')
      if (gameInfo) {
	  const { eventId, tableId, gameId } = JSON.parse(gameInfo)
	  return `/game?eventId=${eventId}&tableId=${tableId}&gameId=${gameId}`
      }
      return null
  })

  const handleSelect = (index) => {
      router.push(index)
  }
</script>

<style scoped>
  .app-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 24px;
  }

  .logo-section {
      flex-shrink: 0;
  }

  .logo-link {
      text-decoration: none;
      color: inherit;
  }

  .app-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #303133;
      font-weight: 600;
  }

  .nav-section {
      flex: 1;
      display: flex;
      justify-content: center;
  }

  .app-menu {
      border-bottom: none;
  }

  .user-section {
      flex-shrink: 0;
      min-width: 200px;
      display: flex;
      justify-content: flex-end;
  }

  @media (max-width: 768px) {
      .app-header-content {
	  padding: 0 16px;
      }
      
      .nav-section {
	  display: none;
      }
      
      .user-section {
	  min-width: auto;
      }
  }
</style>
