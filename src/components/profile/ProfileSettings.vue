<template>
  <div class="profile-settings">
    <div class="settings-header">
      <h4 class="settings-title">
        <el-icon><Setting /></el-icon>
        Настройки профиля
      </h4>
    </div>

    <div class="settings-content">
      <el-form :model="localSettings" label-width="140px" class="settings-form">
        
        <!-- Язык интерфейса -->
        <el-form-item label="Язык интерфейса">
          <el-select 
            v-model="localSettings.language" 
            placeholder="Выберите язык"
            @change="updateSetting('language', $event)"
          >
            <el-option
              v-for="lang in languages"
              :key="lang.value"
              :label="lang.label"
              :value="lang.value"
            >
              <div class="language-option">
                <span class="language-flag">{{ lang.flag }}</span>
                <span>{{ lang.label }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- Уведомления -->
        <el-form-item label="Уведомления">
          <div class="switch-group">
            <el-switch
              v-model="localSettings.notifications"
              active-text="Включены"
              inactive-text="Отключены"
              @change="updateSetting('notifications', $event)"
            />
            <el-text type="info" size="small">
              Получать уведомления о новых турнирах и играх
            </el-text>
          </div>
        </el-form-item>

        <!-- Звуковые эффекты -->
        <el-form-item label="Звуковые эффекты">
          <div class="switch-group">
            <el-switch
              v-model="localSettings.sound"
              active-text="Включены"
              inactive-text="Отключены"
              @change="updateSetting('sound', $event)"
            />
            <el-text type="info" size="small">
              Воспроизводить звуки для игровых событий
            </el-text>
          </div>
        </el-form-item>

        <!-- Тема оформления -->
        <el-form-item label="Тема оформления">
          <el-radio-group 
            v-model="localSettings.theme" 
            @change="updateSetting('theme', $event)"
          >
            <el-radio value="light" size="large">
              <div class="theme-option">
                <el-icon><Sunny /></el-icon>
                <span>Светлая</span>
              </div>
            </el-radio>
            <el-radio value="dark" size="large">
              <div class="theme-option">
                <el-icon><Moon /></el-icon>
                <span>Темная</span>
              </div>
            </el-radio>
            <el-radio value="auto" size="large">
              <div class="theme-option">
                <el-icon><Monitor /></el-icon>
                <span>Автоматически</span>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>

      </el-form>

      <!-- Дополнительные настройки -->
      <div class="additional-settings">
        <el-divider content-position="left">
          <span class="divider-text">Дополнительно</span>
        </el-divider>

        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h5>Экспорт данных</h5>
              <p>Скачать все данные профиля в формате JSON</p>
            </div>
            <el-button type="primary" plain :icon="Download" @click="exportData">
              Экспорт
            </el-button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h5>Конфиденциальность</h5>
              <p>Настройки приватности и видимости профиля</p>
            </div>
            <el-button type="info" plain :icon="Lock" @click="privacySettings">
              Настроить
            </el-button>
          </div>

          <div class="setting-item danger">
            <div class="setting-info">
              <h5>Удалить аккаунт</h5>
              <p>Безвозвратно удалить профиль и все данные</p>
            </div>
            <el-button type="danger" plain :icon="Delete" @click="deleteAccount">
              Удалить
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
    Setting, 
    Sunny, 
    Moon, 
    Monitor, 
    Download, 
    Lock, 
    Delete 
  } from '@element-plus/icons-vue'

  const props = defineProps({
    settings: {
      type: Object,
      required: true
    }
  })

  const emit = defineEmits(['update'])

  // Локальная копия настроек для работы с формой
  const localSettings = ref({ ...props.settings })

  // Синхронизация с родительскими настройками
  watch(() => props.settings, (newSettings) => {
    localSettings.value = { ...newSettings }
  }, { deep: true })

  // Доступные языки
  const languages = [
    { value: 'ru', label: 'Русский', flag: '🇷🇺' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'arm', label: 'Հայերեն', flag: '🇦🇲' }
  ]

  // Обновление отдельной настройки
  const updateSetting = (key, value) => {
    const updatedSettings = { ...localSettings.value, [key]: value }
    localSettings.value = updatedSettings
    emit('update', { [key]: value })
    
    ElMessage.success('Настройка сохранена')
  }

  // Дополнительные действия
  const exportData = () => {
    ElMessage.info('Экспорт данных будет реализован позже')
  }

  const privacySettings = () => {
    ElMessage.info('Настройки конфиденциальности будут реализованы позже')
  }

  const deleteAccount = async () => {
    try {
      await ElMessageBox.confirm(
        'Это действие безвозвратно удалит ваш аккаунт и все данные. Вы уверены?',
        'Подтверждение удаления',
        {
          confirmButtonText: 'Удалить',
          cancelButtonText: 'Отмена',
          type: 'error',
          confirmButtonClass: 'el-button--danger'
        }
      )
      
      ElMessage.info('Удаление аккаунта будет реализовано позже')
    } catch {
      // Пользователь отменил
    }
  }
</script>

<style scoped>
  .profile-settings {
    height: 100%;
  }

  .settings-header {
    margin-bottom: 20px;
  }

  .settings-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .settings-content {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
  }

  .settings-form {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .language-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .language-flag {
    font-size: 16px;
  }

  .switch-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .additional-settings {
    background: white;
    border-radius: 8px;
    padding: 20px;
  }

  .divider-text {
    color: #909399;
    font-size: 14px;
    font-weight: 500;
  }

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .setting-item:hover {
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }

  .setting-item.danger {
    border-color: #f89898;
    background: #fef0f0;
  }

  .setting-item.danger:hover {
    border-color: #f56c6c;
    box-shadow: 0 2px 8px rgba(245, 108, 108, 0.1);
  }

  .setting-info {
    flex: 1;
  }

  .setting-info h5 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .setting-info p {
    margin: 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }

  .setting-item.danger .setting-info h5 {
    color: #f56c6c;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .settings-content {
      padding: 16px;
    }

    .settings-form {
      padding: 16px;
    }

    .additional-settings {
      padding: 16px;
    }

    .setting-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
    }

    .setting-item .el-button {
      align-self: stretch;
    }
  }

  @media (max-width: 480px) {
    .settings-form :deep(.el-form-item__label) {
      width: 100% !important;
      margin-bottom: 8px;
    }

    .settings-form :deep(.el-form-item__content) {
      margin-left: 0 !important;
    }
  }
</style>