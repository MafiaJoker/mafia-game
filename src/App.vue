<template>
  <div id="app">
    <!-- Глобальная навигация -->
    <el-container class="app-container">
      <el-header v-if="showHeader" class="app-header">
        <AppHeader />
      </el-header>
      
      <el-main class="app-main">
        <!-- Основной контент -->
        <router-view />
      </el-main>
    </el-container>

    <!-- Глобальные уведомления -->
    <div id="toast-container" class="toast-container"></div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import AppHeader from '@/components/common/AppHeader.vue'

  const route = useRoute()

  // Скрываем заголовок на странице игры для экономии места
  const showHeader = computed(() => {
      return route.name !== 'Game'
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
