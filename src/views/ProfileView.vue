<template>
  <div class="profile-view">
    <div class="profile-container">
      <!-- Шапка профиля -->
      <ProfileHeader :user="authStore.user" />
      
      <!-- Основной контент -->
      <el-row :gutter="24" class="profile-content">
        <!-- Статистика -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <ProfileStats :stats="userStats" />
        </el-col>
        
        <!-- История и настройки -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <el-tabs v-model="activeTab" class="profile-tabs">
            <el-tab-pane label="История игр" name="history">
              <ProfileHistory :history="gameHistory" />
            </el-tab-pane>
            <el-tab-pane label="Настройки" name="settings">
              <ProfileSettings :settings="userSettings" @update="updateSettings" />
            </el-tab-pane>
          </el-tabs>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import ProfileHeader from '@/components/profile/ProfileHeader.vue'
  import ProfileStats from '@/components/profile/ProfileStats.vue'
  import ProfileHistory from '@/components/profile/ProfileHistory.vue'
  import ProfileSettings from '@/components/profile/ProfileSettings.vue'

  const authStore = useAuthStore()
  const activeTab = ref('history')

  // Мок-данные для статистики
  const userStats = computed(() => ({
    totalGames: 42,
    wins: 18,
    losses: 24,
    winRate: Math.round((18 / 42) * 100),
    tournaments: 8,
    bestRole: 'Шериф',
    rating: 1250
  }))

  // Мок-данные для истории игр
  const gameHistory = ref([
    {
      id: 1,
      date: '2024-01-15',
      tournament: 'Зимний турнир',
      role: 'Мирный житель',
      result: 'Победа',
      duration: '45 мин'
    },
    {
      id: 2,
      date: '2024-01-14',
      tournament: 'Зимний турнир',
      role: 'Мафия',
      result: 'Поражение',
      duration: '38 мин'
    },
    {
      id: 3,
      date: '2024-01-13',
      tournament: 'Дружеская игра',
      role: 'Шериф',
      result: 'Победа',
      duration: '52 мин'
    }
  ])

  // Настройки пользователя
  const userSettings = ref({
    language: 'ru',
    notifications: true,
    sound: true,
    theme: 'light'
  })

  // Обновление настроек
  const updateSettings = (newSettings) => {
    userSettings.value = { ...userSettings.value, ...newSettings }
    // Здесь можно добавить сохранение на сервер
    console.log('Settings updated:', userSettings.value)
  }
</script>

<style scoped>
  .profile-view {
    min-height: 100vh;
    background-color: #f5f7fa;
    padding: 20px;
  }

  .profile-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .profile-content {
    margin-top: 24px;
  }

  .profile-tabs {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .profile-tabs :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  .profile-tabs :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #e4e7ed;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .profile-view {
      padding: 10px;
    }
    
    .profile-content {
      margin-top: 16px;
    }
    
    .profile-tabs {
      padding: 16px;
    }
  }
</style>