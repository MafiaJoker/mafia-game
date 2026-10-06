// Роли игроков (для API)
export const GameRolesEnum = {
    mafia: 'mafia',
    don: 'don',
    sheriff: 'sheriff',
    civilian: 'civilian'
}

// Роли игроков (для отображения)
export const PLAYER_ROLES = {
    CIVILIAN: 'Мирный',
    SHERIFF: 'Шериф',
    MAFIA: 'Мафия',
    DON: 'Дон'
}

// Статусы игры
export const GAME_STATUSES = {
    CREATED: 'created',
    SEATING_READY: 'seating_ready',
    ROLE_DISTRIBUTION: 'role_distribution',
    NEGOTIATION: 'negotiation', // Договорка
    FREE_SEATING: 'free_seating', // Свободная посадка
    IN_PROGRESS: 'in_progress',
    FINISHED_NO_SCORES: 'finished_no_scores',
    FINISHED_WITH_SCORES: 'finished_with_scores',
    CANCELLED: 'cancelled'
}

// Подстатусы игры
export const GAME_SUBSTATUS = {
    DISCUSSION: 'discussion',
    CRITICAL_DISCUSSION: 'critical_discussion',
    VOTING: 'voting',
    SUSPECTS_SPEECH: 'suspects_speech',
    FAREWELL_MINUTE: 'farewell_minute',
    NIGHT: 'night'
}

// Названия статусов
export const GAME_STATUS_NAMES = {
    [GAME_STATUSES.CREATED]: 'С',
    [GAME_STATUSES.SEATING_READY]: 'Р',
    [GAME_STATUSES.ROLE_DISTRIBUTION]: 'Раздача ролей',
    [GAME_STATUSES.NEGOTIATION]: 'Договорка',
    [GAME_STATUSES.FREE_SEATING]: 'Свободная посадка',
    [GAME_STATUSES.IN_PROGRESS]: 'В процессе',
    [GAME_STATUSES.FINISHED_NO_SCORES]: 'Завершена без баллов',
    [GAME_STATUSES.FINISHED_WITH_SCORES]: 'Завершена с баллами',
    [GAME_STATUSES.CANCELLED]: 'Отменена'
}

export const GAME_SUBSTATUS_NAMES = {
    [GAME_SUBSTATUS.DISCUSSION]: 'Обсуждение',
    [GAME_SUBSTATUS.CRITICAL_DISCUSSION]: 'Критический круг',
    [GAME_SUBSTATUS.VOTING]: 'Голосование',
    [GAME_SUBSTATUS.SUSPECTS_SPEECH]: 'Речь подозреваемых',
    [GAME_SUBSTATUS.FAREWELL_MINUTE]: 'Прощальная минута',
    [GAME_SUBSTATUS.NIGHT]: 'Ночь'
}

// Статусы и категории событий
export const EVENT_STATUSES = {
    PLANNED: 'planned',
    ACTIVE: 'active', 
    COMPLETED: 'completed'
}

export const EVENT_CATEGORIES = {
    FUNKY: 'funky',
    MINICAP: 'minicap',
    TOURNAMENT: 'tournament',
    CHARITY: 'charity_tournament'
}

// Приоритеты категорий
export const CATEGORY_PRIORITIES = {
    'tournament': 1,
    'minicap': 2,
    'charity_tournament': 3,
    'funky': 4
}

// Заголовок вкладки - тот же, что в <title> index.html. Страница со своим
// заголовком (meta.title маршрута) после ухода с нее возвращает этот
export const APP_TITLE = 'Мафия Helper - Помощник для игры в Мафию'

// Настройки игры
export const DEFAULT_PLAYERS_COUNT = 10
export const NO_CANDIDATES_MAX_ROUNDS = 3

// Рассадка: границы бекенда (app/game/seating/constants.py), чтобы не гонять
// заведомо неверные запросы. Общие у рассадки мероприятия и публичной
export const SEATING_MAX_TABLES_COUNT = 20
export const SEATING_MAX_GAMES_COUNT = 200
export const SEATING_SEED_MAX_LENGTH = 64
export const SEATING_TITLE_MAX_LENGTH = 100
export const DEFAULT_TABLE_NAME_TEMPLATE = 'Стол {}'

export const SEATING_SEED_HINT = 'Сид — ключ, из которого сервер собирает случайную рассадку. '
  + 'Один и тот же сид с тем же составом игроков дает ту же самую рассадку, '
  + 'поэтому ее можно повторить или проверить. Оставьте поле пустым — сервер '
  + 'придумает сид сам и покажет его вместе с рассадкой.'

// Фазы таймера обратного отсчета
export const COUNTDOWN_PHASES = {
    MAFIA_NEGOTIATION: 'mafia_negotiation', // 60 секунд
    TRANSITION: 'transition', // Желтая вспышка
    FREE_SEATING: 'free_seating' // 40 секунд
}

// Причины отмены игры
export const CANCELLATION_REASONS = {
    PLAYER_MISBEHAVIOR: 'player_misbehavior',
    TECHNICAL_ISSUES: 'technical_issues',
    INSUFFICIENT_PLAYERS: 'insufficient_players',
    OTHER: 'other'
}

// Aliases for tests
export const ROLE = PLAYER_ROLES
export const PLAYER_STATUS = {
    ALIVE: 'ALIVE',
    VOTED_OUT: 'VOTED_OUT',
    KILLED: 'KILLED',
    KICKED: 'KICKED'
}
export const GAME_PHASE = {
    DAY: 'DAY',
    NIGHT: 'NIGHT'
}
