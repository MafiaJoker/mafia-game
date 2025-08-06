// API константы и конфигурация

// Базовые URL и endpoints
export const API_ENDPOINTS = {
  // События
  EVENTS: {
    BASE: '/events',
    BY_ID: (id) => `/events/${id}`,
    TABLES: (id) => `/events/${id}/tables`,
    REGISTRATIONS: (id) => `/events/${id}/registrations`,
    STATISTICS: (id) => `/events/${id}/statistics`
  },
  
  // Типы событий
  EVENT_TYPES: {
    BASE: '/event-types',
    BY_ID: (id) => `/event-types/${id}`
  },
  
  // Игры
  GAMES: {
    BASE: '/games',
    BY_ID: (id) => `/games/${id}`,
    UPDATE_PHASE: (id) => `/games/${id}/UpdateGamePhase`,
    SET_POINTS: (id) => `/games/${id}/setPlayersPoints`,
    FINISH: (id) => `/games/${id}/finish`,
    CANCEL: (id) => `/games/${id}/cancel`,
    HISTORY: (id) => `/games/${id}/history`
  },
  
  // Столы
  TABLES: {
    BASE: '/tables',
    BY_ID: (id) => `/tables/${id}`,
    GAMES: (id) => `/tables/${id}/games`,
    CREATE_GAME: (id) => `/tables/${id}/create-game`
  },
  
  // Судьи
  JUDGES: {
    BASE: '/judges',
    BY_ID: (id) => `/judges/${id}`,
    AVAILABLE: '/judges/available'
  },
  
  // Игроки
  PLAYERS: {
    BASE: '/players',
    BY_ID: (id) => `/players/${id}`,
    SEARCH: '/players/search',
    STATISTICS: (id) => `/players/${id}/statistics`
  },
  
  // Пользователи
  USERS: {
    BASE: '/users',
    CURRENT: '/users/current',
    LOGIN: '/users/login',
    LOGOUT: '/users/logout',
    REGISTER: '/users/register',
    UPDATE_PROFILE: '/users/profile'
  },
  
  // Тарифы
  TARIFFS: {
    BASE: '/tariffs',
    BY_ID: (id) => `/tariffs/${id}`,
    SUBSCRIBE: (id) => `/tariffs/${id}/subscribe`
  }
}

// Таймауты для различных операций (в миллисекундах)
export const API_TIMEOUTS = {
  DEFAULT: 30000,           // 30 секунд - обычные запросы
  LONG_OPERATION: 60000,    // 60 секунд - долгие операции
  QUICK_CHECK: 5000,        // 5 секунд - быстрые проверки
  FILE_UPLOAD: 120000,      // 2 минуты - загрузка файлов
  REALTIME: 10000          // 10 секунд - real-time обновления
}

// HTTP статус коды
export const HTTP_STATUS = {
  // Успешные
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Клиентские ошибки
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Серверные ошибки
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

// Заголовки запросов
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  ACCEPT_LANGUAGE: 'Accept-Language',
  USER_AGENT: 'User-Agent',
  X_REQUESTED_WITH: 'X-Requested-With'
}

// Типы контента
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
  HTML: 'text/html'
}

// Методы HTTP
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD'
}

// Параметры пагинации
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
  AVAILABLE_LIMITS: [10, 20, 50, 100]
}

// Параметры сортировки
export const SORTING = {
  DEFAULT_ORDER: 'desc',
  ORDERS: ['asc', 'desc'],
  DEFAULT_FIELDS: {
    EVENTS: 'start_date',
    GAMES: 'created_at',
    PLAYERS: 'nickname',
    TABLES: 'label'
  }
}

// Коды ошибок API
export const API_ERROR_CODES = {
  // Общие ошибки
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Ошибки аутентификации
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Ошибки игры
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  INVALID_GAME_STATE: 'INVALID_GAME_STATE',
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_ACTION: 'INVALID_ACTION',
  
  // Ошибки данных
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_DATA: 'INVALID_DATA',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
}

// Настройки retry (повторных попыток)
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,      // 1 секунда
  MAX_DELAY: 10000,         // 10 секунд
  BACKOFF_MULTIPLIER: 2,    // Экспоненциальная задержка
  RETRY_STATUSES: [408, 429, 500, 502, 503, 504]
}

// WebSocket события
export const WS_EVENTS = {
  // Подключение
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  
  // Игровые события
  GAME_UPDATED: 'game:updated',
  PHASE_CHANGED: 'game:phase_changed',
  PLAYER_ACTION: 'game:player_action',
  TIMER_UPDATE: 'game:timer_update',
  
  // События столов
  TABLE_UPDATED: 'table:updated',
  PLAYER_JOINED: 'table:player_joined',
  PLAYER_LEFT: 'table:player_left',
  
  // Системные события
  NOTIFICATION: 'system:notification',
  BROADCAST: 'system:broadcast'
}

// Форматы дат для API
export const API_DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
}