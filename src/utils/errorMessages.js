// Общие сообщения об ошибках для компонентов игры
export const GAME_ERROR_MESSAGES = {
  // Ошибки рассадки игроков
  NOT_TEN_PLAYERS: 'Выберите 10 игроков для начала игры',

  // Ошибки раздачи ролей
  INVALID_ROLES: 'Раздайте роли - 1 шериф, 1 дон и 2 мафиози',

  // Общие ошибки
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка'
}

// Сообщения об ошибках генерации рассадки мероприятия
export const SEATING_ERROR_MESSAGES = {
  EVENT_NOT_FOUND: 'Мероприятие не найдено. Обновите страницу',
  NO_SEATING: 'Рассадки пока нет: сгенерируйте ее и создайте игры',
  FORBIDDEN: 'Рассадку мероприятия генерирует судья',
  SESSION_EXPIRED: 'Сессия истекла, войдите заново',
  CONFLICT: 'Данные мероприятия изменились. Обновите страницу и попробуйте снова',
  NO_CONNECTION: 'Сервер не отвечает. Проверьте соединение',
  INVALID_PARAMS: 'Сервер не принял параметры рассадки. Проверьте их и попробуйте снова',
  UNKNOWN_ERROR: 'Не удалось получить рассадку. Попробуйте еще раз'
}

// Ошибки этапов: у мероприятия с этапами игра обязана знать свой этап
const SEATING_STAGE_MESSAGES = {
  'staged game forbidden for unstaged event': 'У мероприятия нет этапов, а рассадка просит этап',
  'unstaged game forbidden for staged event': 'У мероприятия есть этапы — рассадка по этапам пока не поддерживается',
  'wrong game stage id': 'Такого этапа у мероприятия нет'
}

// Тексты валидации сериализатора бекенда
const SEATING_VALIDATION_MESSAGES = [
  ['at least 1 item', 'Добавьте в рассадку игроков'],
  ['games_count must be divisible by tables_count', 'Количество игр должно делиться на количество столов'],
  ['player_ids must hold ten ids per table', 'Игроков должно быть ровно по 10 на каждый стол'],
  ['player_ids must be unique', 'Один и тот же игрок добавлен дважды'],
  ['at most 64 characters', 'Сид не длиннее 64 символов']
]

const validationMessage = (extra) => {
  const texts = extra.map(item => item?.message).filter(Boolean)
  for (const [marker, message] of SEATING_VALIDATION_MESSAGES) {
    if (texts.some(text => text.includes(marker))) return message
  }
  return null
}

// Ошибка ответа /events/{id}/seating человеческим языком.
// fromRegistrations меняет только рассказ о нехватке игроков: список игроков
// судья видит перед собой, а регистрации — нет
export const getSeatingErrorMessage = (error, { fromRegistrations = false } = {}) => {
  const response = error?.response
  if (!response) return SEATING_ERROR_MESSAGES.NO_CONNECTION

  const { status, data } = response
  const detail = data?.detail
  const extra = data?.extra

  if (status === 400) {
    if (detail === 'wrong players count') {
      const required = extra?.required_players_count
      const actual = extra?.actual_players_count
      return fromRegistrations
        ? `Подтвержденных регистраций ${actual}, а нужно ровно ${required} — по 10 игроков на стол`
        : `Игроков ${actual}, а нужно ровно ${required} — по 10 на каждый стол`
    }
    if (detail === 'unknown player ids') {
      return 'Часть игроков больше не существует. Удалите их из списка и добавьте заново'
    }
    if (SEATING_STAGE_MESSAGES[detail]) return SEATING_STAGE_MESSAGES[detail]
    if (Array.isArray(extra)) return validationMessage(extra) || SEATING_ERROR_MESSAGES.INVALID_PARAMS
    return SEATING_ERROR_MESSAGES.INVALID_PARAMS
  }
  if (status === 401) return SEATING_ERROR_MESSAGES.SESSION_EXPIRED
  if (status === 403) return SEATING_ERROR_MESSAGES.FORBIDDEN
  if (status === 404) return SEATING_ERROR_MESSAGES.EVENT_NOT_FOUND
  if (status === 409) return SEATING_ERROR_MESSAGES.CONFLICT
  return SEATING_ERROR_MESSAGES.UNKNOWN_ERROR
}

// Выгрузка отвечает 404 и когда мероприятия нет, и когда игр с рассадкой еще нет
export const getSeatingExportErrorMessage = (error) => {
  const response = error?.response
  if (response?.status === 404 && response?.data?.detail?.includes('no seating found')) {
    return SEATING_ERROR_MESSAGES.NO_SEATING
  }
  return getSeatingErrorMessage(error)
}
