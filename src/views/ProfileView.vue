<template>
  <div class="profile-view">
    <div class="profile-container">
      <el-alert
        v-if="!user"
        title="Профиль недоступен"
        description="Не удалось получить данные пользователя. Обновите страницу"
        type="warning"
        :closable="false"
        show-icon
      />

      <template v-else>
        <!-- Кто я: только то, что действительно приходит с сервера -->
        <el-card class="profile-card profile-summary" shadow="never">
          <div class="summary-content">
            <el-avatar :size="72" :src="primaryAvatar" class="summary-avatar">
              {{ userInitials }}
            </el-avatar>
            <div class="summary-details">
              <h1 class="summary-nickname">{{ user.nickname || 'Без никнейма' }}</h1>
              <div v-if="user.roles?.length" class="summary-roles">
                <el-tag
                  v-for="role in user.roles"
                  :key="role"
                  :type="getUserRoleType(role)"
                  size="small"
                  effect="light"
                >
                  {{ getUserRoleLabel(role) }}
                </el-tag>
              </div>
              <div v-if="user.telegram?.id" class="summary-telegram">
                Telegram ID: {{ user.telegram.id }}
              </div>
            </div>
          </div>
        </el-card>

        <!-- Никнейм -->
        <el-card class="profile-card" shadow="never">
          <template #header>
            <span class="card-title">Никнейм</span>
          </template>

          <el-form
            :model="nicknameForm"
            label-position="top"
            class="nickname-form"
            @submit.prevent="saveNickname"
          >
            <el-form-item
              label="Как вас видят другие игроки"
              :error="nicknameError"
            >
              <div class="nickname-row">
                <el-input
                  v-model="nicknameForm.nickname"
                  placeholder="Введите никнейм"
                  maxlength="64"
                  show-word-limit
                  data-testid="profile-nickname-input"
                  @input="nicknameError = ''"
                />
                <el-button
                  type="primary"
                  :loading="savingNickname"
                  :disabled="!nicknameChanged"
                  data-testid="profile-nickname-save"
                  @click="saveNickname"
                >
                  Сохранить
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Игровые аватарки -->
        <el-card class="profile-card" shadow="never">
          <UserAvatarsEditor
            target="me"
            :avatars="user.avatars || []"
            @update:avatars="authStore.setAvatars($event)"
          />
        </el-card>

        <!-- Настройка приходит с сервера только тем ролям, кому доступна -->
        <el-card v-if="extendedDataSetting" class="profile-card" shadow="never">
          <template #header>
            <span class="card-title">Настройки</span>
          </template>

          <div class="setting-row">
            <el-switch
              v-model="extendedDataValue"
              :loading="savingSettings"
              data-testid="profile-extended-data-switch"
              @change="saveExtendedData"
            />
            <div class="setting-text">
              <div class="setting-label">{{ extendedDataSetting.description }}</div>
              <div class="setting-hint">
                Флаг сохраняется на сервере, но интерфейс его пока никак не использует
              </div>
            </div>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useAuthStore } from '@/stores/auth'
  import UserAvatarsEditor from '@/components/users/UserAvatarsEditor.vue'
  import { pickPrimaryAvatar } from '@/utils/avatars'
  import { getUserRoleLabel, getUserRoleType } from '@/utils/userRoles'

  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const primaryAvatar = computed(() => pickPrimaryAvatar(user.value?.avatars))
  const extendedDataSetting = computed(() => user.value?.settings?.gather_extended_data || null)

  const userInitials = computed(() => (
    user.value?.nickname?.substring(0, 2).toUpperCase() || '?'
  ))

  const nicknameForm = ref({ nickname: user.value?.nickname || '' })
  const nicknameError = ref('')
  const savingNickname = ref(false)

  const extendedDataValue = ref(!!extendedDataSetting.value?.value)
  const savingSettings = ref(false)

  const nicknameChanged = computed(() => (
    nicknameForm.value.nickname.trim() !== (user.value?.nickname || '')
  ))

  // Стор обновился (в том числе после сохранения - сервер чистит ник) -
  // подтягиваем поля, чтобы в них лежало ровно то, что записано
  watch(() => user.value?.nickname, (nickname) => {
    nicknameForm.value.nickname = nickname || ''
  })

  watch(() => extendedDataSetting.value?.value, (value) => {
    extendedDataValue.value = !!value
  })

  const saveNickname = async () => {
    const nickname = nicknameForm.value.nickname.trim()
    if (!nickname) {
      nicknameError.value = 'Никнейм не может быть пустым'
      return
    }

    savingNickname.value = true
    try {
      const result = await authStore.updateProfile({ nickname })
      if (result.success) {
        ElMessage.success('Никнейм обновлен')
      } else {
        nicknameError.value = result.error || 'Не удалось сохранить никнейм'
        ElMessage.error(nicknameError.value)
      }
    } finally {
      savingNickname.value = false
    }
  }

  const saveExtendedData = async (value) => {
    savingSettings.value = true
    try {
      const result = await authStore.updateProfile({
        settings: { gather_extended_data: value }
      })
      if (result.success) {
        ElMessage.success('Настройка сохранена')
      } else {
        // Сервер настройку не принял - возвращаем переключатель назад
        extendedDataValue.value = !value
        ElMessage.error(
          result.status === 403
            ? 'Эта настройка недоступна для вашей роли'
            : result.error || 'Не удалось сохранить настройку'
        )
      }
    } finally {
      savingSettings.value = false
    }
  }
</script>

<style scoped>
  .profile-view {
    min-height: 100vh;
    background-color: #f5f7fa;
    padding: 20px;
  }

  .profile-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .profile-card {
    border-radius: 8px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .summary-content {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .summary-avatar {
    flex-shrink: 0;
    background-color: #409eff;
    font-size: 22px;
  }

  .summary-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .summary-nickname {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
    word-break: break-word;
  }

  .summary-roles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .summary-telegram {
    font-size: 13px;
    color: #909399;
  }

  .nickname-form {
    margin-bottom: -18px;
  }

  .nickname-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }

  .nickname-row .el-input {
    flex: 1;
    min-width: 0;
  }

  .setting-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-label {
    font-size: 14px;
    color: #303133;
  }

  .setting-hint {
    font-size: 12px;
    color: #909399;
  }

  /* Планшет и телефон */
  @media (max-width: 1023px) {
    .profile-view {
      min-height: auto;
      padding: 12px;
    }
  }

  @media (max-width: 767px) {
    .profile-view {
      padding: 8px;
    }

    .summary-content {
      gap: 14px;
    }

    .summary-nickname {
      font-size: 18px;
    }

    /* Кнопка под полем: рядом остается 5 символов ввода */
    .nickname-row {
      flex-direction: column;
    }

    .nickname-row .el-button {
      width: 100%;
      min-height: 44px;
    }
  }
</style>
