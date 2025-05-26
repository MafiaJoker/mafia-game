import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../game'
import { PLAYER_ROLES, GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'

// Мокируем API сервис
vi.mock('@/services/api.js', () => ({
  apiService: {
    updateGame: vi.fn(),
    saveGameState: vi.fn()
  }
}))

describe('GameStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameStore()
  })

  describe('Начальное состояние', () => {
    it('должен иметь корректное начальное состояние', () => {
      expect(store.gameState.round).toBe(0)
      expect(store.gameState.gameStatus).toBe(GAME_STATUSES.CREATED)
      expect(store.gameState.isGameStarted).toBe(false)
      expect(store.gameState.players).toEqual([])
      expect(store.gameState.nominatedPlayers).toEqual([])
      expect(store.gameState.deadPlayers).toEqual([])
      expect(store.gameState.bestMoveUsed).toBe(false)
    })
  })

  describe('Управление игроками', () => {
    const createTestPlayers = () => [
      { id: 1, name: 'Player 1', role: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
      { id: 2, name: 'Player 2', role: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
      { id: 3, name: 'Player 3', role: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
      { id: 4, name: 'Player 4', role: PLAYER_ROLES.DON, isAlive: true, isEliminated: false },
      { id: 5, name: 'Player 5', role: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
      { id: 6, name: 'Player 6', role: PLAYER_ROLES.CIVILIAN, isAlive: false, isEliminated: false },
      { id: 7, name: 'Player 7', role: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: true }
    ]

    it('должен получать текущего игрока по id', () => {
      store.gameState.players = createTestPlayers()
      const player = store.currentPlayer(2)
      expect(player.name).toBe('Player 2')
      expect(player.role).toBe(PLAYER_ROLES.MAFIA)
    })

    it('должен возвращать undefined для несуществующего игрока', () => {
      store.gameState.players = createTestPlayers()
      const player = store.currentPlayer(999)
      expect(player).toBeUndefined()
    })

    it('должен корректно фильтровать живых игроков', () => {
      store.gameState.players = createTestPlayers()
      const alive = store.alivePlayers
      // Живые игроки: 1, 2, 3, 4, 5 (не 6 - мёртв, не 7 - удалён)
      expect(alive).toHaveLength(5)
      expect(alive.every(p => p.isAlive && !p.isEliminated)).toBe(true)
    })
  })

  describe('Распределение ролей', () => {
    it('должен определять статус распределения ролей', () => {
      store.gameState.gameStatus = GAME_STATUSES.ROLE_DISTRIBUTION
      expect(store.isInRoleDistribution).toBe(true)
      
      store.gameState.gameStatus = GAME_STATUSES.IN_PROGRESS
      expect(store.isInRoleDistribution).toBe(false)
    })

    it('должен проверять возможность начала игры с корректными ролями', () => {
      // Некорректная расстановка - не хватает ролей
      store.gameState.players = [
        { id: 1, role: PLAYER_ROLES.CIVILIAN },
        { id: 2, role: PLAYER_ROLES.MAFIA }
      ]
      expect(store.canStartGame).toBe(false)

      // Корректная расстановка - 2 мафии, 1 дон, 1 шериф
      store.gameState.players = [
        { id: 1, role: PLAYER_ROLES.CIVILIAN },
        { id: 2, role: PLAYER_ROLES.MAFIA },
        { id: 3, role: PLAYER_ROLES.MAFIA },
        { id: 4, role: PLAYER_ROLES.DON },
        { id: 5, role: PLAYER_ROLES.SHERIFF },
        { id: 6, role: PLAYER_ROLES.CIVILIAN }
      ]
      expect(store.canStartGame).toBe(true)

      // Некорректная расстановка - слишком много мафии
      store.gameState.players.push({ id: 7, role: PLAYER_ROLES.MAFIA })
      expect(store.canStartGame).toBe(false)
    })

    it('должен корректно назначать роли', () => {
      const players = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        role: null
      }))
      store.gameState.players = players
      store.assignRole(1, PLAYER_ROLES.DON)
      store.assignRole(2, PLAYER_ROLES.SHERIFF)
      store.assignRole(3, PLAYER_ROLES.MAFIA)
      store.assignRole(4, PLAYER_ROLES.MAFIA)

      expect(store.gameState.players[0].role).toBe(PLAYER_ROLES.DON)
      expect(store.gameState.players[1].role).toBe(PLAYER_ROLES.SHERIFF)
      expect(store.gameState.players[2].role).toBe(PLAYER_ROLES.MAFIA)
      expect(store.gameState.players[3].role).toBe(PLAYER_ROLES.MAFIA)
    })

    it('должен случайно распределять роли', () => {
      const players = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        isAlive: true,
        isEliminated: false,
        fouls: 0,
        role: null,
        originalRole: null
      }))
      store.gameState.players = players
      store.distributeRolesRandomly()

      // Проверяем количество ролей
      const roles = store.gameState.players.map(p => p.role)
      expect(roles.filter(r => r === PLAYER_ROLES.CIVILIAN).length).toBe(6)
      expect(roles.filter(r => r === PLAYER_ROLES.MAFIA).length).toBe(2)
      expect(roles.filter(r => r === PLAYER_ROLES.DON).length).toBe(1)
      expect(roles.filter(r => r === PLAYER_ROLES.SHERIFF).length).toBe(1)

      // Проверяем, что originalRole установлен
      store.gameState.players.forEach(player => {
        expect(player.originalRole).toBe(player.role)
      })
    })
  })

  describe('Игровой процесс', () => {
    it('должен определять, что игра в процессе', () => {
      store.gameState.gameStatus = GAME_STATUSES.IN_PROGRESS
      expect(store.isGameInProgress).toBe(true)
      
      store.gameState.gameStatus = GAME_STATUSES.CREATED
      expect(store.isGameInProgress).toBe(false)
    })

    it('должен корректно запускать игру', async () => {
      store.gameInfo = { eventId: 1, tableId: 1, gameId: 1 }
      await store.startGame()

      expect(store.gameState.gameStatus).toBe(GAME_STATUSES.IN_PROGRESS)
      expect(store.gameState.gameSubstatus).toBe(GAME_SUBSTATUS.DISCUSSION)
      expect(store.gameState.isGameStarted).toBe(true)
      expect(store.gameState.round).toBe(1)
    })

    it('должен обрабатывать переход между раундами', () => {
      store.gameState.round = 2
      store.nextRound()
      expect(store.gameState.round).toBe(3)
      expect(store.gameState.gameSubstatus).toBe(GAME_SUBSTATUS.DISCUSSION)
    })

    it('должен отслеживать раунды без кандидатов', () => {
      store.gameState.noCandidatesRounds = 2
      store.incrementNoCandidatesRounds()
      expect(store.gameState.noCandidatesRounds).toBe(3)
      // Критический раунд теперь зависит от количества игроков, а не от раундов без кандидатов
      // Добавим игроков для проверки
      store.initializeGame({ eventId: 1, tableId: 1 })
      for (let i = 1; i <= 4; i++) {
        store.addPlayer({ id: i, nickname: `Player${i}` })
      }
      // С 4 игроками должен быть критический раунд
      expect(store.isCriticalRound).toBe(true)
    })
  })

  describe('Удаление игроков', () => {
    beforeEach(() => {
      store.gameState.players = [
        { id: 1, name: 'Player 1', role: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false, fouls: 0 },
        { id: 2, name: 'Player 2', role: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false, fouls: 2 }
      ]
    })

    it('должен удалять игрока по результатам голосования', () => {
      store.eliminatePlayerByVote(1)
      const player = store.gameState.players[0]
      expect(player.isAlive).toBe(false)
      expect(store.gameState.deadPlayers).toContain(1)
    })

    it('должен удалять игрока по фолам', () => {
      store.addFoul(2) // 3-й фол
      store.addFoul(2) // 4-й фол - удаление
      const player = store.gameState.players[1]
      expect(player.isEliminated).toBe(true)
      expect(player.fouls).toBe(4)
      expect(store.gameState.eliminatedPlayers).toContain(2)
    })

    it('должен обрабатывать ночное убийство', () => {
      store.setNightKill(1)
      expect(store.gameState.nightKill).toBe(1)
      
      store.applyNightKill()
      const player = store.gameState.players[0]
      expect(player.isAlive).toBe(false)
      expect(store.gameState.deadPlayers).toContain(1)
      expect(store.gameState.nightKill).toBeNull()
    })
  })

  describe('Лучший ход', () => {
    it('должен переключать цель лучшего хода', () => {
      store.toggleBestMoveTarget(3)
      expect(store.gameState.bestMoveTargets.has(3)).toBe(true)
      
      // Повторное переключение убирает цель
      store.toggleBestMoveTarget(3)
      expect(store.gameState.bestMoveTargets.has(3)).toBe(false)
    })

    it('должен использовать лучший ход', () => {
      store.gameState.bestMoveTargets.add(2)
      store.gameState.bestMoveTargets.add(4)
      store.useBestMove()
      
      expect(store.gameState.bestMoveUsed).toBe(true)
      // Цели сохраняются для истории
      expect(store.gameState.bestMoveTargets.size).toBe(2)
    })
  })

  describe('Завершение игры', () => {
    beforeEach(() => {
      store.gameInfo = { eventId: 1, tableId: 1, gameId: 1 }
      store.gameState.players = [
        { id: 1, role: PLAYER_ROLES.CIVILIAN, originalRole: PLAYER_ROLES.CIVILIAN },
        { id: 2, role: PLAYER_ROLES.SHERIFF, originalRole: PLAYER_ROLES.SHERIFF },
        { id: 3, role: PLAYER_ROLES.MAFIA, originalRole: PLAYER_ROLES.MAFIA },
        { id: 4, role: PLAYER_ROLES.DON, originalRole: PLAYER_ROLES.DON }
      ]
    })

    it('должен завершать игру победой города', async () => {
      await store.finishGame('city_win')
      
      expect(store.gameState.gameStatus).toBe(GAME_STATUSES.FINISHED_NO_SCORES)
      expect(store.gameState.isGameStarted).toBe(false)
      
      // Проверяем баллы
      expect(store.gameState.scores[1]).toBe(1) // Мирный победил
      expect(store.gameState.scores[2]).toBe(1) // Шериф победил
      expect(store.gameState.scores[3]).toBe(0) // Мафия проиграла
      expect(store.gameState.scores[4]).toBe(0) // Дон проиграл
    })

    it('должен завершать игру победой мафии', async () => {
      await store.finishGame('mafia_win')
      
      expect(store.gameState.scores[1]).toBe(0) // Мирный проиграл
      expect(store.gameState.scores[2]).toBe(0) // Шериф проиграл
      expect(store.gameState.scores[3]).toBe(1) // Мафия победила
      expect(store.gameState.scores[4]).toBe(1) // Дон победил
    })

    it('должен завершать игру ничьей', async () => {
      await store.finishGame('draw')
      
      // При ничьей все получают по 0.5 балла
      expect(store.gameState.scores[1]).toBe(0.5)
      expect(store.gameState.scores[2]).toBe(0.5)
      expect(store.gameState.scores[3]).toBe(0.5)
      expect(store.gameState.scores[4]).toBe(0.5)
    })
  })

  describe('Система фолов', () => {
    beforeEach(() => {
      store.gameState.players = [
        { id: 1, name: 'Player 1', fouls: 0, isEliminated: false }
      ]
    })

    it('должен корректно добавлять фолы', () => {
      store.addFoul(1)
      expect(store.gameState.players[0].fouls).toBe(1)
      
      store.addFoul(1)
      expect(store.gameState.players[0].fouls).toBe(2)
    })

    it('должен удалять игрока после 4 фолов', () => {
      store.addFoul(1)
      store.addFoul(1)
      store.addFoul(1)
      // После 3 фолов игрок ещё в игре
      expect(store.gameState.players[0].isEliminated).toBe(false)
      
      store.addFoul(1) // 4-й фол - удаление
      expect(store.gameState.players[0].isEliminated).toBe(true)
      expect(store.gameState.eliminatedPlayers).toContain(1)
    })

    it('должен убирать фолы', () => {
      store.gameState.players[0].fouls = 3
      store.removeFoul(1)
      expect(store.gameState.players[0].fouls).toBe(2)
      
      // Не должен уходить ниже 0
      store.removeFoul(1)
      store.removeFoul(1)
      store.removeFoul(1)
      expect(store.gameState.players[0].fouls).toBe(0)
    })
  })
})
