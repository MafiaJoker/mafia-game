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
        :ellipsis="false"
	>
        <el-menu-item v-if="showRatings" index="/ratings">
          <el-icon><Medal /></el-icon>
          <span>Рейтинг</span>
        </el-menu-item>

        <el-menu-item v-if="showEvents" index="/">
          <el-icon><Calendar /></el-icon>
          <span>Мероприятия</span>
        </el-menu-item>

        <el-menu-item v-if="showEventType" index="/event-types">
          <el-icon><Collection /></el-icon>
          <span>Категории</span>
        </el-menu-item>

        <el-menu-item v-if="showUsers" index="/users">
          <el-icon><UserFilled /></el-icon>
          <span>Пользователи</span>
        </el-menu-item>

        <el-menu-item v-if="showTariffs" index="/tariffs">
          <el-icon><CreditCard /></el-icon>
          <span>Тарифы</span>
        </el-menu-item>
      </el-menu>
    </div>

    <div class="user-section">
      <el-dropdown @command="handleUserCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="authStore.user?.photo_url">
            {{ userInitials }}
          </el-avatar>
          <span class="user-name">{{ authStore.user?.nickname }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              Профиль
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              Настройки
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              Выйти
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
      Trophy,
      Calendar,
      Collection,
      User,
      UserFilled,
      Setting,
      SwitchButton,
      ArrowDown,
      CreditCard,
      Medal
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()


  const activeIndex = computed(() => route.path)

  // Инициалы пользователя для аватара
  const userInitials = computed(() => {
      const user = authStore.user
      if (!user) return '?'

      const first = user.first_name?.[0] || user.nickname?.[0] || ''
      const last = user.last_name?.[0] || ''
      return (first + last).toUpperCase() || '?'
  })

  // Проверка наличия роли у пользователя
  const hasRole = (role) => {
      return authStore.user?.roles?.includes(role) || false
  }

  // Рейтинг: для player, game_master, cashier, admin
  const showRatings = computed(() => {
      return hasRole('player') || hasRole('game_master') || hasRole('cashier') || hasRole('admin')
  })

  // Мероприятия: для game_master
  const showEvents = computed(() => {
      return hasRole('game_master')
  })

  // Категории: для game_master
  const showEventType = computed(() => {
      return hasRole('game_master')
  })

  // Пользователи: для admin
  const showUsers = computed(() => {
      return hasRole('admin')
  })

  // Тарифы: для cashier
  const showTariffs = computed(() => {
      return hasRole('cashier')
  })

  const handleSelect = (index) => {
      router.push(index)
  }

  const handleUserCommand = async (command) => {
      switch (command) {
          case 'profile':
              router.push('/profile')
              break
              
          case 'settings':
              ElMessage.info('Настройки будут реализованы позже')
              break
              
          case 'logout':
              try {
                  await ElMessageBox.confirm(
                      'Вы уверены, что хотите выйти из системы?',
                      'Подтверждение',
                      {
                          confirmButtonText: 'Выйти',
                          cancelButtonText: 'Отмена',
                          type: 'warning'
                      }
                  )
                  
                  await authStore.logout()
                  ElMessage.success('Вы вышли из системы')
              } catch (error) {
                  // Пользователь отменил действие
              }
              break
      }
  }
</script>

<style scoped>
  .app-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 24px;
      gap: 16px;
  }

  .logo-section {
      flex-shrink: 0;
      min-width: fit-content;
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
      white-space: nowrap;
  }

  .nav-section {
      flex: 1;
      display: flex;
      justify-content: center;
      min-width: 0;
      overflow: visible;
  }

  .app-menu {
      border-bottom: none;
      width: auto;
  }

  .app-menu :deep(.el-menu-item) {
      white-space: nowrap;
      padding: 0 12px;
  }

  .user-section {
      flex-shrink: 0;
      min-width: fit-content;
  }

  .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s;
  }

  .user-info:hover {
      background-color: #f5f7fa;
  }

  .user-name {
      font-weight: 500;
      color: #303133;
  }

  @media (max-width: 768px) {
      .app-header-content {
	  padding: 0 16px;
      }
      
      .nav-section {
	  display: none;
      }
      
      .user-name {
          display: none;
      }
  }
</style>
