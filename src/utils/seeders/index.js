// Главный файл для всех seeders
import { EventSeeder } from './EventSeeder.js'
import { GameSeeder } from './GameSeeder.js'
import { UserSeeder } from './UserSeeder.js'

export { EventSeeder, GameSeeder, UserSeeder }

// Функция для запуска всех seeders
export async function seedAll(profile = 'minimal') {
    console.log(`🌱 Запуск полного seeding с профилем: ${profile}`)
    
    const startTime = Date.now()
    let totalSuccess = 0
    let totalErrors = 0
    
    try {
        // 1. Создаём пользователей (включая судей и админов)
        const userSeeder = new UserSeeder(profile)
        const userResult = await userSeeder.safeRun('seed')
        totalSuccess += userSeeder.success.length
        totalErrors += userSeeder.errors.length
        
        // 2. Создаём мероприятия
        const eventSeeder = new EventSeeder(profile)
        const eventResult = await eventSeeder.safeRun('seed')
        totalSuccess += eventSeeder.success.length
        totalErrors += eventSeeder.errors.length
        
        // 3. Создаём игры
        const gameSeeder = new GameSeeder(profile)
        const gameResult = await gameSeeder.safeRun('seed')
        totalSuccess += gameSeeder.success.length
        totalErrors += gameSeeder.errors.length
        
        const duration = Date.now() - startTime
        
        console.log(`\\n🎉 Seeding завершён!`)
        console.log(`⏱️ Время выполнения: ${duration}ms`)
        console.log(`✅ Всего успешных операций: ${totalSuccess}`)
        console.log(`❌ Всего ошибок: ${totalErrors}`)
        
        return {
            success: totalErrors === 0,
            duration,
            totalSuccess,
            totalErrors,
            results: {
                users: userResult,
                events: eventResult,
                games: gameResult
            }
        }
        
    } catch (error) {
        console.error(`💥 Критическая ошибка при seeding: ${error.message}`)
        return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            totalSuccess,
            totalErrors: totalErrors + 1
        }
    }
}

// Функция для очистки всех данных
export async function cleanAll() {
    console.log('🧹 Запуск полной очистки данных...')
    
    const startTime = Date.now()
    let totalSuccess = 0
    let totalErrors = 0
    
    try {
        // Очищаем в обратном порядке создания
        
        // 1. Очищаем игры
        const gameSeeder = new GameSeeder()
        const gameResult = await gameSeeder.safeRun('clean')
        totalSuccess += gameSeeder.success.length
        totalErrors += gameSeeder.errors.length
        
        // 2. Очищаем мероприятия
        const eventSeeder = new EventSeeder()
        const eventResult = await eventSeeder.safeRun('clean')
        totalSuccess += eventSeeder.success.length
        totalErrors += eventSeeder.errors.length
        
        // 3. Очищаем пользователей (осторожно с системными)
        const userSeeder = new UserSeeder()
        const userResult = await userSeeder.safeRun('clean')
        totalSuccess += userSeeder.success.length
        totalErrors += userSeeder.errors.length
        
        const duration = Date.now() - startTime
        
        console.log(`\n🧽 Очистка завершена!`)
        console.log(`⏱️ Время выполнения: ${duration}ms`)
        console.log(`✅ Всего успешных операций: ${totalSuccess}`)
        console.log(`❌ Всего ошибок: ${totalErrors}`)
        
        return {
            success: totalErrors === 0,
            duration,
            totalSuccess,
            totalErrors,
            results: {
                games: gameResult,
                events: eventResult,
                users: userResult
            }
        }
        
    } catch (error) {
        console.error(`💥 Критическая ошибка при очистке: ${error.message}`)
        return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            totalSuccess,
            totalErrors: totalErrors + 1
        }
    }
}

// Быстрое создание минимального набора данных для разработки
export async function quickSeed() {
    console.log('⚡ Быстрое создание тестовых данных...')
    
    try {
        // Создаём одного тестового пользователя, мероприятие и игру
        const userSeeder = new UserSeeder()
        const testUser = await userSeeder.createTestUser('judge')
        
        const eventSeeder = new EventSeeder()
        const testEvent = await eventSeeder.createTestEvent()
        
        const gameSeeder = new GameSeeder()
        const testGame = await gameSeeder.createTestGame(testEvent.id)
        
        console.log('⚡ Быстрое создание завершено!')
        console.log(`👤 Пользователь: ${testUser.nickname}`)
        console.log(`📅 Мероприятие: ${testEvent.name}`)
        console.log(`🎮 Игра: ${testGame.name}`)
        
        return {
            success: true,
            user: testUser,
            event: testEvent,
            game: testGame
        }
        
    } catch (error) {
        console.error(`💥 Ошибка быстрого создания: ${error.message}`)
        return {
            success: false,
            error: error.message
        }
    }
}