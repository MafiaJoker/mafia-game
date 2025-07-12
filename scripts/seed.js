#!/usr/bin/env node

// Скрипт для запуска seeders из командной строки
import { seedAll, cleanAll, quickSeed, EventSeeder, GameSeeder, UserSeeder } from '../src/utils/seeders/index.js'

const args = process.argv.slice(2)
const command = args[0]
const profile = args[1] || 'minimal'

async function main() {
    console.log('🌱 Mafia Game Helper - Data Seeder')
    console.log('=====================================\\n')
    
    switch (command) {
        case 'all':
            console.log(`Запуск полного seeding с профилем: ${profile}`)
            await seedAll(profile)
            break
            
        case 'events':
            console.log(`Создание мероприятий с профилем: ${profile}`)
            const eventSeeder = new EventSeeder(profile)
            await eventSeeder.safeRun('seed')
            break
            
        case 'games':
            console.log(`Создание игр с профилем: ${profile}`)
            const gameSeeder = new GameSeeder(profile)
            await gameSeeder.safeRun('seed')
            break
            
        case 'users':
            console.log(`Создание пользователей с профилем: ${profile}`)
            const userSeeder = new UserSeeder(profile)
            await userSeeder.safeRun('seed')
            break
            
        case 'clean':
            console.log('Очистка всех данных')
            await cleanAll()
            break
            
        case 'quick':
            console.log('Быстрое создание тестовых данных')
            await quickSeed()
            break
            
        default:
            console.log('Использование:')
            console.log('  npm run seed all [profile]     - Создать все данные')
            console.log('  npm run seed events [profile]  - Создать мероприятия')
            console.log('  npm run seed games [profile]   - Создать игры')
            console.log('  npm run seed users [profile]   - Создать пользователей')
            console.log('  npm run seed clean             - Очистить все данные')
            console.log('  npm run seed quick             - Быстрое создание')
            console.log('')
            console.log('Доступные профили: minimal, full, stress')
            console.log('По умолчанию используется: minimal')
            process.exit(1)
    }
}

main().catch(error => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
})