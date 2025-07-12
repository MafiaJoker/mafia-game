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
    
    try {\n        // Очищаем в обратном порядке создания\n        \n        // 1. Очищаем игры\n        const gameSeeder = new GameSeeder()\n        const gameResult = await gameSeeder.safeRun('clean')\n        totalSuccess += gameSeeder.success.length\n        totalErrors += gameSeeder.errors.length\n        \n        // 2. Очищаем мероприятия\n        const eventSeeder = new EventSeeder()\n        const eventResult = await eventSeeder.safeRun('clean')\n        totalSuccess += eventSeeder.success.length\n        totalErrors += eventSeeder.errors.length\n        \n        // 3. Очищаем пользователей (осторожно с системными)\n        const userSeeder = new UserSeeder()\n        const userResult = await userSeeder.safeRun('clean')\n        totalSuccess += userSeeder.success.length\n        totalErrors += userSeeder.errors.length\n        \n        const duration = Date.now() - startTime\n        \n        console.log(`\\n🧽 Очистка завершена!`)\n        console.log(`⏱️ Время выполнения: ${duration}ms`)\n        console.log(`✅ Всего успешных операций: ${totalSuccess}`)\n        console.log(`❌ Всего ошибок: ${totalErrors}`)\n        \n        return {\n            success: totalErrors === 0,\n            duration,\n            totalSuccess,\n            totalErrors,\n            results: {\n                games: gameResult,\n                events: eventResult,\n                users: userResult\n            }\n        }\n        \n    } catch (error) {\n        console.error(`💥 Критическая ошибка при очистке: ${error.message}`)\n        return {\n            success: false,\n            error: error.message,\n            duration: Date.now() - startTime,\n            totalSuccess,\n            totalErrors: totalErrors + 1\n        }\n    }\n}\n\n// Быстрое создание минимального набора данных для разработки\nexport async function quickSeed() {\n    console.log('⚡ Быстрое создание тестовых данных...')\n    \n    try {\n        // Создаём одного тестового пользователя, мероприятие и игру\n        const userSeeder = new UserSeeder()\n        const testUser = await userSeeder.createTestUser('judge')\n        \n        const eventSeeder = new EventSeeder()\n        const testEvent = await eventSeeder.createTestEvent()\n        \n        const gameSeeder = new GameSeeder()\n        const testGame = await gameSeeder.createTestGame(testEvent.id)\n        \n        console.log('⚡ Быстрое создание завершено!')\n        console.log(`👤 Пользователь: ${testUser.nickname}`)\n        console.log(`📅 Мероприятие: ${testEvent.name}`)\n        console.log(`🎮 Игра: ${testGame.name}`)\n        \n        return {\n            success: true,\n            user: testUser,\n            event: testEvent,\n            game: testGame\n        }\n        \n    } catch (error) {\n        console.error(`💥 Ошибка быстрого создания: ${error.message}`)\n        return {\n            success: false,\n            error: error.message\n        }\n    }\n}