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

// Сообщения ручки слияния пользователей
export const USER_MERGE_ERROR_MESSAGES = {
  SESSION_EXPIRED: 'Сессия истекла, войдите заново',
  FORBIDDEN: 'Объединять пользователей может только администратор',
  NO_CONNECTION: 'Сервер не отвечает. Проверьте соединение',
  NOT_FOUND: 'Часть выбранных пользователей уже не существует. Обновите список и выберите заново',
  SELF: 'Свою учётку нельзя сделать источником: слияние её удалит. Выберите себя основным или уберите из списка',
  TARGET_IN_SOURCES: 'Основной пользователь не может быть источником',
  SHARED_GAME: 'Участники сидели в одной игре за разными боксами — это разные люди, объединять их нельзя',
  TELEGRAM_OWNER_REQUIRED: 'Telegram привязан к нескольким участникам. Выберите, чью привязку оставить',
  TELEGRAM_OWNER_NOT_BOUND: 'У выбранного участника нет привязки telegram. Выберите другого',
  FAILED: 'Слияние сорвалось и было отменено целиком: данные не изменились',
  UNKNOWN_OUTCOME: 'Сервер оборвал слияние и не сказал, чем оно закончилось. Загляните в историю слияний и в список пользователей, прежде чем повторять',
  INVALID_PARAMS: 'Сервер не принял состав слияния',
  UNKNOWN_ERROR: 'Не удалось объединить пользователей. Попробуйте ещё раз'
}

// detail ручки слияния - статичные строки бекенда (app/user/merge/constants.py)
const USER_MERGE_DETAIL_MESSAGES = {
  'cannot merge yourself': USER_MERGE_ERROR_MESSAGES.SELF,
  'target is listed among the sources': USER_MERGE_ERROR_MESSAGES.TARGET_IN_SOURCES,
  'merge participants not found': USER_MERGE_ERROR_MESSAGES.NOT_FOUND,
  'participants share a game': USER_MERGE_ERROR_MESSAGES.SHARED_GAME,
  'telegram owner required': USER_MERGE_ERROR_MESSAGES.TELEGRAM_OWNER_REQUIRED,
  'telegram owner has no binding': USER_MERGE_ERROR_MESSAGES.TELEGRAM_OWNER_NOT_BOUND
}

// Ошибка слияния целиком: текст для человека и то, чем ее чинят.
// Общие игры и кандидатов на telegram диалог показывает, а не пересказывает,
// поэтому extra разбирается здесь же - в одном месте, знающем контракт ручки
export const getUserMergeFailure = (error) => {
  const response = error?.response
  if (!response) {
    return { message: USER_MERGE_ERROR_MESSAGES.NO_CONNECTION }
  }

  const { status, data } = response
  const extra = data?.extra

  if (status === 401) return { message: USER_MERGE_ERROR_MESSAGES.SESSION_EXPIRED }
  if (status === 403) return { message: USER_MERGE_ERROR_MESSAGES.FORBIDDEN }

  // 500 отдает разбор сбоя только в extra: detail Litestar подменяет
  // типовым «Internal Server Error» ровно у этого статуса
  if (status >= 500) {
    const errorCode = extra?.error_code || null
    // Разбор сбоя есть - отвечает сама ручка, а она откатывает слияние
    // целиком, поэтому про данные можно говорить уверенно
    if (errorCode) {
      return {
        message: USER_MERGE_ERROR_MESSAGES.FAILED,
        errorCode,
        mergeId: extra?.merge_id || null
      }
    }
    // Разбора нет - это 502/503/504 прокси или упавший воркер: запрос мог
    // дойти до ручки и закоммититься, и обещать «данные не изменились» тут
    // нельзя. Слияние необратимо, поэтому исход честнее назвать неизвестным
    return { message: USER_MERGE_ERROR_MESSAGES.UNKNOWN_OUTCOME }
  }

  const message = USER_MERGE_DETAIL_MESSAGES[data?.detail]
    || (status === 404 ? USER_MERGE_ERROR_MESSAGES.NOT_FOUND : null)
    || (status === 400 ? USER_MERGE_ERROR_MESSAGES.INVALID_PARAMS : null)
    || USER_MERGE_ERROR_MESSAGES.UNKNOWN_ERROR

  return {
    message,
    sharedGames: extra?.games || [],
    telegramCandidateIds: extra?.candidate_ids || [],
    missingIds: extra?.missing_ids || []
  }
}
