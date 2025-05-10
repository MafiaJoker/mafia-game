// utils/constants.js
export const GAME_PHASES = {
    DISTRIBUTION: 'distribution',
    DAY: 'day',
    VOTING: 'voting',
    NIGHT: 'night'
};

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
