<template>
  <div class="user-avatars-editor">
    <div class="avatars-header">
      <span class="avatars-title">Игровые аватарки</span>
      <span class="avatars-hint">Изменения применяются сразу, без кнопки «Сохранить»</span>
    </div>

    <div class="avatars-grid">
      <div
        v-for="role in AVATAR_ROLES"
        :key="role"
        class="avatar-slot"
        :data-testid="`avatar-slot-${role}`"
      >
        <div v-loading="pendingRole === role" class="avatar-preview">
          <img
            v-if="avatarMap[role] && !brokenRoles[role]"
            :src="avatarMap[role]"
            :alt="`Аватарка: ${AVATAR_ROLE_LABELS[role]}`"
            class="avatar-image"
            @error="brokenRoles[role] = true"
          >
          <div v-else class="avatar-empty">
            <IconDefaultAvatar :size="40" />
            <!-- Файл загружен, но браузер его не получил: чаще всего
                 хранилище закрыто для анонимного чтения -->
            <span v-if="brokenRoles[role]" class="avatar-broken">
              Картинка загружена, но не открывается
            </span>
          </div>
        </div>

        <div class="avatar-role">{{ AVATAR_ROLE_LABELS[role] }}</div>

        <!-- Отказ виден и когда в слоте уже лежит старая картинка -->
        <div v-if="slotErrors[role]" class="avatar-slot-error">
          {{ slotErrors[role] }}
        </div>

        <div class="avatar-actions">
          <!-- Штатная активация поля по клику на label: без программного
               click (его часть браузеров до события выбора не доводит) и без
               попадания в кнопку из shadow DOM самого поля - кликабельна вся
               подпись. Выглядит как кнопка Element Plus за счет ее же классов -->
          <label
            class="el-button el-button--small avatar-button avatar-upload-label"
            :class="{ 'is-disabled': isBusy }"
            :data-testid="`avatar-upload-${role}`"
          >
            <span>{{ avatarMap[role] ? 'Заменить' : 'Загрузить' }}</span>
            <input
              type="file"
              class="avatar-file-input"
              :accept="acceptedTypes"
              :disabled="isBusy"
              :aria-label="`${avatarMap[role] ? 'Заменить' : 'Загрузить'} аватарку: ${AVATAR_ROLE_LABELS[role]}`"
              :data-testid="`avatar-input-${role}`"
              @change="handlePicked(role, $event)"
            >
          </label>
          <el-button
            v-if="avatarMap[role]"
            size="small"
            type="danger"
            plain
            class="avatar-button"
            :disabled="isBusy"
            :data-testid="`avatar-delete-${role}`"
            @click="removeAvatar(role)"
          >
            Удалить
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/services/api'
import IconDefaultAvatar from '@/components/icons/IconDefaultAvatar.vue'
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_ROLES,
  AVATAR_ROLE_LABELS,
  avatarsToMap,
  getAvatarErrorMessage,
  mapToAvatars,
  prepareAvatarFile,
  validateAvatarFile
} from '@/utils/avatars'

const UPLOAD_ERROR = 'Не удалось загрузить аватарку'
const DELETE_ERROR = 'Не удалось удалить аватарку'

