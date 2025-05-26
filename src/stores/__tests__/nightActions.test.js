import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNightActionsStore } from '../nightActions'
import { useGameStore } from '../game'
import { PLAYER_ROLES, GAME_STATUSES, GAME_SUBSTATUS } from '@/utils/constants'

describe('NightActionsStore', () => {
  let nightActionsStore
  let gameStore

  beforeEach(() => {
    setActivePinia(createPinia())
    nightActionsStore = useNightActionsStore()
    gameStore = useGameStore()
    
    // Mock gameStore methods
    gameStore.setGameStatus = vi.fn()
    gameStore.checkBestMove = vi.fn().mockReturnValue(false)
    
    // Setup test players
    gameStore.gameState.players = [
      { id: 1, name: 'Civilian 1', originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false, nominated: null },
      { id: 2, name: 'Sheriff', originalRole: PLAYER_ROLES.SHERIFF, isAlive: true, isEliminated: false, nominated: null },
      { id: 3, name: 'Mafia 1', originalRole: PLAYER_ROLES.MAFIA, isAlive: true, isEliminated: false, nominated: null },
      { id: 4, name: 'Don', originalRole: PLAYER_ROLES.DON, isAlive: true, isEliminated: false, nominated: null },
      { id: 5, name: 'Civilian 2', originalRole: PLAYER_ROLES.CIVILIAN, isAlive: true, isEliminated: false, nominated: null }
    ]
    
    // currentPlayer is a computed property that returns a function, not a direct method
  })

  describe('Sheriff Check', () => {
    it('should correctly identify mafia members', () => {
      const result = nightActionsStore.checkSheriff(3)
      
      expect(result).toEqual({
        targetId: 3,
        targetName: 'Mafia 1',
        isMafia: true
      })
    })

    it('should correctly identify don as mafia', () => {
      const result = nightActionsStore.checkSheriff(4)
      
      expect(result).toEqual({
        targetId: 4,
        targetName: 'Don',
        isMafia: true
      })
    })

    it('should correctly identify civilians', () => {
      const result = nightActionsStore.checkSheriff(1)
      
      expect(result).toEqual({
        targetId: 1,
        targetName: 'Civilian 1',
        isMafia: false
      })
    })

    it('should return null for non-existent player', () => {
      const result = nightActionsStore.checkSheriff(999)
      expect(result).toBeNull()
    })
  })

  describe('Don Check', () => {
    it('should correctly identify sheriff', () => {
      const result = nightActionsStore.checkDon(2)
      
      expect(result).toEqual({
        targetId: 2,
        targetName: 'Sheriff',
        isSheriff: true
      })
    })

    it('should correctly identify non-sheriff players', () => {
      const result = nightActionsStore.checkDon(1)
      
      expect(result).toEqual({
        targetId: 1,
        targetName: 'Civilian 1',
        isSheriff: false
      })
    })

    it('should return null for non-existent player', () => {
      const result = nightActionsStore.checkDon(999)
      expect(result).toBeNull()
    })
  })

  describe('Confirm Night', () => {
    describe('Mafia Kill', () => {
      it('should kill targeted player', () => {
        gameStore.gameState.mafiaTarget = 1
        gameStore.gameState.round = 0
        
        const result = nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players[0].isAlive).toBe(false)
        expect(gameStore.gameState.deadPlayers).toContain(1)
        expect(gameStore.gameState.nightKill).toBe(1)
        expect(result.killed).toBe(1)
      })

      it('should not kill if no target selected', () => {
        gameStore.gameState.mafiaTarget = 0
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players.every(p => p.isAlive)).toBe(true)
        expect(gameStore.gameState.deadPlayers).toEqual([])
        expect(gameStore.gameState.nightKill).toBeNull()
      })

      it('should not kill already dead player', () => {
        gameStore.gameState.players[0].isAlive = false
        gameStore.gameState.mafiaTarget = 1
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.deadPlayers).toEqual([])
        expect(gameStore.gameState.nightKill).toBeNull()
      })

      it('should not kill eliminated player', () => {
        gameStore.gameState.players[0].isEliminated = true
        gameStore.gameState.mafiaTarget = 1
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.deadPlayers).toEqual([])
        expect(gameStore.gameState.nightKill).toBeNull()
      })

      it('should clear nominations of killed player', () => {
        gameStore.gameState.players[1].nominated = 1 // Player 2 nominated Player 1
        gameStore.gameState.players[2].nominated = 1 // Player 3 nominated Player 1
        gameStore.gameState.mafiaTarget = 1
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players[1].nominated).toBeNull()
        expect(gameStore.gameState.players[2].nominated).toBeNull()
      })
    })

    describe('Round Management', () => {
      it('should increment round number', () => {
        gameStore.gameState.round = 2
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.round).toBe(3)
      })

      it('should set discussion status for new day', () => {
        gameStore.gameState.gameStatus = GAME_STATUSES.IN_PROGRESS
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.setGameStatus).toHaveBeenCalledWith(
          GAME_STATUSES.IN_PROGRESS, 
          GAME_SUBSTATUS.DISCUSSION
        )
      })
    })

    describe('Silence Effects', () => {
      it('should apply silence for next round', () => {
        gameStore.gameState.players[0].silentNextRound = true
        gameStore.gameState.players[1].silentNextRound = true
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players[0].isSilent).toBe(true)
        expect(gameStore.gameState.players[0].silentNextRound).toBe(false)
        expect(gameStore.gameState.players[1].isSilent).toBe(true)
        expect(gameStore.gameState.players[1].silentNextRound).toBe(false)
      })

      it('should remove silence after one round', () => {
        gameStore.gameState.players[0].isSilent = true
        gameStore.gameState.players[0].silentNextRound = false
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players[0].isSilent).toBe(false)
      })

      it('should handle consecutive silence rounds', () => {
        // Player is silent and will be silent next round too
        gameStore.gameState.players[0].isSilent = true
        gameStore.gameState.players[0].silentNextRound = true
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.players[0].isSilent).toBe(true)
        expect(gameStore.gameState.players[0].silentNextRound).toBe(false)
      })
    })

    describe('Best Move', () => {
      it('should show best move after first round with one kill', () => {
        gameStore.gameState.round = 0
        gameStore.gameState.deadPlayers = []
        gameStore.gameState.eliminatedPlayers = []
        gameStore.gameState.bestMoveUsed = false
        gameStore.gameState.mafiaTarget = 2
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.showBestMove).toBe(true)
      })

      it('should not show best move if already used', () => {
        gameStore.gameState.round = 0
        gameStore.gameState.deadPlayers = [1]
        gameStore.gameState.eliminatedPlayers = []
        gameStore.gameState.bestMoveUsed = true
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.showBestMove).toBeFalsy()
      })

      it('should not show best move if players eliminated', () => {
        gameStore.gameState.round = 0
        gameStore.gameState.deadPlayers = [1]
        gameStore.gameState.eliminatedPlayers = [3]
        gameStore.gameState.bestMoveUsed = false
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.showBestMove).toBeFalsy()
      })

      it('should not show best move after round 1', () => {
        gameStore.gameState.round = 1 // Will be 2 after increment
        gameStore.gameState.deadPlayers = [1]
        gameStore.gameState.eliminatedPlayers = []
        gameStore.gameState.bestMoveUsed = false
        
        nightActionsStore.confirmNight()
        
        expect(gameStore.gameState.showBestMove).toBeFalsy()
      })

      it('should return early if best move check returns true', () => {
        gameStore.checkBestMove.mockReturnValue(true)
        gameStore.gameState.round = 0
        
        const result = nightActionsStore.confirmNight()
        
        expect(result.round).toBe(1)
        expect(gameStore.setGameStatus).not.toHaveBeenCalled()
      })
    })

    describe('Return Values', () => {
      it('should return round and killed player info', () => {
        gameStore.gameState.round = 2
        gameStore.gameState.mafiaTarget = 1
        
        const result = nightActionsStore.confirmNight()
        
        expect(result).toEqual({
          round: 3,
          killed: 1
        })
      })

      it('should return null for killed if no one died', () => {
        gameStore.gameState.round = 2
        gameStore.gameState.mafiaTarget = 0
        
        const result = nightActionsStore.confirmNight()
        
        expect(result).toEqual({
          round: 3,
          killed: null
        })
      })
    })
  })

  describe('Complex Night Scenarios', () => {
    it('should handle multiple night actions in sequence', () => {
      // Sheriff checks mafia
      const sheriffCheck = nightActionsStore.checkSheriff(3)
      expect(sheriffCheck.isMafia).toBe(true)
      
      // Don checks civilian
      const donCheck = nightActionsStore.checkDon(1)
      expect(donCheck.isSheriff).toBe(false)
      
      // Mafia kills sheriff
      gameStore.gameState.mafiaTarget = 2
      gameStore.gameState.round = 0
      
      const result = nightActionsStore.confirmNight()
      
      expect(gameStore.gameState.players[1].isAlive).toBe(false) // Sheriff dead
      expect(result.killed).toBe(2)
      expect(gameStore.gameState.round).toBe(1)
    })

    it('should handle night with no actions', () => {
      gameStore.gameState.mafiaTarget = 0
      gameStore.gameState.round = 2
      
      const result = nightActionsStore.confirmNight()
      
      expect(result.killed).toBeNull()
      expect(gameStore.gameState.round).toBe(3)
      expect(gameStore.gameState.players.every(p => p.isAlive)).toBe(true)
    })
  })
})