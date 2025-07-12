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
        
        return {\n            gameId: gameId,\n            round: this.randomInt(1, 5),\n            phase: this.randomFromArray(['DAY', 'NIGHT']),\n            gameStatus: 'IN_PROGRESS',\n            gameSubstatus: this.randomFromArray(['DISCUSSION', 'VOTING', 'MAFIA_KILL']),\n            isGameStarted: true,\n            players: players,\n            nominatedPlayers: [],\n            votingResults: {},\n            shootoutPlayers: [],\n            deadPlayers: players.filter(p => !p.isAlive).map(p => p.id),\n            eliminatedPlayers: [],\n            nightKill: null,\n            bestMoveUsed: this.randomBoolean(),\n            noCandidatesRounds: this.randomInt(0, 2),\n            mafiaTarget: null,\n            donTarget: null,\n            sheriffTarget: null,\n            bestMoveTargets: [],\n            rolesVisible: false,\n            scores: {},\n            isCriticalRound: false,\n            showBestMove: false\n        }\n    }\n    \n    // Получение списка мероприятий\n    async loadEvents() {\n        try {\n            this.events = await this.apiCall('get', '/events')\n            this.log(`Загружено ${this.events.length} мероприятий`)\n        } catch (error) {\n            this.log(`Ошибка загрузки мероприятий: ${error.message}`, 'error')\n            throw error\n        }\n    }\n    \n    // Создание игр для мероприятий\n    async seedGames() {\n        if (this.events.length === 0) {\n            this.log('Нет доступных мероприятий для создания игр', 'warn')\n            return\n        }\n        \n        this.log(`🎮 Создание игр для ${this.events.length} мероприятий...`)\n        \n        for (const event of this.events) {\n            const gamesToCreate = Math.min(this.profile.gamesPerEvent, 5) // Максимум 5 игр на мероприятие\n            \n            this.log(`Создание ${gamesToCreate} игр для мероприятия "${event.name}"`)\n            \n            for (let i = 0; i < gamesToCreate; i++) {\n                try {\n                    const gameData = this.generateGame(event.id)\n                    const createdGame = await this.apiCall('post', '/games', gameData)\n                    \n                    this.createdIds.add(`game-${createdGame.id}`)\n                    this.log(`Создана игра: "${gameData.name}" (ID: ${createdGame.id})`, 'success')\n                    \n                    // Создаём игроков для игры\n                    await this.seedGamePlayers(createdGame.id)\n                    \n                    // Сохраняем состояние игры\n                    if (gameData.status !== 'not_started') {\n                        await this.seedGameState(createdGame.id)\n                    }\n                    \n                    // Пауза между играми\n                    await this.delay(300)\n                    \n                } catch (error) {\n                    this.log(`Ошибка создания игры для мероприятия ${event.id}: ${error.message}`, 'error')\n                }\n            }\n        }\n    }\n    \n    // Создание игроков для игры\n    async seedGamePlayers(gameId) {\n        try {\n            const players = this.generateGamePlayers()\n            \n            await this.apiCall('post', `/games/${gameId}/players`, {\n                players: players\n            })\n            \n            this.log(`Добавлены игроки для игры ${gameId}`, 'success')\n            \n        } catch (error) {\n            this.log(`Ошибка создания игроков для игры ${gameId}: ${error.message}`, 'error')\n        }\n    }\n    \n    // Создание состояния игры\n    async seedGameState(gameId) {\n        try {\n            const gameState = this.generateGameState(gameId)\n            \n            // Пытаемся сохранить состояние через API состояний\n            // Примечание: этот endpoint может не существовать в текущем API\n            await this.apiCall('put', `/games/${gameId}/state`, gameState)\n            \n            this.log(`Сохранено состояние для игры ${gameId}`, 'success')\n            \n        } catch (error) {\n            // Если endpoint не существует, это не критичная ошибка\n            this.log(`Не удалось сохранить состояние игры ${gameId}: ${error.message}`, 'warn')\n        }\n    }\n    \n    // Главный метод для запуска seeding\n    async seed() {\n        await this.loadEvents()\n        await this.seedGames()\n    }\n    \n    // Очистка созданных игр\n    async clean() {\n        this.log('🧹 Очистка созданных игр...')\n        \n        try {\n            const games = await this.apiCall('get', '/games')\n            \n            if (games && games.length > 0) {\n                for (const game of games) {\n                    try {\n                        await this.apiCall('delete', `/games/${game.id}`)\n                        this.log(`Удалена игра: "${game.name}" (ID: ${game.id})`, 'success')\n                    } catch (error) {\n                        this.log(`Ошибка удаления игры ${game.id}: ${error.message}`, 'error')\n                    }\n                }\n            } else {\n                this.log('Игры для удаления не найдены')\n            }\n            \n        } catch (error) {\n            this.log(`Ошибка при очистке игр: ${error.message}`, 'error')\n        }\n    }\n    \n    // Быстрое создание одной тестовой игры\n    async createTestGame(eventId = null) {\n        this.log('🎯 Создание тестовой игры...')\n        \n        try {\n            // Если eventId не указан, используем первое доступное мероприятие\n            if (!eventId) {\n                await this.loadEvents()\n                if (this.events.length === 0) {\n                    throw new Error('Нет доступных мероприятий для создания игры')\n                }\n                eventId = this.events[0].id\n            }\n            \n            const gameData = this.generateGame(eventId)\n            const createdGame = await this.apiCall('post', '/games', gameData)\n            \n            this.log(`Создана тестовая игра: "${gameData.name}" (ID: ${createdGame.id})`, 'success')\n            \n            // Добавляем игроков\n            await this.seedGamePlayers(createdGame.id)\n            \n            return createdGame\n        } catch (error) {\n            this.log(`Ошибка создания тестовой игры: ${error.message}`, 'error')\n            throw error\n        }\n    }\n}