const props = defineProps({
  // 'me' - свой профиль, иначе id пользователя (правка админом)
  target: {
    type: String,
    required: true
  },
  avatars: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:avatars'])

const pendingRole = ref(null)
// Ссылка есть, а картинка не отдалась - показываем это, а не пустую рамку
const brokenRoles = ref({})
// Отказ висит в слоте: тост живет три секунды, и человек его пропускает -
// а на экране тогда ничего не меняется, будто клик не сработал
const slotErrors = ref({})

const acceptedTypes = AVATAR_ALLOWED_TYPES.join(',')
const avatarMap = computed(() => avatarsToMap(props.avatars))
const isMyAvatars = computed(() => props.target === 'me')
const isBusy = computed(() => props.disabled || pendingRole.value !== null)

const setSlotError = (role, message) => {
  slotErrors.value = { ...slotErrors.value, [role]: message }
}

const handlePicked = (role, event) => {
  const input = event.target
  const file = input.files?.[0]
  // Сбрасываем сразу: иначе повторный выбор того же файла не даст change
  input.value = ''
  uploadAvatar(role, file)
}

const emitUpdated = (role, url) => {
  // Новый файл - новая ссылка, прошлую поломку забываем
  brokenRoles.value = { ...brokenRoles.value, [role]: false }
  slotErrors.value = { ...slotErrors.value, [role]: '' }
  const updated = { ...avatarMap.value }
  if (url) {
    updated[role] = url
  } else {
    delete updated[role]
  }
  emit('update:avatars', mapToAvatars(updated))
}

const uploadAvatar = async (role, file) => {
  setSlotError(role, '')
  // Окно закрылось, а файла нет: молчать нельзя - со стороны это выглядит
  // как будто выбор просто не сработал
  if (!file) {
    setSlotError(role, 'Файл не выбран')
    return
  }

  const validationError = validateAvatarFile(file)
  if (validationError) {
    setSlotError(role, validationError)
    ElMessage.error(validationError)
    return
  }

  pendingRole.value = role
  try {
    const prepared = await prepareAvatarFile(file)
    const avatar = isMyAvatars.value
      ? await apiService.uploadMyAvatar(role, prepared)
      : await apiService.uploadUserAvatar(props.target, role, prepared)

    emitUpdated(role, avatar.avatar_url)
    ElMessage.success(`Аватарка «${AVATAR_ROLE_LABELS[role]}» обновлена`)
  } catch (error) {
    console.error('Ошибка загрузки аватарки:', error)
    const message = getAvatarErrorMessage(error, UPLOAD_ERROR)
    setSlotError(role, message)
    ElMessage.error(message)
  } finally {
    pendingRole.value = null
  }
}

const removeAvatar = async (role) => {
  try {
    await ElMessageBox.confirm(
      `Удалить аватарку «${AVATAR_ROLE_LABELS[role]}»? Восстановить файл будет нельзя`,
      'Подтверждение удаления',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    // Отмена удаления
    return
  }

  pendingRole.value = role
  try {
    if (isMyAvatars.value) {
      await apiService.deleteMyAvatar(role)
    } else {
      await apiService.deleteUserAvatar(props.target, role)
    }
    emitUpdated(role, null)
    ElMessage.success(`Аватарка «${AVATAR_ROLE_LABELS[role]}» удалена`)
  } catch (error) {
    console.error('Ошибка удаления аватарки:', error)
    ElMessage.error(getAvatarErrorMessage(error, DELETE_ERROR))
  } finally {
    pendingRole.value = null
  }
}
</script>

<style scoped>
.user-avatars-editor {
  width: 100%;
}

.avatars-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.avatars-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.avatars-hint {
  font-size: 12px;
  color: #909399;
}

.avatars-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.avatar-slot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* Пропорция кадра трансляции: человек видит ровно то, что попадет в плашку */
.avatar-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 6;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f5f7fa;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  color: #c0c4cc;
  text-align: center;
}

.avatar-broken {
  font-size: 11px;
  line-height: 1.3;
  color: #e6a23c;
}

.avatar-slot-error {
  font-size: 11px;
  line-height: 1.3;
  color: #f56c6c;
  text-align: center;
}

.avatar-role {
  font-size: 13px;
  color: #606266;
  text-align: center;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.avatar-button {
  width: 100%;
  margin-left: 0 !important;
}

.avatar-upload-label {
  cursor: pointer;
}

.avatar-upload-label.is-disabled {
  pointer-events: none;
}

/* Фокус уходит на само поле, а видно его должно быть на подписи */
.avatar-upload-label:focus-within {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

/* Не display:none: так поле остается доступным с клавиатуры,
   а label - его штатным переключателем */
.avatar-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  clip-path: inset(50%);
  pointer-events: none;
}


/* Планшет и телефон: четыре слота в ряд не помещаются */
@media (max-width: 1023px) {
  /* Колонку ограничиваем: на планшете два слота на 1fr растягиваются
     на пол-экрана каждый, а на телефоне трек ужимается сам */
  .avatars-grid {
    grid-template-columns: repeat(2, minmax(0, 220px));
  }

  /* Палец промахивается по маленьким кнопкам */
  .avatar-button {
    min-height: 44px;
  }
}
</style>
