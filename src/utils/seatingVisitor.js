// Откуда пришел посетитель публичной рассадки - это пишет в статистику сервер.
// Заголовок Referer запроса к API тут не помощник: браузер кладет туда адрес
// нашей же страницы, поэтому источник фронт сообщает сам, в теле запроса

const CLIENT_ID_STORAGE_KEY = 'seating_client_id'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UTM_PREFIX = 'utm_'

// Метки utm_* из query адреса. Повторенную метку берем первой, пустую
// пропускаем: сервер ждет строки. Меток нет - null, и поле не уходит
export const pickUtmTags = (query = {}) => {
  const tags = {}
  Object.entries(query).forEach(([key, value]) => {
    if (!key.startsWith(UTM_PREFIX)) return
    const first = [].concat(value).find(item => typeof item === 'string' && item)
    if (first) tags[key] = first
  })
  return Object.keys(tags).length ? tags : null
}

// Случайный UUID браузера, однажды записанный в localStorage: по нему сервер
// отличает людей от нажатий. Нет хранилища или оно отказало, нет
// crypto.randomUUID (на небезопасном origin его нет) - null, поле не уходит.
// Мусор в хранилище заменяем новым id: сервер не примет запрос с ним
export const getSeatingClientId = () => {
  try {
    const stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (stored && UUID_PATTERN.test(stored)) return stored
    if (typeof globalThis.crypto?.randomUUID !== 'function') return null
    const clientId = globalThis.crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId)
    return clientId
  } catch {
    return null
  }
}
