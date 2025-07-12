import { faker } from '@faker-js/faker'
import { BaseSeeder } from './BaseSeeder.js'
import { SEED_CONFIG, getProfileConfig } from '@/config/seedConfig.js'

export class UserSeeder extends BaseSeeder {
    constructor(profile = 'minimal') {
        super()
        this.profile = getProfileConfig(profile)
    }
    
    // Генерация случайного пользователя
    generateUser() {
        const firstNames = SEED_CONFIG.users.firstNames
        const lastNames = SEED_CONFIG.users.lastNames
        const roles = SEED_CONFIG.users.roles
        
        const firstName = this.randomFromArray(firstNames)
        const lastName = this.randomFromArray(lastNames)
        const role = this.randomFromArray(roles)
        
        // Генерируем никнейм
        const nicknameVariants = [
            `${firstName}_${lastName}`,
            `${firstName}${this.randomInt(10, 99)}`,
            `${lastName}_${firstName}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
            `${firstName}_${this.randomInt(1980, 2005)}`
        ]
        
        const nickname = this.randomFromArray(nicknameVariants)
        
        // Генерируем телеграм username
        const telegramUsername = '@' + nickname.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        
        return {
            firstName: firstName,
            lastName: lastName,
            nickname: nickname,
            email: faker.internet.email(firstName, lastName, 'example.com').toLowerCase(),
            telegramId: this.randomInt(100000000, 999999999).toString(),
            telegramUsername: telegramUsername,
            phone: faker.phone.number('+7 (9##) ###-##-##'),
            role: role,
            isActive: this.randomBoolean() ? true : this.randomInt(1, 10) > 2, // 80% активных
            rating: this.randomInt(800, 2400), // ELO рейтинг для мафии
            gamesPlayed: this.randomInt(0, 500),
            gamesWon: this.randomInt(0, 250),
            winRate: null, // Будет вычислен автоматически
            preferredLanguage: this.randomFromArray(SEED_CONFIG.events.languages),
            location: faker.address.city(),
            birthDate: faker.date.between('1980-01-01', '2005-12-31').toISOString().split('T')[0],
            registrationDate: faker.date.between('2020-01-01', new Date()).toISOString(),
            lastLoginDate: faker.date.recent(30).toISOString(),
            bio: faker.lorem.sentence(),
            achievements: this.generateAchievements(),
            preferences: {
                notifications: {
                    email: this.randomBoolean(),
                    telegram: this.randomBoolean(),
                    push: this.randomBoolean()
                },
                privacy: {
                    showRealName: this.randomBoolean(),
                    showStats: this.randomBoolean(),
                    showLocation: this.randomBoolean()
                },
                gameSettings: {
                    autoReady: this.randomBoolean(),
                    soundEffects: this.randomBoolean(),
                    darkTheme: this.randomBoolean()
                }
            }
        }
    }
    
    // Генерация достижений пользователя
    generateAchievements() {
        const possibleAchievements = [
            'first_game', 'first_win', 'veteran', 'lucky', 'strategist',
            'survivor', 'detective', 'don_master', 'sheriff_ace', 'peaceful_winner',
            'tournament_winner', 'judge_novice', 'judge_expert', 'social_player'
        ]
        
        const achievementCount = this.randomInt(0, 5)
        const userAchievements = []
        
        for (let i = 0; i < achievementCount; i++) {
            const achievement = this.randomFromArray(possibleAchievements)
            if (!userAchievements.includes(achievement)) {
                userAchievements.push(achievement)
            }
        }
        
        return userAchievements
    }
    
    // Генерация профиля судьи
    generateJudgeProfile() {
        const judgeData = this.generateUser()
        
        // Модифицируем данные для судьи
        judgeData.role = 'judge'
        judgeData.rating = this.randomInt(1200, 2800) // Судьи обычно более опытные
        judgeData.gamesPlayed = this.randomInt(100, 1000)
        judgeData.isActive = true // Все судьи активны
        
        // Добавляем специфичные для судьи поля
        judgeData.judgeInfo = {
            experience: this.randomInt(1, 15), // Лет опыта
            gamesJudged: this.randomInt(50, 800),
            certification: this.randomFromArray(['novice', 'intermediate', 'expert', 'master']),
            specializations: this.randomFromArray([
                ['классическая мафия'],
                ['спортивная мафия'],
                ['турнирная мафия'],
                ['классическая мафия', 'спортивная мафия'],
                ['все виды']
            ]),
            languages: this.randomFromArray([
                ['ru'],
                ['en'],
                ['am'],
                ['ru', 'en'],
                ['ru', 'am'],
                ['ru', 'en', 'am']
            ]),
            availability: {
                weekdays: this.randomBoolean(),
                weekends: true,
                evenings: this.randomBoolean(),
                tournaments: this.randomBoolean()
            },
            contactPreference: this.randomFromArray(['telegram', 'email', 'phone'])
        }
        
        return judgeData
    }
    
    // Создание обычных пользователей
    async seedUsers() {
        this.log(`👥 Создание ${this.profile.users} пользователей...`)
        
        for (let i = 0; i < this.profile.users; i++) {
            try {
                const userData = this.generateUser()
                
                // Вычисляем winRate
                if (userData.gamesPlayed > 0) {
                    userData.winRate = Math.round((userData.gamesWon / userData.gamesPlayed) * 100)
                }
                
                const createdUser = await this.apiCall('post', '/users', userData)
                
                this.createdIds.add(`user-${createdUser.id}`)
                this.log(`Создан пользователь: "${userData.nickname}" (${userData.firstName} ${userData.lastName})`, 'success')
                
                // Пауза между запросами
                await this.delay(150)
                
            } catch (error) {
                this.log(`Ошибка создания пользователя: ${error.message}`, 'error')
            }
        }
    }
    
    // Создание судей
    async seedJudges() {
        const judgeCount = Math.max(2, Math.ceil(this.profile.users * 0.2)) // 20% от общего числа пользователей
        
        this.log(`⚖️ Создание ${judgeCount} судей...`)
        
        for (let i = 0; i < judgeCount; i++) {
            try {
                const judgeData = this.generateJudgeProfile()
                const createdJudge = await this.apiCall('post', '/users', judgeData)
                
                this.createdIds.add(`judge-${createdJudge.id}`)
                this.log(`Создан судья: "${judgeData.nickname}" (${judgeData.judgeInfo.certification})`, 'success')
                
                await this.delay(150)
                
            } catch (error) {
                this.log(`Ошибка создания судьи: ${error.message}`, 'error')
            }
        }
    }
    
    // Создание администраторов
    async seedAdmins() {
        this.log('👑 Создание администраторов...')
        
        const adminProfiles = [
            {
                firstName: 'Админ',
                lastName: 'Главный',
                nickname: 'admin',
                email: 'admin@jokermafia.am'
            },
            {
                firstName: 'Модератор',
                lastName: 'Системный',
                nickname: 'moderator',
                email: 'moderator@jokermafia.am'
            }
        ]
        
        for (const profile of adminProfiles) {
            try {
                const adminData = this.generateUser()
                
                // Переопределяем ключевые поля
                adminData.firstName = profile.firstName
                adminData.lastName = profile.lastName
                adminData.nickname = profile.nickname
                adminData.email = profile.email
                adminData.role = 'admin'
                adminData.isActive = true
                adminData.rating = 2500 // Высокий рейтинг
                adminData.gamesPlayed = this.randomInt(200, 1000)
                adminData.telegramUsername = '@' + profile.nickname
                
                const createdAdmin = await this.apiCall('post', '/users', adminData)
                
                this.createdIds.add(`admin-${createdAdmin.id}`)
                this.log(`Создан администратор: "${adminData.nickname}"`, 'success')
                
            } catch (error) {
                this.log(`Ошибка создания администратора: ${error.message}`, 'error')
            }
        }
    }
    
    // Главный метод для запуска seeding
    async seed() {
        await this.seedAdmins()
        await this.seedJudges()
        await this.seedUsers()
    }
    
    // Очистка созданных пользователей
    async clean() {
        this.log('🧹 Очистка созданных пользователей...')
        
        try {
            const users = await this.apiCall('get', '/users')
            
            if (users && users.length > 0) {
                for (const user of users) {
                    try {
                        // Не удаляем системных пользователей
                        if (user.email && (
                            user.email.includes('admin@') || 
                            user.email.includes('system@') ||
                            user.nickname === 'admin'
                        )) {
                            this.log(`Пропуск системного пользователя: ${user.nickname}`, 'warn')
                            continue
                        }
                        
                        await this.apiCall('delete', `/users/${user.id}`)
                        this.log(`Удалён пользователь: "${user.nickname}" (ID: ${user.id})`, 'success')
                        
                    } catch (error) {
                        this.log(`Ошибка удаления пользователя ${user.id}: ${error.message}`, 'error')
                    }
                }
            } else {
                this.log('Пользователи для удаления не найдены')
            }
            
        } catch (error) {
            this.log(`Ошибка при очистке пользователей: ${error.message}`, 'error')
        }
    }
    
    // Быстрое создание одного тестового пользователя
    async createTestUser(role = 'player') {
        this.log(`🎯 Создание тестового пользователя (${role})...`)
        
        try {
            let userData
            
            switch (role) {
                case 'judge':
                    userData = this.generateJudgeProfile()
                    break
                case 'admin':
                    userData = this.generateUser()
                    userData.role = 'admin'
                    userData.isActive = true
                    break
                default:
                    userData = this.generateUser()
                    userData.role = 'player'
            }
            
            const createdUser = await this.apiCall('post', '/users', userData)
            
            this.log(`Создан тестовый пользователь: "${userData.nickname}" (${role})`, 'success')
            
            return createdUser
        } catch (error) {
            this.log(`Ошибка создания тестового пользователя: ${error.message}`, 'error')
            throw error
        }
    }
}