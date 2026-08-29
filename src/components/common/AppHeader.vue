<template>
  <div class="app-header-content" :class="{ 'is-mobile': isMobile, 'is-tablet': isTablet }">
    <!-- Телефон: меню прячется в выдвижную панель, в шапке остаётся кнопка -->
    <el-button
      v-if="isMobile"
      class="menu-toggle"
      data-testid="mobile-menu-button"
      text
      :icon="Menu"
      aria-label="Открыть меню"
      @click="drawerVisible = true"
    />

    <div class="logo-section">
      <router-link to="/" class="logo-link" data-testid="app-logo">
        <h2 class="app-title">
          <el-icon><Trophy /></el-icon>
          <span class="app-title-text">Мафия Helper</span>
        </h2>
      </router-link>
    </div>

    <div v-if="!isMobile" class="nav-section" data-testid="main-navigation">
      <el-menu
        :default-active="activeIndex"
        mode="horizontal"
        @select="handleSelect"
        class="app-menu"
        :class="{ 'app-menu--compact': isTablet }"
        data-testid="desktop-menu"
        :ellipsis="false"
	>
        <el-menu-item
          v-for="item in menuItems"
          :key="item.index"
          :index="item.index"
          :title="item.label"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
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
          <el-icon class="user-caret"><ArrowDown /></el-icon>
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

    <!-- Выдвижное меню для телефона -->
    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      size="280px"
      :with-header="false"
      class="app-nav-drawer"
      append-to-body
    >
      <div class="drawer-user" @click="goToProfile">
        <el-avatar :size="44" :src="authStore.user?.photo_url">
          {{ userInitials }}
        </el-avatar>
        <div class="drawer-user-text">
          <div class="drawer-user-name">{{ authStore.user?.nickname || 'Гость' }}</div>
          <div class="drawer-user-hint">Открыть профиль</div>
        </div>
      </div>

      <el-menu
        :default-active="activeIndex"
        class="drawer-menu"
        @select="handleDrawerSelect"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.index"
          :index="item.index"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="drawer-footer">
        <el-button class="drawer-logout" :icon="SwitchButton" @click="handleUserCommand('logout')">
          Выйти
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { useBreakpoints } from '@/composables/useBreakpoints'
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
      Medal,
      Menu
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const { isMobile, isTablet } = useBreakpoints()

  const drawerVisible = ref(false)

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

  // Один список пунктов на горизонтальное меню и на выдвижную панель
  const menuItems = computed(() => [
      { index: '/ratings', label: 'Рейтинг', icon: Medal, visible: showRatings.value },
      { index: '/', label: 'Мероприятия', icon: Calendar, visible: showEvents.value },
      { index: '/event-types', label: 'Категории', icon: Collection, visible: showEventType.value },
      { index: '/users', label: 'Пользователи', icon: UserFilled, visible: showUsers.value },
      { index: '/tariffs', label: 'Тарифы', icon: CreditCard, visible: showTariffs.value }
  ].filter(item => item.visible))

  const handleSelect = (index) => {
      router.push(index)
  }

  const handleDrawerSelect = (index) => {
      drawerVisible.value = false
      router.push(index)
  }

  const goToProfile = () => {
      drawerVisible.value = false
      router.push('/profile')
  }

  // Переход по ссылке из шапки или «Назад» в браузере: панель закрывается
  watch(() => route.path, () => {
      drawerVisible.value = false
  })

  const handleUserCommand = async (command) => {
      switch (command) {
          case 'profile':
              router.push('/profile')
              break
              
          case 'settings':
              ElMessage.info('Настройки будут реализованы позже')
              break
              
          case 'logout':
              drawerVisible.value = false
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

  .menu-toggle {
      display: none;
  }

  /* Узкий компьютер и альбомный планшет: пять пунктов с подписями и имя
     пользователя в 1024px не помещаются - меню плотнее, имя уходит */
  @media (min-width: 1024px) and (max-width: 1199px) {
      .app-header-content {
          padding: 0 16px;
      }

      .app-menu :deep(.el-menu-item) {
          padding: 0 10px;
      }

      .user-name {
          display: none;
      }
  }

  /* Планшет: меню остаётся в шапке, но плотнее, имя пользователя уходит */
  @media (min-width: 768px) and (max-width: 1023px) {
      .app-header-content {
          padding: 0 16px;
          gap: 12px;
      }

      .app-menu--compact :deep(.el-menu-item) {
          padding: 0 10px;
      }

      .user-name {
          display: none;
      }

      .user-info {
          padding: 8px;
      }
  }

  /* Планшет в портрете: пять пунктов с подписями в 768px не влезают,
     остаются иконки, подпись - во всплывающей подсказке (title) */
  @media (min-width: 768px) and (max-width: 899px) {
      .app-menu--compact :deep(.el-menu-item span) {
          display: none;
      }

      .app-menu--compact :deep(.el-menu-item .el-icon) {
          margin-right: 0;
          font-size: 20px;
      }

      .app-menu--compact :deep(.el-menu-item) {
          padding: 0 12px;
      }
  }

  /* Телефон: кнопка меню, логотип и аватар в одну строку высотой 56px */
  @media (max-width: 767px) {
      .app-header-content {
          height: 56px;
          padding: 0 8px 0 4px;
          gap: 4px;
      }

      .menu-toggle {
          display: inline-flex;
          width: 44px;
          height: 44px;
          padding: 0;
          font-size: 22px;
          color: #303133;
      }

      .logo-section {
          flex: 1;
          min-width: 0;
      }

      .app-title {
          font-size: 18px;
      }

      .app-title-text {
          overflow: hidden;
          text-overflow: ellipsis;
      }

      .user-name,
      .user-caret {
          display: none;
      }

      .user-info {
          padding: 6px;
      }
  }

  /* Содержимое выдвижной панели */
  .drawer-user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 4px 16px;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;
  }

  .drawer-user-text {
      min-width: 0;
  }

  .drawer-user-name {
      font-weight: 600;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
  }

  .drawer-user-hint {
      font-size: 12px;
      color: #909399;
  }

  .drawer-menu {
      border-right: none;
      margin: 8px -4px 0;
  }

  .drawer-menu :deep(.el-menu-item) {
      height: 48px;
      line-height: 48px;
      border-radius: 6px;
  }

  .drawer-footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
  }

  .drawer-logout {
      width: 100%;
  }
</style>

<style>
  /* Панель добавляется в body, поэтому стили ей нужны глобальные */
  .app-nav-drawer .el-drawer__body {
      display: flex;
      flex-direction: column;
      padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  }
</style>
