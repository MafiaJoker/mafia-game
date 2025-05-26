import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVotingStore } from '../voting'
import { useGameStore } from '../game'
import { GAME_STATUSES, GAME_SUBSTATUS, PLAYER_ROLES } from '@/utils/constants'

describe('VotingStore', () => {
  let votingStore
  let gameStore

  beforeEach(() => {
    setActivePinia(createPinia())
    votingStore = useVotingStore()
    gameStore = useGameStore()
    
    // Мокируем методы gameStore
    gameStore.setGameStatus = vi.fn()
    gameStore.eliminatePlayer = vi.fn()
    gameStore.eliminatePlayerByVote = vi.fn()
    
    // Настраиваем тестовых игроков
    gameStore.gameState.players = [
      { id: 1, name: 'Player 1', isAlive: true, isEliminated: false },
      { id: 2, name: 'Player 2', isAlive: true, isEliminated: false },
      { id: 3, name: 'Player 3', isAlive: true, isEliminated: false },
      { id: 4, name: 'Player 4', isAlive: true, isEliminated: false },
      { id: 5, name: 'Player 5', isAlive: true, isEliminated: false },
      { id: 6, name: 'Player 6', isAlive: false, isEliminated: false }
    ]
  })

  describe('Начало голосования', () => {
    it('должен начинать голосование когда есть номинированные игроки', () => {
      gameStore.gameState.nominatedPlayers = [1, 2]
      gameStore.gameState.gameStatus = GAME_STATUSES.IN_PROGRESS
      
      const result = votingStore.startVoting()
      
      expect(result).toBe(true)
      expect(gameStore.setGameStatus).toHaveBeenCalledWith(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.VOTING)
      expect(gameStore.gameState.votingResults).toEqual({})
    })

    it('не должен начинать голосование без номинированных игроков', () => {
      gameStore.gameState.nominatedPlayers = []
      
      const result = votingStore.startVoting()
      
      expect(result).toBe(false)
      expect(gameStore.setGameStatus).not.toHaveBeenCalled()
    })
  })

  describe('Регистрация голосов', () => {
    it('должен регистрировать голоса за игрока', () => {
      votingStore.registerVotes(1, 3)
      expect(gameStore.gameState.votingResults[1]).toBe(3)
      
      votingStore.registerVotes(2, 5)
      expect(gameStore.gameState.votingResults[2]).toBe(5)
    })

    it('должен удалять игрока из результатов когда голосов 0', () => {
      gameStore.gameState.votingResults = { 1: 3, 2: 5 }
      
      votingStore.registerVotes(1, 0)
      
      expect(gameStore.gameState.votingResults[1]).toBeUndefined()
      expect(gameStore.gameState.votingResults[2]).toBe(5)
    })

    it('должен обновлять существующие голоса', () => {
      votingStore.registerVotes(1, 3)
      expect(gameStore.gameState.votingResults[1]).toBe(3)
      
      votingStore.registerVotes(1, 4)
      expect(gameStore.gameState.votingResults[1]).toBe(4)
    })
  })

  describe('Подтверждение голосования', () => {
    describe('Удаление одного игрока', () => {
      it('должен удалять игрока с наибольшим количеством голосов', () => {
        gameStore.gameState.votingResults = { 1: 5, 2: 3, 3: 2 }
        
        const result = votingStore.confirmVoting()
        
        expect(result).toEqual({ result: 'eliminated', players: [1] })
        expect(gameStore.eliminatePlayerByVote).toHaveBeenCalledWith(1)
        expect(gameStore.gameState.noCandidatesRounds).toBe(0)
        expect(gameStore.gameState.votingResults).toEqual({})
        expect(gameStore.gameState.nominatedPlayers).toEqual([])
        expect(gameStore.gameState.shootoutPlayers).toEqual([])
      })
    })

    describe('Сценарии перестрелки', () => {
      it('должен инициировать перестрелку когда несколько игроков имеют максимум голосов', () => {
        gameStore.gameState.votingResults = { 1: 4, 2: 4, 3: 2 }
        gameStore.gameState.shootoutPlayers = []
        
        const result = votingStore.confirmVoting()
        
        expect(result).toEqual({ result: 'shootout', players: [1, 2] })
        expect(gameStore.gameState.shootoutPlayers).toEqual([1, 2])
        expect(gameStore.gameState.nominatedPlayers).toEqual([1, 2])
        expect(gameStore.gameState.votingResults).toEqual({})
        expect(gameStore.eliminatePlayerByVote).not.toHaveBeenCalled()
      })

      it('должен обрабатывать повторную перестрелку с теми же игроками', () => {
        gameStore.gameState.votingResults = { 1: 3, 2: 3 }
        gameStore.gameState.shootoutPlayers = [1, 2]
        
        const result = votingStore.confirmVoting()
        
        // Когда игроки перестрелки те же, проверяем слишком много игроков
        expect(result.result).toBe('multipleElimination')
        expect(result.players).toEqual([1, 2])
      })

      it('должен определять слишком много игроков в перестрелке', () => {
        // 3 игрока с равными голосами при 5 живых (3 >= 5/2)
        gameStore.gameState.votingResults = { 1: 3, 2: 3, 3: 3 }
        gameStore.gameState.shootoutPlayers = [1, 2, 3]
        
        const result = votingStore.confirmVoting()
        
        expect(result).toEqual({ 
          result: 'tooMany', 
          count: 3, 
          totalAlive: 5 
        })
        expect(gameStore.gameState.noCandidatesRounds).toBe(1)
      })
    })

    describe('Множественное удаление', () => {
      it('должен обрабатывать множественное удаление когда игроков не слишком много', () => {
        // 2 игрока с равными голосами при 5 живых (2 < 5/2)
        gameStore.gameState.votingResults = { 1: 3, 2: 3 }
        gameStore.gameState.shootoutPlayers = [1, 2] // Same shootout players
        
        const result = votingStore.confirmVoting()
        
        expect(result).toEqual({ 
          result: 'multipleElimination', 
          players: [1, 2] 
        })
      })
    })

    describe('Граничные случаи', () => {
      it('должен возвращать null когда нет зарегистрированных голосов', () => {
        gameStore.gameState.votingResults = {}
        
        const result = votingStore.confirmVoting()
        
        expect(result).toBeNull()
        expect(gameStore.eliminatePlayerByVote).not.toHaveBeenCalled()
      })

      it('должен корректно обрабатывать тройную ничью', () => {
        gameStore.gameState.votingResults = { 1: 3, 2: 3, 4: 3 }
        gameStore.gameState.shootoutPlayers = []
        
        const result = votingStore.confirmVoting()
        
        expect(result).toEqual({ result: 'shootout', players: [1, 2, 4] })
        expect(gameStore.gameState.shootoutPlayers).toEqual([1, 2, 4])
      })

      it('должен парсить ID игроков как числа', () => {
        gameStore.gameState.votingResults = { '1': 5, '2': 3 }
        
        const result = votingStore.confirmVoting()
        
        expect(result.players[0]).toBe(1) // Должно быть число, не строка
        expect(typeof result.players[0]).toBe('number')
      })
    })
  })

  describe('Сброс голосования', () => {
    it('должен очищать результаты голосования', () => {
      gameStore.gameState.votingResults = { 1: 3, 2: 5 }
      
      votingStore.resetVoting()
      
      expect(gameStore.gameState.votingResults).toEqual({})
    })
  })

  describe('Сложные сценарии голосования', () => {
    it('должен обрабатывать изменения голосов во время голосования', () => {
      // Начинаем голосование
      gameStore.gameState.nominatedPlayers = [1, 2, 3]
      votingStore.startVoting()
      
      // Первый раунд голосов
      votingStore.registerVotes(1, 2)
      votingStore.registerVotes(2, 3)
      votingStore.registerVotes(3, 1)
      
      // Меняем голоса
      votingStore.registerVotes(1, 4)
      votingStore.registerVotes(2, 0) // Убираем голоса за игрока 2
      
      expect(gameStore.gameState.votingResults).toEqual({ 1: 4, 3: 1 })
      
      const result = votingStore.confirmVoting()
      expect(result).toEqual({ result: 'eliminated', players: [1] })
    })

    it('должен обрабатывать разрешение перестрелки', () => {
      // Начальная ничья
      gameStore.gameState.votingResults = { 1: 3, 2: 3 }
      gameStore.gameState.shootoutPlayers = []
      
      let result = votingStore.confirmVoting()
      expect(result.result).toBe('shootout')
      
      // Раунд перестрелки - игрок 1 получает больше голосов
      gameStore.gameState.votingResults = { 1: 4, 2: 2 }
      
      result = votingStore.confirmVoting()
      expect(result).toEqual({ result: 'eliminated', players: [1] })
      expect(gameStore.gameState.shootoutPlayers).toEqual([])
    })
  })
})