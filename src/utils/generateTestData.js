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
        return date.toISOString().split('T')[0] // Возвращаем только дату в формате YYYY-MM-DD
    },

    // Случайная дата в будущем
    futureDate: (daysFromNow = 30) => {
        const date = new Date()
        date.setDate(date.getDate() + random.int(1, daysFromNow))
        return date.toISOString().split('T')[0] // Возвращаем только дату в формате YYYY-MM-DD
    }
}

// Шаблоны данных
const eventTemplates = [
    {
        label: 'Весенний турнир',
        description: 'Традиционный весенний турнир по мафии',
        language: 'rus'
    },
    {
        label: 'Летний кубок',
        description: 'Открытый летний кубок для всех игроков',
        language: 'rus'
    },
    {
        label: 'Осенний чемпионат',
        description: 'Чемпионат города по мафии',
        language: 'rus'
    },
    {
        label: 'Зимняя лига',
        description: 'Зимняя лига профессиональных игроков',
        language: 'rus'
    },
    {
        label: 'Новогодний турнир',
        description: 'Праздничный новогодний турнир',
        language: 'rus'
    }
]

const playerNames = [
    'Александр', 'Мария', 'Дмитрий', 'Анна', 'Сергей',
    'Елена', 'Андрей', 'Ольга', 'Николай', 'Татьяна',
    'Владимир', 'Ирина', 'Алексей', 'Светлана', 'Михаил',
    'Наталья', 'Павел', 'Юлия', 'Игорь', 'Екатерина',
    'Роман', 'Марина', 'Валентин', 'Людмила', 'Константин'
]

const roles = ['civilian', 'civilian', 'civilian', 'civilian', 'civilian', 'civilian', 'sheriff', 'mafia', 'mafia', 'don']
const gameResults = ['mafia_win', 'civilians_win', 'draw']

// Создание базовых типов мероприятий
async function createDefaultEventTypes() {
    const defaultTypes = [
        {
            label: 'Турнир'
        },
        {
            label: 'Тренировка'
        },
        {
            label: 'Чемпионат'
        }
    ]
    
    const createdTypes = []
    for (const typeData of defaultTypes) {
        try {
            const eventType = await apiService.createEventType(typeData)
            createdTypes.push(eventType)
            console.log(`  ✅ Создан тип мероприятия: ${eventType.label}`)
        } catch (error) {
            console.log(`  ⚠️ Тип мероприятия ${typeData.label} уже существует`)
        }
    }
    
    // Получаем все типы мероприятий после создания
    const allEventTypes = await apiService.getEventTypes()
    console.log('Все типы мероприятий после создания:', allEventTypes)
    
    // Обрабатываем возможные структуры ответа API
    if (allEventTypes && allEventTypes.items) {
        return allEventTypes.items
    }
    
    return allEventTypes || []
}

// Основные функции генерации
async function generateTestData(options = {}) {
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

        // 3. Получаем или создаем типы мероприятий
        let eventTypes = await apiService.getEventTypes()
        console.log('Полученные типы мероприятий:', eventTypes)
        
        // Обрабатываем возможные структуры ответа API
        if (eventTypes && eventTypes.items) {
            eventTypes = eventTypes.items
        }
        
        if (!eventTypes || eventTypes.length === 0) {
            console.log('📝 Создаем базовые типы мероприятий...')
            eventTypes = await createDefaultEventTypes()
        }
        
        console.log('Финальные типы мероприятий:', eventTypes)
        
        if (!eventTypes || eventTypes.length === 0) {
            throw new Error('Не удалось получить или создать типы мероприятий')
        }

        // 4. Создаем мероприятия
        console.log(`🏆 Создаем ${eventsCount} мероприятий...`)
        const events = []
        
        for (let i = 0; i < eventsCount; i++) {
            const template = random.choice(eventTemplates)
            const eventType = random.choice(eventTypes)
            
            console.log(`Выбранный тип мероприятия для ${i+1}-го мероприятия:`, eventType)
            
            if (!eventType || !eventType.id) {
                throw new Error(`Недопустимый тип мероприятия: ${JSON.stringify(eventType)}`)
            }
            
            const eventData = {
                label: `${template.label} ${new Date().getFullYear()}`,
                description: template.description,
                start_date: random.futureDate(60), // Все даты в будущем
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
                const result = random.choice(gameResults)
                
                const gameData = {
                    label: `Игра #${gameNum}`,
                    event_id: event.id,
                    table_id: tableNum,
                    // Пытаемся установить результат сразу при создании
                    result: result,
                    started_at: new Date().toISOString(),
                    finished_at: new Date().toISOString()
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
    
    // Создаем данные игроков согласно GamePlayerAddSerializer
    const playersData = selectedUsers.map((user, index) => ({
        user_id: user.id,
        box_id: index + 1, // Позиция за столом (1-10)
        role: shuffledRoles[index]
    }))

    await apiService.addPlayersToGame(game.id, playersData)
}

async function finishGame(game) {
    // Если игра уже создана с результатом, то делать ничего не нужно
    console.log(`      ✅ Игра должна быть создана с результатом`)
}

// Экспорт функций
export { generateTestData, generateUsers }

// Экспорт по умолчанию для использования в компонентах
export default {
    generateTestData,
    generateUsers
}