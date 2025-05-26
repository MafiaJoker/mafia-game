import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../game'
import { GAME_SUBSTATUS, GAME_STATUSES } from '../../utils/constants'

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

describe('Game Status Management', () => {
  let gameStore

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
  })

  describe('setGameStatus метод', () => {
    it('должен устанавливать статус и подстатус игры', () => {
      // Устанавливаем статус
      gameStore.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION)
      
      expect(gameStore.gameState.gameStatus).toBe(GAME_STATUSES.IN_PROGRESS)
      expect(gameStore.gameState.gameSubstatus).toBe(GAME_SUBSTATUS.DISCUSSION)
    })

    it('должен устанавливать только статус если подстатус не указан', () => {
      // Сначала устанавливаем с подстатусом
      gameStore.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.VOTING)
      
      // Потом только статус
      gameStore.setGameStatus(GAME_STATUSES.FINISHED_NO_SCORES)
      
      expect(gameStore.gameState.gameStatus).toBe(GAME_STATUSES.FINISHED_NO_SCORES)
      expect(gameStore.gameState.gameSubstatus).toBe(null)
    })
  })

  describe('Критический раунд и статусы', () => {
    beforeEach(() => {
      // Инициализируем игру с 10 игроками
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
    })

    it('не должен быть критическим раундом с 10 игроками', () => {
      expect(gameStore.isCriticalRound).toBe(false)
    })

    it('должен быть критическим раундом с 4 игроками', () => {
      // Убираем 6 игроков
      for (let i = 1; i <= 6; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      expect(gameStore.isCriticalRound).toBe(true)
    })

    it('должен быть критическим раундом с 3 игроками', () => {
      // Убираем 7 игроков
      for (let i = 1; i <= 7; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      expect(gameStore.isCriticalRound).toBe(true)
    })

    it('не должен быть критическим раундом с 5 игроками', () => {
      // Убираем 5 игроков
      for (let i = 1; i <= 5; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      expect(gameStore.isCriticalRound).toBe(false)
    })

    it('не должен быть критическим раундом с 2 игроками', () => {
      // Убираем 8 игроков
      for (let i = 1; i <= 8; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      expect(gameStore.isCriticalRound).toBe(false)
    })
  })

  describe('Симуляция отмены голосования', () => {
    beforeEach(() => {
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
      
      gameStore.startGame()
    })

    it('должен вернуться к обычному обсуждению при отмене голосования', () => {
      // Переходим в голосование
      gameStore.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.VOTING)
      
      // Отменяем голосование (не критический раунд)
      const newSubstatus = gameStore.isCriticalRound 
        ? GAME_SUBSTATUS.CRITICAL_DISCUSSION 
        : GAME_SUBSTATUS.DISCUSSION
      
      gameStore.setGameStatus(gameStore.gameState.gameStatus, newSubstatus)
      
      expect(gameStore.gameState.gameSubstatus).toBe(GAME_SUBSTATUS.DISCUSSION)
    })

    it('должен вернуться к критическому обсуждению при отмене в критическом раунде', () => {
      // Убираем игроков до критического раунда
      for (let i = 1; i <= 6; i++) {
        gameStore.eliminatePlayerByVote(i)
      }
      
      // Переходим в голосование
      gameStore.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.VOTING)
      
      // Отменяем голосование (критический раунд)
      const newSubstatus = gameStore.isCriticalRound 
        ? GAME_SUBSTATUS.CRITICAL_DISCUSSION 
        : GAME_SUBSTATUS.DISCUSSION
      
      gameStore.setGameStatus(gameStore.gameState.gameStatus, newSubstatus)
      
      expect(gameStore.gameState.gameSubstatus).toBe(GAME_SUBSTATUS.CRITICAL_DISCUSSION)
    })
  })
})