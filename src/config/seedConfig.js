export const SEED_PROFILES = {
    minimal: {
        events: 2,
        gamesPerEvent: 1,
        users: 5
    },
    full: {
        events: 5,
        gamesPerEvent: 3,
        users: 20
    },
    stress: {
        events: 20,
        gamesPerEvent: 10,
        users: 100
    }
}

export const SEED_CONFIG = {
    // Профиль по умолчанию
    defaultProfile: 'minimal',
    
    // Настройки для разных типов данных
    events: {
        categories: ['funky', 'minicap', 'tournament', 'charity_tournament'],
        languages: ['ru', 'en', 'am'],
        statuses: ['planned', 'active', 'completed']
    },
    
    games: {
        statuses: ['not_started', 'in_progress', 'finished'],
        results: ['civilians_win', 'mafia_win', 'draw'],
        rounds: [1, 2, 3, 4, 5]
    },
    
    users: {
        roles: ['player', 'judge', 'admin'],
        // Популярные русские имена для реалистичности
        firstNames: [
            'Александр', 'Алексей', 'Андрей', 'Антон', 'Артём',
            'Дмитрий', 'Егор', 'Иван', 'Максим', 'Михаил',
            'Никита', 'Николай', 'Павел', 'Роман', 'Сергей',
            'Анна', 'Виктория', 'Дарья', 'Екатерина', 'Елена',
            'Ирина', 'Мария', 'Наталья', 'Ольга', 'Татьяна'
        ],
        lastNames: [
            'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов',
            'Попов', 'Волков', 'Соколов', 'Лебедев', 'Козлов',
            'Новиков', 'Морозов', 'Орлов', 'Андреев', 'Макаров'
        ]
    },
    
    // API настройки
    api: {
        timeout: 5000,
        retries: 3
    }
}

// Получить конфигурацию для профиля
export function getProfileConfig(profileName = SEED_CONFIG.defaultProfile) {
    const profile = SEED_PROFILES[profileName]
    if (!profile) {
        console.warn(`Профиль '${profileName}' не найден. Используется '${SEED_CONFIG.defaultProfile}'`)
        return SEED_PROFILES[SEED_CONFIG.defaultProfile]
    }
    return profile
}

// Вспомогательные функции
export function getRandomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)]
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getRandomBoolean() {
    return Math.random() < 0.5
}