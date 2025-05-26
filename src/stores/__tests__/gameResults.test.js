import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameResultsStore } from '../gameResults'
import { useGameStore } from '../game'
import { PLAYER_ROLES } from '@/utils/constants'

describe('GameResultsStore', () => {
  let resultsStore
  let gameStore

  beforeEach(() => {
    setActivePinia(createPinia())
    resultsStore = useGameResultsStore()
    gameStore = useGameStore()
  })

  describe('Условия победы', () => {
    describe('Победа города', () => {
      it('должен определять победу города когда вся мафия убита', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.MAFIA, isAlive: false, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.DON, isAlive: false, isEliminated: false }
        ]

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBe('city')
        expect(result.reason).toBe('all_mafia_eliminated')
      })

      it('должен определять победу города когда мафия удалена по фолам', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: true },
          { id: 4, originalRole: PLAYER_ROLES.DON, isAlive: true, isEliminated: true }
        ]

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBe('city')
        expect(result.reason).toBe('all_mafia_eliminated')
      })
    })

    describe('Победа мафии', () => {
      it('должен определять победу мафии когда мафии равно или больше мирных', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.DON, isAlive: true, isEliminated: false }
        ]

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBe('mafia')
        expect(result.reason).toBe('mafia_majority')
      })

      it('должен определять победу мафии когда мафии больше мирных', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: false, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.DON, isAlive: true, isEliminated: false },
          { id: 5, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: false, isEliminated: false }
        ]

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBe('mafia')
        expect(result.reason).toBe('mafia_majority')
      })

      it('не должен учитывать удалённых игроков для преимущества мафии', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
          { id: 5, originalRole: PLAYER_ROLES.DON, isAlive: true, isEliminated: true } // Удалён, не считается
        ]

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBeNull() // Игра продолжается, 3 мирных против 1 мафии
      })
    })

    describe('Ничья', () => {
      it('должен определять ничью после 3 раундов без кандидатов', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false }
        ]
        gameStore.gameState.noCandidatesRounds = 3

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBe('draw')
        expect(result.reason).toBe('no_candidates')
      })

      it('не должен определять ничью при менее чем 3 раундах без кандидатов', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false }
        ]
        gameStore.gameState.noCandidatesRounds = 2

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBeNull()
      })
    })

    describe('Игра продолжается', () => {
      it('должен возвращать null когда игра продолжается', () => {
        gameStore.gameState.players = [
          { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 2, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
          { id: 3, originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false },
          { id: 4, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false },
          { id: 5, originalRole: PLAYER_ROLES.DON, isAlive: false, isEliminated: false }
        ]
        gameStore.gameState.noCandidatesRounds = 0

        const result = resultsStore.checkWinConditions
        expect(result.winner).toBeNull()
        expect(result.reason).toBeNull()
      })
    })
  })

  describe('Подсчёт баллов', () => {
    beforeEach(() => {
      // Мокируем метод setPlayerScore
      gameStore.setPlayerScore = vi.fn()
      
      gameStore.gameState.players = [
        { id: 1, originalRole: PLAYER_ROLES.CIVILIAN },
        { id: 2, originalRole: PLAYER_ROLES.SHERIFF },
        { id: 3, originalRole: PLAYER_ROLES.MAFIA },
        { id: 4, originalRole: PLAYER_ROLES.DON }
      ]
    })

    it('должен устанавливать корректные баллы при победе города', () => {
      resultsStore.setBaseScores('city_win')

      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(1, 1, 0) // Мирный победил
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(2, 1, 0) // Шериф победил
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(3, 0, 0) // Мафия проиграла
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(4, 0, 0) // Дон проиграл
    })

    it('должен устанавливать корректные баллы при победе мафии', () => {
      resultsStore.setBaseScores('mafia_win')

      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(1, 0, 0) // Мирный проиграл
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(2, 0, 0) // Шериф проиграл
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(3, 1, 0) // Мафия победила
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(4, 1, 0) // Дон победил
    })

    it('должен устанавливать 0.5 балла при ничьей', () => {
      resultsStore.setBaseScores('draw')

      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(1, 0.5, 0)
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(2, 0.5, 0)
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(3, 0.5, 0)
      expect(gameStore.setPlayerScore).toHaveBeenCalledWith(4, 0.5, 0)
    })
  })

  describe('Граничные случаи', () => {
    it('должен обрабатывать пустой список игроков', () => {
      gameStore.gameState.players = []
      
      const result = resultsStore.checkWinConditions
      expect(result.winner).toBe('city') // Нет мафии = победа города
      expect(result.reason).toBe('all_mafia_eliminated')
    })

    it('должен обрабатывать всех удалённых игроков', () => {
      gameStore.gameState.players = [
        { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: true },
        { id: 2, originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: true }
      ]
      
      const result = resultsStore.checkWinConditions
      expect(result.winner).toBe('city') // Нет активной мафии = победа города
    })

    it('должен приоритизировать условия победы над ничьей', () => {
      gameStore.gameState.players = [
        { id: 1, originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false },
        { id: 2, originalRole: PLAYER_ROLES.MAFIA, isAlive: false, isEliminated: false }
      ]
      gameStore.gameState.noCandidatesRounds = 3
      
      const result = resultsStore.checkWinConditions
      expect(result.winner).toBe('city') // Победа города имеет приоритет над ничьей
      expect(result.reason).toBe('all_mafia_eliminated')
    })
  })
})