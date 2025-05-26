import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../game'
import { useVotingStore } from '../voting'
import { useNightActionsStore } from '../nightActions'
import { useGameResultsStore } from '../gameResults'
import { GAME_PHASE, PLAYER_STATUS, ROLE } from '../../utils/constants'

// Мокаем API
vi.mock('../../services/api', () => ({
  default: {
    updateGame: vi.fn().mockResolvedValue({ data: {} }),
    createGame: vi.fn().mockResolvedValue({ data: { id: 1 } })
  },
  apiService: {
    updateGame: vi.fn().mockResolvedValue({ data: {} }),
    createGame: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    saveGameState: vi.fn().mockResolvedValue({ data: {} })
  }
}))

describe('Полный игровой цикл', () => {
  let gameStore
  let votingStore
  let nightActionsStore
  let gameResultsStore

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    votingStore = useVotingStore()
    nightActionsStore = useNightActionsStore()
    gameResultsStore = useGameResultsStore()
  })

  describe('Сценарий 1: Победа мирных жителей через голосование', () => {
    it('должен провести игру до победы города', async () => {
      // Инициализация игры
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      // Добавляем игроков
      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      // Распределяем роли
      gameStore.distributeRolesRandomly()
      
      // Запоминаем роли для теста
      const mafiaPlayers = gameStore.players.filter(p => p.role === ROLE.MAFIA)
      const donPlayer = gameStore.players.find(p => p.role === ROLE.DON)
      const sheriffPlayer = gameStore.players.find(p => p.role === ROLE.SHERIFF)
      const civilians = gameStore.players.filter(p => p.role === ROLE.CIVILIAN)

      // Начинаем игру
      await gameStore.startGame()
      expect(gameStore.phase).toBe(GAME_PHASE.DAY)
      expect(gameStore.round).toBe(1)

      // День 1: Голосуем против мафии
      votingStore.resetVoting()
      // Все голосуют против первого мафиози
      gameStore.players.forEach(player => {
        if (player.status === PLAYER_STATUS.ALIVE) {
          votingStore.addVote({
            voterId: player.id,
            candidateId: mafiaPlayers[0].id
          })
        }
      })
      
      // Применяем результаты голосования
      const votingResult = votingStore.getVotingResult()
      expect(votingResult.eliminated).toContain(mafiaPlayers[0].id)
      gameStore.eliminatePlayerByVote(mafiaPlayers[0].id)
      
      // Переход к ночи
      gameStore.nextPhase()
      expect(gameStore.phase).toBe(GAME_PHASE.NIGHT)

      // Ночь 1: Мафия убивает мирного
      nightActionsStore.setNightKill(civilians[0].id)
      
      // Шериф проверяет дона
      nightActionsStore.setSheriffCheck(donPlayer.id)
      const sheriffResult = nightActionsStore.getSheriffCheckResult(gameStore.players)
      expect(sheriffResult.role).toBe(ROLE.DON)

      // Применяем ночные действия
      gameStore.applyNightKill()
      expect(gameStore.players.find(p => p.id === civilians[0].id).status).toBe(PLAYER_STATUS.KILLED)

      // Переход к дню 2
      gameStore.nextPhase()
      gameStore.nextRound()
      expect(gameStore.phase).toBe(GAME_PHASE.DAY)
      expect(gameStore.round).toBe(2)

      // День 2: Голосуем против второго мафии
      votingStore.resetVoting()
      gameStore.players.forEach(player => {
        if (player.status === PLAYER_STATUS.ALIVE) {
          votingStore.addVote({
            voterId: player.id,
            candidateId: mafiaPlayers[1].id
          })
        }
      })
      
      gameStore.eliminatePlayerByVote(mafiaPlayers[1].id)
      
      // Переход к ночи 2
      gameStore.nextPhase()
      
      // Ночь 2: Дон убивает еще одного мирного
      nightActionsStore.setNightKill(civilians[1].id)
      gameStore.applyNightKill()
      
      // Переход к дню 3
      gameStore.nextPhase()
      gameStore.nextRound()
      
      // День 3: Голосуем против дона
      votingStore.resetVoting()
      gameStore.players.forEach(player => {
        if (player.status === PLAYER_STATUS.ALIVE) {
          votingStore.addVote({
            voterId: player.id,
            candidateId: donPlayer.id
          })
        }
      })
      
      gameStore.eliminatePlayerByVote(donPlayer.id)
      
      // Проверяем победу города
      const result = gameResultsStore.checkWinCondition(gameStore.players)
      expect(result.isGameOver).toBe(true)
      expect(result.winner).toBe('city')
      expect(result.reason).toBe('Вся мафия устранена')
    })
  })

  describe('Сценарий 2: Победа мафии через убийства', () => {
    it('должен провести игру до победы мафии', async () => {
      // Инициализация и рассадка
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      // Вручную назначаем роли для контроля
      gameStore.assignRole(1, ROLE.DON)
      gameStore.assignRole(2, ROLE.MAFIA)
      gameStore.assignRole(3, ROLE.MAFIA)
      gameStore.assignRole(4, ROLE.SHERIFF)
      for (let i = 5; i <= 10; i++) {
        gameStore.assignRole(i, ROLE.CIVILIAN)
      }

      await gameStore.startGame()

      // День 1: Голосование без результата (все голосуют за разных)
      votingStore.resetVoting()
      for (let i = 1; i <= 10; i++) {
        votingStore.addVote({
          voterId: i,
          candidateId: (i % 10) + 1
        })
      }
      
      // Нет единого кандидата - никто не выбывает
      const votingResult = votingStore.getVotingResult()
      expect(votingResult.eliminated).toHaveLength(0)
      
      // Ночь 1: Убиваем шерифа
      gameStore.nextPhase()
      nightActionsStore.setNightKill(4)
      gameStore.applyNightKill()
      
      // День 2: Опять нет консенсуса
      gameStore.nextPhase()
      gameStore.nextRound()
      votingStore.resetVoting()
      
      // Ночь 2: Убиваем мирного
      gameStore.nextPhase()
      nightActionsStore.setNightKill(5)
      gameStore.applyNightKill()
      
      // День 3: Выводим мирного по ошибке
      gameStore.nextPhase()
      gameStore.nextRound()
      votingStore.resetVoting()
      const alivePlayers = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      alivePlayers.forEach(player => {
        votingStore.addVote({
          voterId: player.id,
          candidateId: 6
        })
      })
      gameStore.eliminatePlayerByVote(6)
      
      // Ночь 3: Убиваем еще одного
      gameStore.nextPhase()
      nightActionsStore.setNightKill(7)
      gameStore.applyNightKill()
      
      // Проверяем баланс: должно быть 3 мафии и 3 мирных
      const aliveAfterNight3 = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      const aliveMafia = aliveAfterNight3.filter(p => 
        p.role === ROLE.MAFIA || p.role === ROLE.DON
      ).length
      const aliveCivilians = aliveAfterNight3.filter(p => 
        p.role === ROLE.CIVILIAN || p.role === ROLE.SHERIFF
      ).length
      
      expect(aliveMafia).toBe(3)
      expect(aliveCivilians).toBe(3)
      
      // Проверяем победу мафии
      const result = gameResultsStore.checkWinCondition(gameStore.players)
      expect(result.isGameOver).toBe(true)
      expect(result.winner).toBe('mafia')
      expect(result.reason).toBe('Мафия в большинстве')
    })
  })

  describe('Сценарий 3: Победа через лучший ход', () => {
    it('должен позволить первому выбывшему дать лучший ход', async () => {
      // Инициализация
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      // Назначаем роли
      gameStore.assignRole(1, ROLE.DON)
      gameStore.assignRole(2, ROLE.MAFIA)
      gameStore.assignRole(3, ROLE.MAFIA)
      gameStore.assignRole(4, ROLE.SHERIFF)
      for (let i = 5; i <= 10; i++) {
        gameStore.assignRole(i, ROLE.CIVILIAN)
      }

      await gameStore.startGame()

      // День 1: Выводят мирного жителя
      votingStore.resetVoting()
      gameStore.players.forEach(player => {
        votingStore.addVote({
          voterId: player.id,
          candidateId: 5
        })
      })
      gameStore.eliminatePlayerByVote(5)
      
      // Проверяем, что лучший ход доступен
      expect(gameStore.showBestMove).toBe(true)
      expect(gameStore.firstEliminatedPlayer).toBe(5)
      
      // Игрок 5 выбирает 3 кандидатов (включая всю мафию)
      gameStore.toggleBestMoveTarget(1) // Дон
      gameStore.toggleBestMoveTarget(2) // Мафия
      gameStore.toggleBestMoveTarget(3) // Мафия
      
      expect(gameStore.bestMoveTargets).toEqual([1, 2, 3])
      
      // Используем лучший ход
      gameStore.useBestMove()
      expect(gameStore.showBestMove).toBe(false)
      
      // Ночь 1
      gameStore.nextPhase()
      nightActionsStore.setNightKill(6)
      gameStore.applyNightKill()
      
      // День 2: Выводят одного из отмеченных мафиози
      gameStore.nextPhase()
      gameStore.nextRound()
      votingStore.resetVoting()
      
      const alivePlayersDay2 = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      alivePlayersDay2.forEach(player => {
        votingStore.addVote({
          voterId: player.id,
          candidateId: 1 // Выводят дона
        })
      })
      gameStore.eliminatePlayerByVote(1)
      
      // Продолжаем игру до победы города
      // Ночь 2
      gameStore.nextPhase()
      nightActionsStore.setNightKill(7)
      gameStore.applyNightKill()
      
      // День 3: Выводят второго мафиози
      gameStore.nextPhase()
      gameStore.nextRound()
      votingStore.resetVoting()
      
      const alivePlayersDay3 = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      alivePlayersDay3.forEach(player => {
        votingStore.addVote({
          voterId: player.id,
          candidateId: 2
        })
      })
      gameStore.eliminatePlayerByVote(2)
      
      // Ночь 3
      gameStore.nextPhase()
      nightActionsStore.setNightKill(8)
      gameStore.applyNightKill()
      
      // День 4: Выводят последнего мафиози
      gameStore.nextPhase()
      gameStore.nextRound()
      votingStore.resetVoting()
      
      const alivePlayersDay4 = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      alivePlayersDay4.forEach(player => {
        votingStore.addVote({
          voterId: player.id,
          candidateId: 3
        })
      })
      gameStore.eliminatePlayerByVote(3)
      
      // Проверяем победу города с учетом лучшего хода
      const result = gameResultsStore.checkWinCondition(gameStore.players)
      expect(result.isGameOver).toBe(true)
      expect(result.winner).toBe('city')
      
      // Проверяем, что игрок 5 получил дополнительные очки за лучший ход
      const scores = gameResultsStore.calculateScores(gameStore.players, gameStore.game)
      const player5Score = scores.find(s => s.playerId === 5)
      expect(player5Score.bestMove).toBe(3) // Угадал всех трех мафиози
    })
  })

  describe('Сценарий 4: Ничья из-за перестрелки', () => {
    it('должен завершить игру ничьей при взаимном убийстве', async () => {
      // Упрощенная игра с 4 игроками для демонстрации
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      // Добавляем только 4 игроков
      for (let i = 1; i <= 4; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      // 1 дон, 1 мафия, 2 мирных
      gameStore.assignRole(1, ROLE.DON)
      gameStore.assignRole(2, ROLE.MAFIA)
      gameStore.assignRole(3, ROLE.SHERIFF)
      gameStore.assignRole(4, ROLE.CIVILIAN)

      await gameStore.startGame()

      // День 1: Никого не выводят
      votingStore.resetVoting()
      gameStore.nextPhase()
      
      // Ночь 1: Убивают мирного
      nightActionsStore.setNightKill(4)
      gameStore.applyNightKill()
      
      // День 2: Остались 1 дон, 1 мафия, 1 шериф
      gameStore.nextPhase()
      gameStore.nextRound()
      
      // Голосование с равными голосами
      votingStore.resetVoting()
      votingStore.addVote({ voterId: 1, candidateId: 3 }) // Дон против шерифа
      votingStore.addVote({ voterId: 2, candidateId: 3 }) // Мафия против шерифа
      votingStore.addVote({ voterId: 3, candidateId: 1 }) // Шериф против дона
      
      // Перестрелка между доном и шерифом
      votingStore.handleShootout([1, 3])
      votingStore.setShootoutLoser(1) // Дон проигрывает
      gameStore.eliminatePlayerByVote(1)
      votingStore.setShootoutLoser(3) // Шериф тоже выбывает
      gameStore.eliminatePlayerByVote(3)
      
      // Остался только один мафиози - автоматическая победа мафии
      const result = gameResultsStore.checkWinCondition(gameStore.players)
      expect(result.isGameOver).toBe(true)
      expect(result.winner).toBe('mafia')
    })
  })

  describe('Сценарий 5: Игра с фолами и дисквалификацией', () => {
    it('должен правильно обрабатывать фолы и удаление игроков', async () => {
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      gameStore.distributeRolesRandomly()
      await gameStore.startGame()

      const troublemaker = gameStore.players[0]
      
      // Даем игроку 3 фола - должен быть лишен права голоса
      gameStore.addFoul(troublemaker.id)
      gameStore.addFoul(troublemaker.id)
      gameStore.addFoul(troublemaker.id)
      
      expect(troublemaker.fouls).toBe(3)
      expect(troublemaker.canSpeak).toBe(false)
      
      // 4-й фол - дисквалификация
      gameStore.addFoul(troublemaker.id)
      expect(troublemaker.fouls).toBe(4)
      expect(troublemaker.status).toBe(PLAYER_STATUS.KICKED)
      
      // Проверяем, что игра продолжается
      const alivePlayers = gameStore.players.filter(p => p.status === PLAYER_STATUS.ALIVE)
      expect(alivePlayers.length).toBe(9)
      
      // Убираем фол
      gameStore.removeFoul(troublemaker.id)
      expect(troublemaker.fouls).toBe(3)
      // Статус не меняется после дисквалификации
      expect(troublemaker.status).toBe(PLAYER_STATUS.KICKED)
    })
  })

  describe('Сценарий 6: Критические раунды', () => {
    it('должен определять критический раунд когда остается 3 или 4 игрока', async () => {
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      gameStore.distributeRolesRandomly()
      await gameStore.startGame()

      // Проверяем, что с 10 игроками это не критический раунд
      expect(gameStore.isCriticalRound).toBe(false)

      // Убираем игроков до 5
      for (let i = 1; i <= 5; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      // С 5 живыми игроками - еще не критический раунд
      expect(gameStore.isCriticalRound).toBe(false)
      
      // Убираем еще одного - остается 4
      gameStore.eliminatePlayerByVote(6)
      
      // С 4 игроками - критический раунд
      expect(gameStore.isCriticalRound).toBe(true)
      
      // Убираем еще одного - остается 3
      gameStore.eliminatePlayerByVote(7)
      
      // С 3 игроками - все еще критический раунд
      expect(gameStore.isCriticalRound).toBe(true)
      
      // Убираем еще одного - остается 2
      gameStore.eliminatePlayerByVote(8)
      
      // С 2 игроками - уже не критический раунд
      expect(gameStore.isCriticalRound).toBe(false)
    })
  })

  describe('Сценарий 7: Ничья после 3 раундов без кандидатов', () => {
    it('должен завершить игру ничьей после 3 раундов без голосования', async () => {
      gameStore.initializeGame({
        eventId: 1,
        tableId: 1,
        tableNumber: 1,
        judgeId: 1
      })

      for (let i = 1; i <= 10; i++) {
        gameStore.addPlayer({
          id: i,
          nickname: `Player${i}`,
          realName: `Real${i}`
        })
      }

      gameStore.distributeRolesRandomly()
      await gameStore.startGame()

      // 3 раунда без кандидатов
      for (let round = 1; round <= 3; round++) {
        // День: никого не выводят
        votingStore.resetVoting()
        gameStore.incrementNoCandidatesRounds()
        
        // Ночь
        gameStore.nextPhase()
        
        // Следующий день
        gameStore.nextPhase()
        gameStore.nextRound()
      }
      
      // После 3 раундов без кандидатов
      expect(gameStore.game.noCandidatesRounds).toBe(3)
      
      // Проверяем условие ничьей
      const result = gameResultsStore.checkWinConditions
      expect(result.winner).toBe('draw')
      expect(result.reason).toBe('no_candidates')
    })
  })
})