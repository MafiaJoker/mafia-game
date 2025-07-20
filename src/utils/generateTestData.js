import { apiService } from '@/services/api'

// Генератор случайных данных
const random = {
    // Случайный элемент из массива
    choice: (array) => array[Math.floor(Math.random() * array.length)],
    
    // Случайное число в диапазоне
    int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Случайная дата в прошлом
    pastDate: (daysAgo = 30) => {
        const date = new Date()
        date.setDate(date.getDate() - random.int(1, daysAgo))
        date.setHours(random.int(18, 23), random.int(0, 59), 0, 0)
        return date.toISOString()
    },

    // Случайная дата в будущем
    futureDate: (daysFromNow = 30) => {
        const date = new Date()
        date.setDate(date.getDate() + random.int(1, daysFromNow))
        date.setHours(random.int(18, 23), random.int(0, 59), 0, 0)
        return date.toISOString()
    }
}

// Шаблоны данных
const eventTemplates = [
    {
        label: 'Весенний турнир',
        description: 'Традиционный весенний турнир по мафии',
        language: 'ru'
    },
    {
        label: 'Летний кубок',
        description: 'Открытый летний кубок для всех игроков',
        language: 'ru'
    },
    {
        label: 'Осенний чемпионат',
        description: 'Чемпионат города по мафии',
        language: 'ru'
    },
    {
        label: 'Зимняя лига',
        description: 'Зимняя лига профессиональных игроков',
        language: 'ru'
    },
    {
        label: 'Новогодний турнир',
        description: 'Праздничный новогодний турнир',
        language: 'ru'
    }
]

const playerNames = [
    'Александр', 'Мария', 'Дмитрий', 'Анна', 'Сергей',
    'Елена', 'Андрей', 'Ольга', 'Николай', 'Татьяна',
    'Владимир', 'Ирина', 'Алексей', 'Светлана', 'Михаил',
    'Наталья', 'Павел', 'Юлия', 'Игорь', 'Екатерина',
    'Роман', 'Марина', 'Валентин', 'Людмила', 'Константин'
]

const roles = ['Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Шериф', 'Мафия', 'Мафия', 'Дон']
const gameResults = ['city_win', 'mafia_win', 'draw']

