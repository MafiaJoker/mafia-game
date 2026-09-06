// Игровые аватарки пользователя: по одной на роль.
// Порядок ролей - как в карусели раздачи: мирный, мафия, дон, шериф.
import { LABELS } from '@/utils/uiConstants'

export const AVATAR_ROLES = ['civilian', 'mafia', 'don', 'sheriff']

export const AVATAR_ROLE_LABELS = LABELS.ROLES

// Сервер режет кадр 5:6 и ужимает до 240x288 - превью держим в той же
// пропорции, иначе судья видит не тот кадр, что попадет в трансляцию
export const AVATAR_ASPECT_RATIO = '5 / 6'

export const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Предел разрешения перед отправкой: серверу незачем разворачивать у себя
// двенадцатимегапиксельную фотку ради картинки 240x288
const MAX_LONG_SIDE = 2560
const MAX_SHORT_SIDE = 1080
const JPEG_QUALITY = 0.9

export const AVATAR_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export const AVATAR_FILE_ERRORS = {
  TYPE: 'Аватарка должна быть в формате JPG, PNG или WebP',
  SIZE: 'Файл больше 5 МБ - выберите картинку поменьше'
}

// Тип браузер берет из расширения и знает не всегда: у файла с диска он
// бывает пустым. Сервер все равно определяет формат по сигнатуре, поэтому
// пустой тип не повод отказывать - смотрим на расширение
const getFileExtension = (name) => (name || '').split('.').pop().toLowerCase()

const describeRejectedFile = (file) => {
  const extension = getFileExtension(file.name)
  const label = file.type || (extension ? `.${extension}` : '')
  return label
    ? `Формат ${label} не поддерживается - нужен JPG, PNG или WebP`
    : AVATAR_FILE_ERRORS.TYPE
}

// Одна аватарка для компактных мест (список, автокомплит): в приоритете
// мирный житель, дальше - в порядке карусели ролей
export const pickPrimaryAvatar = (avatars) => {
  if (!Array.isArray(avatars) || avatars.length === 0) return null

  for (const role of AVATAR_ROLES) {
    const avatar = avatars.find(item => item?.role === role && item?.avatar_url)
    if (avatar) return avatar.avatar_url
  }
  return null
}

export const avatarsToMap = (avatars) => {
  const map = {}
  if (!Array.isArray(avatars)) return map

  for (const avatar of avatars) {
    if (avatar?.role && avatar?.avatar_url) map[avatar.role] = avatar.avatar_url
  }
  return map
}

export const mapToAvatars = (map) => (
  AVATAR_ROLES
    .filter(role => map[role])
    .map(role => ({ role, avatar_url: map[role] }))
)

// Проверяем исходный файл, до предресайза: гигантская картинка сначала
// развернется в памяти вкладки, а на телефоне это ее и уронит
export const validateAvatarFile = (file) => {
  if (!file) return AVATAR_FILE_ERRORS.TYPE

  const typeAllowed = AVATAR_ALLOWED_TYPES.includes(file.type)
  const extensionAllowed = AVATAR_ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))
  // Тип пустой - верим расширению: иначе отказываем нормальному jpeg только
  // потому, что браузер не подставил mime
  if (!typeAllowed && !(file.type === '' && extensionAllowed)) {
    return describeRejectedFile(file)
  }

  if (file.size > AVATAR_MAX_FILE_SIZE) return AVATAR_FILE_ERRORS.SIZE
  return null
}

export const getAvatarScale = (width, height) => {
  const longSide = Math.max(width, height)
  const shortSide = Math.min(width, height)
  return Math.min(1, MAX_LONG_SIDE / longSide, MAX_SHORT_SIDE / shortSide)
}

const canvasToBlob = (canvas) => new Promise((resolve) => {
  canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
})

const drawResized = async (bitmap, width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  // resizeQuality браузера лучше ручного drawImage, но поддержан не везде
  let resized = null
  try {
    resized = await createImageBitmap(bitmap, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high'
    })
    context.drawImage(resized, 0, 0)
  } catch {
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
  } finally {
    resized?.close?.()
  }

  return canvasToBlob(canvas)
}

// Декодирование картинки может не только упасть, но и подвиснуть: файл с
// сетевого диска или заглушка облачного хранилища читается сколько угодно.
// Загрузку из-за этого не держим - по истечении срока шлем оригинал.
const RESIZE_TIMEOUT_MS = 8000

// Уменьшаем разрешение перед отправкой. Предресайз - оптимизация, а не
// гарантия: если что-то пошло не так, отправляем оригинал, а кадр и формат
// сервер все равно доводит сам.
export const prepareAvatarFile = async (file) => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let timer = null
  try {
    return await Promise.race([
      resizeAvatarFile(file),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          console.warn('Предресайз аватарки не уложился в срок, шлем оригинал')
          resolve(file)
        }, RESIZE_TIMEOUT_MS)
      })
    ])
  } finally {
    clearTimeout(timer)
  }
}

const resizeAvatarFile = async (file) => {
  let bitmap = null
  try {
    // canvas стирает EXIF, поэтому поворот обязан примениться здесь:
    // сервер уже не починит - его exif_transpose получит картинку без метаданных
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const scale = getAvatarScale(bitmap.width, bitmap.height)
    if (scale >= 1) return file

    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const blob = await drawResized(bitmap, width, height)
    if (!blob) return file

    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
  } catch (error) {
    console.warn('Не удалось уменьшить аватарку перед отправкой, шлем оригинал:', error)
    return file
  } finally {
    bitmap?.close?.()
  }
}

export const AVATAR_UPLOAD_ERRORS = {
  413: 'Файл больше 5 МБ - выберите картинку поменьше',
  415: 'Не удалось обработать картинку: неподдерживаемый формат или слишком большое разрешение',
  429: 'Сервер занят обработкой картинок. Попробуйте через минуту',
  404: 'Пользователь не найден. Обновите страницу',
  502: 'Хранилище картинок недоступно. Попробуйте позже'
}

export const getAvatarErrorMessage = (error, fallback) => {
  const status = error?.response?.status
  if (status && AVATAR_UPLOAD_ERRORS[status]) return AVATAR_UPLOAD_ERRORS[status]
  if (error?.code === 'ECONNABORTED') return 'Загрузка не уложилась в таймаут. Попробуйте снова'
  return fallback
}
