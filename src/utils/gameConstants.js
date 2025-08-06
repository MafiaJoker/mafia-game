// Игровые константы и правила

// Основные параметры игры
export const GAME_RULES = {
  // Количество игроков
  PLAYERS: {
    MIN: 10,
    MAX: 10,
    TOTAL: 10
  },
  
  // Распределение ролей
  ROLES_DISTRIBUTION: {
    CIVILIAN: 6,
    MAFIA: 2,
    DON: 1,
    SHERIFF: 1
  },
  
  // Правила фолов
  FOULS: {
    WARNING_THRESHOLD: 2,      // После 2 фолов - предупреждение
    SILENCE_THRESHOLD: 3,      // После 3 фолов - лишение права голоса
    ELIMINATION_THRESHOLD: 4,  // После 4 фолов - удаление из игры
    MAX_ALLOWED: 4,           // Максимальное количество фолов
    TECHNICAL_DEFEAT: 5       // Техническое поражение команды
  },
  
  // Раунды и фазы
  ROUNDS: {
    CRITICAL_ROUNDS_LIMIT: 3,    // После 3 раундов без выбывших - критические раунды
    NIGHT_ACTIONS_SEQUENCE: 3,   // Количество ночных действий
    MAX_VOTING_ROUNDS: 3,        // Максимум голосований в одном раунде
    SHOOTOUT_PLAYERS: 2          // Количество игроков в перестрелке
  },
  
  // Таймеры (в секундах)
  TIMERS: {
    PLAYER_SPEECH: 60,          // Время на речь игрока
    LAST_MINUTE_SPEECH: 60,     // Последняя минута
    VOTING: 30,                 // Время на голосование
    NIGHT_ACTION: 30,           // Время на ночное действие
    DEFENSE_SPEECH: 30,         // Время на оправдательную речь
    FINAL_VOTING: 10            // Время на финальное голосование
  },
  
  // Условия победы
  VICTORY_CONDITIONS: {
    CIVILIANS_WIN: {
      ALL_MAFIA_ELIMINATED: true,     // Все мафия выбыли
      BLACK_TEAM_COUNT: 0             // Черных игроков = 0
    },
    MAFIA_WIN: {
      EQUAL_OR_MORE_BLACK: true,      // Черных >= красных
      ALL_CIVILIANS_ELIMINATED: true   // Все мирные выбыли
    }
  }
}

// Система начисления баллов
export const SCORING = {
  // Базовые баллы за победу
  BASE_WIN_POINTS: {
    CIVILIAN: 1.0,
    SHERIFF: 1.0,
    MAFIA: 2.0,
    DON: 2.0
  },
  
  // Баллы за поражение
  BASE_LOSE_POINTS: {
    CIVILIAN: 0,
    SHERIFF: 0,
    MAFIA: 0,
    DON: 0
  },
  
  // Дополнительные баллы
  BONUSES: {
    BEST_MOVE: 0.5,           // За лучший ход
    FIRST_KILLED_MAFIA: 0.3,  // Первый убитый мафия
    GUESS_ROLES: 0.2,         // За угаданные роли
    PERFECT_GAME: 0.5         // За идеальную игру
  },
  
  // Штрафы
  PENALTIES: {
    FOUL: 0.1,               // За каждый фол
    ELIMINATED: 0.5,         // За удаление из игры
    WRONG_VOTE: 0.1,        // За неправильное голосование
    SILENCE: 0.2            // За лишение права голоса
  },
  
  // Диапазоны баллов
  RANGES: {
    ADDITIONAL: {
      MIN: -3,
      MAX: 3,
      STEP: 0.1
    },
    PENALTY: {
      MIN: 0,
      MAX: 5,
      STEP: 0.1
    }
  }
}

// Статусы игры
export const GAME_STATUS = {
  CREATED: 'created',
  SEAT_ARRANGEMENT: 'seat_arrangement',
  ROLE_DEALING: 'role_dealing',
  FIRST_NIGHT: 'first_night',
  IN_PROGRESS: 'in_progress',
  DAY_DISCUSSION: 'day_discussion',
  DAY_VOTING: 'day_voting',
  NIGHT: 'night',
  FINISHED: 'finished',
  CANCELLED: 'cancelled'
}

// Подстатусы игры
export const GAME_SUBSTATUS = {
  // Дневные подстатусы
  PLAYER_SPEAKING: 'player_speaking',
  NOMINATION: 'nomination',
  VOTING: 'voting',
  SHOOTOUT: 'shootout',
  DEFENSE_SPEECH: 'defense_speech',
  FINAL_VOTING: 'final_voting',
  
  // Ночные подстатусы
  MAFIA_KILL: 'mafia_kill',
  DON_CHECK: 'don_check',
  SHERIFF_CHECK: 'sheriff_check',
  BEST_MOVE: 'best_move'
}

// Действия игроков
export const PLAYER_ACTIONS = {
  NOMINATE: 'nominate',
  VOTE: 'vote',
  SPEAK: 'speak',
  FOUL: 'foul',
  KILL: 'kill',
  CHECK: 'check',
  BEST_MOVE: 'best_move',
  PASS: 'pass'
}

// Типы фолов
export const FOUL_TYPES = {
  SPEAKING_OUT_OF_TURN: 'speaking_out_of_turn',
  GESTURES: 'gestures',
  REVEALING_ROLE: 'revealing_role',
  SWEARING: 'swearing',
  DELAY_OF_GAME: 'delay_of_game',
  TOUCHING_PLAYERS: 'touching_players',
  OTHER: 'other'
}

// Результаты проверок
export const CHECK_RESULTS = {
  DON: {
    IS_SHERIFF: 'sheriff',
    NOT_SHERIFF: 'not_sheriff'
  },
  SHERIFF: {
    IS_BLACK: 'black',
    IS_RED: 'red'
  }
}

// Результаты игры
export const GAME_RESULTS = {
  CIVILIANS_WIN: 'civilians_win',
  MAFIA_WIN: 'mafia_win',
  DRAW: 'draw',
  CANCELLED: 'cancelled'
}

// Команды
export const TEAMS = {
  RED: 'red',
  BLACK: 'black'
}