// Основные функции генерации
export async function generateTestData(options = {}) {
    const {
        eventsCount = 3,
        tablesPerEvent = random.int(2, 4),
        gamesPerTable = random.int(3, 8),
        createUsers = true
    } = options

    try {
        console.log('🚀 Начинаем генерацию тестовых данных...')
        
        // 1. Создаем пользователей если нужно
        if (createUsers) {
            console.log('👥 Создаем тестовых пользователей...')
            await generateUsers()
        }

        // 2. Получаем существующих пользователей
        const usersResponse = await apiService.getUsers()
        const users = usersResponse.items || usersResponse || []
        
        if (users.length < 10) {
            throw new Error('Недостаточно пользователей для генерации игр (нужно минимум 10)')
        }

        // 3. Получаем типы мероприятий
        const eventTypes = await apiService.getEventTypes()
        if (!eventTypes || eventTypes.length === 0) {
            throw new Error('Нет доступных типов мероприятий')
        }

        // 4. Создаем мероприятия
        console.log(`🏆 Создаем ${eventsCount} мероприятий...`)
        const events = []
        
        for (let i = 0; i < eventsCount; i++) {
            const template = random.choice(eventTemplates)
            const eventType = random.choice(eventTypes)
            
            const eventData = {
                label: `${template.label} ${new Date().getFullYear()}`,
                description: template.description,
                start_date: i < 2 ? random.pastDate(60) : random.futureDate(30), // 2 прошедших, остальные будущие
                event_type_id: eventType.id,
                language: template.language,
                table_name_template: 'Стол {}'
            }

            const event = await apiService.createEvent(eventData)
            events.push(event)
            console.log(`  ✅ Создано мероприятие: ${event.label}`)

            // 5. Создаем игры для каждого мероприятия
            await generateGamesForEvent(event, users, tablesPerEvent, gamesPerTable)
        }

        console.log('🎉 Генерация тестовых данных завершена!')
        return {
            success: true,
            eventsCreated: events.length,
            message: `Создано ${events.length} мероприятий с играми`
        }

    } catch (error) {
        console.error('❌ Ошибка генерации тестовых данных:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

async function generateUsers() {
    try {
        // Проверяем существующих пользователей
        const existingUsers = await apiService.getUsers()
        const existing = existingUsers.items || existingUsers || []
        
        const usersToCreate = Math.max(0, 25 - existing.length) // Создаем до 25 пользователей
        
        if (usersToCreate === 0) {
            console.log('  ℹ️ Достаточно пользователей уже существует')
            return
        }

        for (let i = 0; i < usersToCreate; i++) {
            const name = random.choice(playerNames)
            const userData = {
                name: `${name} ${i + 1}`,
                nickname: `${name.toLowerCase()}${i + 1}`,
                telegram_id: 1000000 + i,
                telegram_username: `${name.toLowerCase()}${i + 1}`
            }

            try {
                await apiService.createUser(userData)
                console.log(`  ✅ Создан пользователь: ${userData.nickname}`)
            } catch (error) {
                console.log(`  ⚠️ Пользователь ${userData.nickname} уже существует`)
            }
        }
    } catch (error) {
        console.error('Ошибка создания пользователей:', error)
    }
}

async function generateGamesForEvent(event, users, tablesCount, gamesPerTable) {
    console.log(`  🎮 Создаем игры для мероприятия "${event.label}"...`)
    
    for (let tableNum = 1; tableNum <= tablesCount; tableNum++) {
        console.log(`    📋 Стол ${tableNum}...`)
        
        for (let gameNum = 1; gameNum <= gamesPerTable; gameNum++) {
            try {
                // Создаем игру
                const gameData = {
                    label: `Игра #${gameNum}`,
                    event_id: event.id,
                    table_id: tableNum
                }

                const game = await apiService.createGame(gameData)
                
                // Добавляем игроков
                await addPlayersToGame(game, users)
                
                // Завершаем игру с результатом
                await finishGame(game)
                
                console.log(`      ✅ Игра #${gameNum} создана и завершена`)
                
            } catch (error) {
                console.error(`      ❌ Ошибка создания игры #${gameNum}:`, error)
            }
        }
    }
}

async function addPlayersToGame(game, users) {
    // Выбираем 10 случайных игроков
    const selectedUsers = []
    const usersPool = [...users]
    
    for (let i = 0; i < 10 && usersPool.length > 0; i++) {
        const randomIndex = random.int(0, usersPool.length - 1)
        selectedUsers.push(usersPool.splice(randomIndex, 1)[0])
    }

    // Перемешиваем роли
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5)
    
    // Создаем данные игроков
    const playersData = selectedUsers.map((user, index) => ({
        user_id: user.id,
        name: user.nickname,
        role: shuffledRoles[index],
        position: index + 1,
        fouls: 0,
        points: random.int(0, 3) // Случайные очки
    }))

    await apiService.addPlayersToGame(game.id, playersData)
}

async function finishGame(game) {
    // Обновляем игру со случайным результатом
    const result = random.choice(gameResults)
    const startedAt = random.pastDate(30)
    const finishedAt = new Date(startedAt)
    finishedAt.setMinutes(finishedAt.getMinutes() + random.int(60, 120)) // Игра длится 1-2 часа

    const updateData = {
        result: result,
        started_at: startedAt,
        finished_at: finishedAt.toISOString(),
        is_finished: true
    }

    await apiService.updateGame(game.id, updateData)
}

// Экспорт для использования в компонентах
export default {
    generateTestData,
    generateUsers
}