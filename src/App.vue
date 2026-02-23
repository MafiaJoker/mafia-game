<template>
  <div id="app">
    <!-- Страницы авторизации без контейнера -->
    <template v-if="isAuthPage">
      <router-view />
    </template>
    
    <!-- Остальные страницы с контейнером -->
    <template v-else>
      <el-container class="app-container">
        <el-header v-if="showHeader" class="app-header">
          <AppHeader />
        </el-header>

        <el-main class="app-main">
          <router-view />
        </el-main>
        
        <AppFooter v-if="showFooter" />
      </el-container>
    </template>

    <!-- Глобальные уведомления -->
    <div id="toast-container" class="toast-container"></div>

  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { apiService } from '@/services/api.js'
  import AppHeader from '@/components/common/AppHeader.vue'
  import AppFooter from '@/components/common/AppFooter.vue'


  const route = useRoute()

  // Определяем страницы авторизации и страницу 404
  const isAuthPage = computed(() => {
      return route.name === 'Login' || route.name === 'Register' || route.name === 'NotFound' || route.name === 'GameDies'
  })

  // Скрываем заголовок на страницах авторизации и игры
  const showHeader = computed(() => {
      // Не показываем заголовок на страницах авторизации
      if (isAuthPage.value) return false

      // Не показываем заголовок на странице игры для экономии места
      if (route.name === 'Game') return false

      return true
  })

  // Скрываем футер на странице игры для экономии места
  const showFooter = computed(() => {
      if (route.name === 'Game') return false
      return true
  })
</script>

<style>
  /* Глобальные стили */
  * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
  }

  html, body {
      height: 100%;
      font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
		   'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  }

  #app {
      height: 100vh;
      background-color: #f5f7fa;
  }

  .app-container {
      height: 100%;
  }

  .app-header {
      background-color: #fff;
      border-bottom: 1px solid #e4e7ed;
      padding: 0;
  }

  .app-main {
      padding: 0;
      overflow-y: auto;
  }

  /* Toast контейнер */
  .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
  }

  /* Кастомные стили для игры */
  .game-table-row-silent {
      background-color: #f56c6c !important;
      color: white !important;
  }

  .game-table-row-dead {
      background-color: #909399 !important;
      color: white !important;
  }

  .game-table-row-eliminated {
      background-color: #e6a23c !important;
      color: white !important;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
      .app-main {
	  padding: 8px;
      }
  }
</style>
