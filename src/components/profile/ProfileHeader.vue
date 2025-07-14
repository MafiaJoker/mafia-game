<template>
  <div class="profile-header">
    <div class="header-content">
      <!-- Аватар и основная информация -->
      <div class="user-info">
        <el-avatar 
          :size="120" 
          :src="user?.photo_url"
          class="profile-avatar"
        >
          {{ userInitials }}
        </el-avatar>
        
        <div class="user-details">
          <h1 class="user-name">
            {{ fullName }}
          </h1>
          <p class="user-nickname">
            @{{ user?.nickname }}
          </p>
          <div class="user-badges">
            <el-tag type="primary" size="small">
              Активный игрок
            </el-tag>
          </div>
        </div>
      </div>

      <!-- Быстрые действия -->
      <div class="quick-actions">
        <el-button type="primary" :icon="Edit" @click="editProfile">
          Редактировать
        </el-button>
        <el-button :icon="Share" @click="shareProfile">
          Поделиться
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Trophy, Edit, Share } from '@element-plus/icons-vue'

  const props = defineProps({
    user: {
      type: Object,
      default: () => ({})
    }
  })

  // Полное имя пользователя
  const fullName = computed(() => {
    const first = props.user?.first_name || ''
    const last = props.user?.last_name || ''
    return `${first} ${last}`.trim() || props.user?.nickname || 'Пользователь'
  })

  // Инициалы для аватара
  const userInitials = computed(() => {
    const first = props.user?.first_name?.[0] || ''
    const last = props.user?.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  })

  // Действия
  const editProfile = () => {
    ElMessage.info('Редактирование профиля будет реализовано позже')
  }

  const shareProfile = () => {
    ElMessage.info('Функция "Поделиться" будет реализована позже')
  }
</script>

<style scoped>
  .profile-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    color: white;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 40px;
    position: relative;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .profile-avatar {
    border: 4px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .user-name {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .user-nickname {
    margin: 0;
    font-size: 18px;
    opacity: 0.9;
    font-weight: 400;
  }

  .user-badges {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .user-badges .el-tag {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
  }

  .quick-actions {
    display: flex;
    gap: 12px;
  }

  .quick-actions .el-button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
  }

  .quick-actions .el-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .quick-actions .el-button.is-type-primary {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 24px;
      padding: 24px;
      text-align: center;
    }

    .user-info {
      flex-direction: column;
      text-align: center;
      gap: 16px;
    }

    .user-name {
      font-size: 24px;
    }

    .quick-actions {
      width: 100%;
      justify-content: center;
    }

    .quick-actions .el-button {
      flex: 1;
      max-width: 150px;
    }
  }

  @media (max-width: 480px) {
    .profile-avatar {
      width: 80px !important;
      height: 80px !important;
    }

    .user-name {
      font-size: 20px;
    }

    .user-nickname {
      font-size: 16px;
    }
  }
</style>