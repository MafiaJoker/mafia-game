import { defineStore } from 'pinia'
import { useGameStore } from './game'
import { PLAYER_ROLES, GAME_SUBSTATUS } from '@/utils/constants'

export const useNightActionsStore = defineStore('nightActions', () => {
    const gameStore = useGameStore()

    const checkSheriff = (targetPlayerId) => {
	const target = gameStore.currentPlayer(targetPlayerId)
	if (!target) return null
	
	const isMafia = target.originalRole === PLAYER_ROLES.MAFIA || 
              target.originalRole === PLAYER_ROLES.DON
        
	return {
	    targetId: targetPlayerId,
	    targetName: target.name,
	    isMafia: isMafia
	}
    }

    const checkDon = (targetPlayerId) => {
	const target = gameStore.currentPlayer(targetPlayerId)
	if (!target) return null
	
	const isSheriff = target.originalRole === PLAYER_ROLES.SHERIFF
	
	return {
	    targetId: targetPlayerId,
	    targetName: target.name,
	    isSheriff: isSheriff
	}
    }

    const confirmNight = () => {
	// Применяем стрельбу мафии
	if (gameStore.gameState.mafiaTarget && gameStore.gameState.mafiaTarget !== 0) {
	    const target = gameStore.currentPlayer(gameStore.gameState.mafiaTarget)
	    
	    if (target && target.isAlive && !target.isEliminated) {
		target.isAlive = false
		gameStore.gameState.deadPlayers.push(gameStore.gameState.mafiaTarget)
		gameStore.gameState.nightKill = gameStore.gameState.mafiaTarget
		
		// Убираем номинации убитого игрока
		gameStore.gameState.players.forEach(p => {
		    if (p.nominated === gameStore.gameState.mafiaTarget) {
			p.nominated = null
		    }
		})
	    }
	}
	
	gameStore.gameState.round++

	if (gameStore.checkBestMove()) {
	    // Если показали лучший ход, не продолжаем дальше
	    return {
		round: gameStore.gameState.round,
		killed: gameStore.gameState.nightKill
	    }
	}
	
	// Устанавливаем статус обсуждения для нового дня
	gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.DISCUSSION)
	
	// Применяем эффекты молчания
	gameStore.gameState.players.forEach(p => {
	    if (p.silentNextRound) {
		p.isSilent = true
		p.silentNextRound = false
	    } else if (p.isSilent) {
		p.isSilent = false
	    }
	})
	
	// Проверяем лучший ход
	if (gameStore.gameState.deadPlayers.length === 1 && 
            gameStore.gameState.eliminatedPlayers.length === 0 && 
            gameStore.gameState.round === 1 &&
            !gameStore.gameState.bestMoveUsed) {
	    gameStore.gameState.showBestMove = true
	}
	
	return {
	    round: gameStore.gameState.round,
	    killed: gameStore.gameState.nightKill
	}
    }

    return {
	checkSheriff,
	checkDon,
	confirmNight
    }
})
