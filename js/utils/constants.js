// utils/constants.js

export const PLAYER_ROLES = {
    CIVILIAN: 'Мирный',
    SHERIFF: 'Шериф',
    MAFIA: 'Мафия',
    DON: 'Дон'
};

export const MAX_FOULS = {
    BEFORE_SILENCE: 3,
    BEFORE_ELIMINATION: 4
};

export const TIMER_INTERVALS = {
    SECOND: 1000
};

export const DEFAULT_PLAYERS_COUNT = 10;
export const NO_CANDIDATES_MAX_ROUNDS = 3;

// Основные статусы игры
export const GAME_STATUSES = {
    CREATED: 'created',                    // 1. Создана
    SEATING_READY: 'seating_ready',        // 2. Рассадка готова
    ROLE_DISTRIBUTION: 'role_distribution', // 3. Роздача ролей и договорка
    IN_PROGRESS: 'in_progress',            // 4. Процесс игры
    FINISHED_NO_SCORES: 'finished_no_scores', // 5. Игра без расставленных баллов
    FINISHED_WITH_SCORES: 'finished_with_scores', // 6. Игра с расставленными баллами
    CANCELLED: 'cancelled'                 // 7. Отменена (новый статус)
};

// Подстатусы для процесса игры (используются когда GAME_STATUS = IN_PROGRESS)
export const GAME_SUBSTATUS = {
    DISCUSSION: 'discussion',              // 1. Обсуждение
    CRITICAL_DISCUSSION: 'critical_discussion', // 2. Обсуждение на критическом кругу
    VOTING: 'voting',                      // 3. Голосование
    SUSPECTS_SPEECH: 'suspects_speech',    // 4. Речь подозреваемых на попиле
    FAREWELL_MINUTE: 'farewell_minute',    // 5. Прощальная минута заголосованного
    NIGHT: 'night'                         // 6. Ночь
};

// Названия статусов для отображения
export const GAME_STATUS_NAMES = {
    [GAME_STATUSES.CREATED]: 'Создана',
    [GAME_STATUSES.SEATING_READY]: 'Рассадка готова', 
    [GAME_STATUSES.ROLE_DISTRIBUTION]: 'Роздача ролей',
    [GAME_STATUSES.IN_PROGRESS]: 'В процессе',
    [GAME_STATUSES.FINISHED_NO_SCORES]: 'Завершена без баллов',
    [GAME_STATUSES.FINISHED_WITH_SCORES]: 'Завершена с баллами',
    [GAME_STATUSES.CANCELLED]: 'Отменена'
};

export const GAME_SUBSTATUS_NAMES = {
    [GAME_SUBSTATUS.DISCUSSION]: 'Обсуждение',
    [GAME_SUBSTATUS.CRITICAL_DISCUSSION]: 'Критический круг',
    [GAME_SUBSTATUS.VOTING]: 'Голосование', 
    [GAME_SUBSTATUS.SUSPECTS_SPEECH]: 'Речь подозреваемых',
    [GAME_SUBSTATUS.FAREWELL_MINUTE]: 'Прощальная минута',
    [GAME_SUBSTATUS.NIGHT]: 'Ночь'
};

// Правила переходов между статусами
export const STATUS_TRANSITIONS = {
    [GAME_STATUSES.CREATED]: [
        GAME_STATUSES.SEATING_READY
    ],
    [GAME_STATUSES.SEATING_READY]: [
        GAME_STATUSES.ROLE_DISTRIBUTION,
        GAME_STATUSES.CREATED
    ],
    [GAME_STATUSES.ROLE_DISTRIBUTION]: [
        GAME_STATUSES.IN_PROGRESS,
        GAME_STATUSES.SEATING_READY
    ],
    [GAME_STATUSES.IN_PROGRESS]: [
        GAME_STATUSES.FINISHED_NO_SCORES,
        GAME_STATUSES.CANCELLED
    ],
    [GAME_STATUSES.FINISHED_NO_SCORES]: [
        GAME_STATUSES.FINISHED_WITH_SCORES
    ],
    [GAME_STATUSES.FINISHED_WITH_SCORES]: [],
    [GAME_STATUSES.CANCELLED]: [
        GAME_STATUSES.SEATING_READY  // Для перерасдачи
    ]
};

// Новые константы для отмены игры
export const CANCELLATION_REASONS = {
    PLAYER_MISBEHAVIOR: 'player_misbehavior',
    TECHNICAL_ISSUES: 'technical_issues', 
    INSUFFICIENT_PLAYERS: 'insufficient_players',
    OTHER: 'other'
};
