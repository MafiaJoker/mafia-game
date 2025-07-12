import { faker } from '@faker-js/faker'
import { BaseSeeder } from './BaseSeeder.js'
import { SEED_CONFIG, getProfileConfig } from '@/config/seedConfig.js'

export class GameSeeder extends BaseSeeder {
    constructor(profile = 'minimal') {
        super()
        this.profile = getProfileConfig(profile)
        this.events = []
        this.players = []
    }
    
    // Генерация игрока для игры
    generatePlayer(seatNumber = 1) {
        const firstNames = SEED_CONFIG.users.firstNames
        const lastNames = SEED_CONFIG.users.lastNames
        
        const firstName = this.randomFromArray(firstNames)
        const lastName = this.randomFromArray(lastNames)
        
        return {
            seatNumber: seatNumber,
            nickname: `${firstName}_${lastName}`,
            realName: `${firstName} ${lastName}`,
            telegramUsername: '@' + firstName.toLowerCase() + '_' + lastName.toLowerCase(),
            isGuest: this.randomBoolean(),
            status: 'ALIVE'
        }
    }
    
    // Генерация полного состава игры (10 игроков)
    generateGamePlayers() {
        const players = []
        
        for (let i = 1; i <= 10; i++) {
            players.push(this.generatePlayer(i))
        }
        
        return players
    }
    
    // Генерация случайной игры
    generateGame(eventId) {
        const statuses = SEED_CONFIG.games.statuses
        const results = SEED_CONFIG.games.results
        const rounds = SEED_CONFIG.games.rounds
        
        const gameNames = [
            'Игра #1', 'Игра #2', 'Игра #3', 'Финальная игра',
            'Полуфинал', 'Четвертьфинал', 'Отборочная игра',
            'Игра на выбывание', 'Решающая игра', 'Стартовая игра'
        ]
        
        const status = this.randomFromArray(statuses)
        const gameData = {
            name: this.randomFromArray(gameNames),
            eventId: eventId,
            status: status,
            startTime: this.randomDate(new Date(2024, 0, 1), new Date()).toISOString(),
            judgeNotes: faker.lorem.paragraph(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        
        // Если игра завершена, добавляем результат и раунды
        if (status === 'finished') {
            gameData.result = this.randomFromArray(results)
            gameData.currentRound = this.randomFromArray(rounds)
            gameData.endTime = new Date(
                new Date(gameData.startTime).getTime() + this.randomInt(30, 180) * 60 * 1000
            ).toISOString()
        } else if (status === 'in_progress') {
            gameData.currentRound = this.randomFromArray(rounds.slice(0, -1)) // Не последний раунд
        }
        
        return gameData
    }
    
    // Генерация состояния игры
    generateGameState(gameId) {
        const roles = ['CIVILIAN', 'MAFIA', 'DON', 'SHERIFF']
        const players = []
        
        // Создаём 10 игроков с ролями
        for (let i = 1; i <= 10; i++) {
            let role = 'CIVILIAN'
            
            // Распределяем роли: 2 мафии, 1 дон, 1 шериф, остальные мирные
            if (i === 1) role = 'DON'
            else if (i <= 3) role = 'MAFIA'  
            else if (i === 4) role = 'SHERIFF'
            
            const player = {
                id: i,
                seatNumber: i,
                name: `Игрок ${i}`,
                role: role,
                originalRole: role,
                isAlive: this.randomBoolean() ? true : this.randomInt(1, 10) > 3, // 70% живых
                isEliminated: false,
                fouls: this.randomInt(0, 2),
                canSpeak: true,
                status: 'ALIVE'
            }
            
            if (!player.isAlive) {
                player.status = this.randomFromArray(['KILLED', 'VOTED_OUT', 'KICKED'])
            }
            
            players.push(player)
        }
        
        return {
            gameId: gameId,
            round: this.randomInt(1, 5),
            phase: this.randomFromArray(['DAY', 'NIGHT']),
            gameStatus: 'IN_PROGRESS',
            gameSubstatus: this.randomFromArray(['DISCUSSION', 'VOTING', 'MAFIA_KILL']),
            isGameStarted: true,
            players: players,
            nominatedPlayers: [],
            votingResults: {},
            shootoutPlayers: [],
            deadPlayers: players.filter(p => !p.isAlive).map(p => p.id),
            eliminatedPlayers: [],
            nightKill: null,
            bestMoveUsed: this.randomBoolean(),
            noCandidatesRounds: this.randomInt(0, 2),
            mafiaTarget: null,
            donTarget: null,
            sheriffTarget: null,
            bestMoveTargets: [],
            rolesVisible: false,
            scores: {},
            isCriticalRound: false,
            showBestMove: false
        }
    }
    
    // Получение списка мероприятий
    async loadEvents() {
        try {
            this.events = await this.apiCall('get', '/events')
            this.log(`Загружено ${this.events.length} мероприятий`)
        } catch (error) {
            this.log(`Ошибка загрузки мероприятий: ${error.message}`, 'error')
            throw error
        }
    }
    
    // Создание игр для мероприятий
    async seedGames() {
        if (this.events.length === 0) {
            this.log('Нет доступных мероприятий для создания игр', 'warn')
            return
        }
        
        this.log(`🎮 Создание игр для ${this.events.length} мероприятий...`)
        
        for (const event of this.events) {
            const gamesToCreate = Math.min(this.profile.gamesPerEvent, 5) // Максимум 5 игр на мероприятие
            
            this.log(`Создание ${gamesToCreate} игр для мероприятия "${event.name}"`)
            
            for (let i = 0; i < gamesToCreate; i++) {
                try {
                    const gameData = this.generateGame(event.id)
                    const createdGame = await this.apiCall('post', '/games', gameData)
                    
                    this.createdIds.add(`game-${createdGame.id}`)
                    this.log(`Создана игра: "${gameData.name}" (ID: ${createdGame.id})`, 'success')
                    
                    // Создаём игроков для игры
                    await this.seedGamePlayers(createdGame.id)
                    
                    // Сохраняем состояние игры
                    if (gameData.status !== 'not_started') {
                        await this.seedGameState(createdGame.id)
                    }
                    
                    // Пауза между играми
                    await this.delay(300)
                    
                } catch (error) {
                    this.log(`Ошибка создания игры для мероприятия ${event.id}: ${error.message}`, 'error')
                }
            }
        }
    }
    
    // Создание игроков для игры
    async seedGamePlayers(gameId) {
        try {
            const players = this.generateGamePlayers()
            
            await this.apiCall('post', `/games/${gameId}/players`, {
                players: players
            })
            
            this.log(`Добавлены игроки для игры ${gameId}`, 'success')
            
        } catch (error) {
            this.log(`Ошибка создания игроков для игры ${gameId}: ${error.message}`, 'error')
        }
    }
    
    // Создание состояния игры
    async seedGameState(gameId) {
        try {
            const gameState = this.generateGameState(gameId)
            
            // Пытаемся сохранить состояние через API состояний
            // Примечание: этот endpoint может не существовать в текущем API
            await this.apiCall('put', `/games/${gameId}/state`, gameState)
            
            this.log(`Сохранено состояние для игры ${gameId}`, 'success')
            
        } catch (error) {
            // Если endpoint не существует, это не критичная ошибка
            this.log(`Не удалось сохранить состояние игры ${gameId}: ${error.message}`, 'warn')
        }
    }
    
    // Главный метод для запуска seeding
    async seed() {
        await this.loadEvents()
        await this.seedGames()
    }
    
    // Очистка созданных игр
    async clean() {
        this.log('🧹 Очистка созданных игр...')
        
        try {
            const games = await this.apiCall('get', '/games')
            
            if (games && games.length > 0) {
                for (const game of games) {
                    try {
                        await this.apiCall('delete', `/games/${game.id}`)
                        this.log(`Удалена игра: "${game.name}" (ID: ${game.id})`, 'success')
                    } catch (error) {
                        this.log(`Ошибка удаления игры ${game.id}: ${error.message}`, 'error')
                    }
                }
            } else {
                this.log('Игры для удаления не найдены')
            }
            
        } catch (error) {
            this.log(`Ошибка при очистке игр: ${error.message}`, 'error')
        }
    }
    
    // Быстрое создание одной тестовой игры
    async createTestGame(eventId = null) {
        this.log('🎯 Создание тестовой игры...')
        
        try {
            // Если eventId не указан, используем первое доступное мероприятие
            if (!eventId) {
                await this.loadEvents()
                if (this.events.length === 0) {
                    throw new Error('Нет доступных мероприятий для создания игры')
                }
                eventId = this.events[0].id
            }
            
            const gameData = this.generateGame(eventId)
            const createdGame = await this.apiCall('post', '/games', gameData)
            
            this.log(`Создана тестовая игра: "${gameData.name}" (ID: ${createdGame.id})`, 'success')
            
            // Добавляем игроков
            await this.seedGamePlayers(createdGame.id)
            
            return createdGame
        } catch (error) {
            this.log(`Ошибка создания тестовой игры: ${error.message}`, 'error')
            throw error
        }
    }
}