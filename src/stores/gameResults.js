import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useGameStore } from './game'
import { PLAYER_ROLES } from '@/utils/constants'

export const useGameResultsStore = defineStore('gameResults', () => {
    const gameStore = useGameStore()

    const checkWinConditions = computed(() => {
	const players = gameStore.gameState.players
	const noCandidatesRounds = gameStore.gameState.noCandidatesRounds
	
	const mafiaCount = players.filter(p => 
	    (p.originalRole === PLAYER_ROLES.MAFIA || p.originalRole === PLAYER_ROLES.DON) && 
		p.isAlive && !p.isEliminated
	).length
	
	const civilianCount = players.filter(p => 
	    (p.originalRole === PLAYER_ROLES.CIVILIAN || p.originalRole === PLAYER_ROLES.SHERIFF) && 
		p.isAlive && !p.isEliminated
	).length
	
	// Победа города - вся мафия убита
	if (mafiaCount === 0) {
	    return { winner: 'city', reason: 'all_mafia_eliminated' }
	}
	
	// Победа мафии - мафии больше или равно мирным
	if (mafiaCount >= civilianCount) {
	    return { winner: 'mafia', reason: 'mafia_majority' }
	}
	
	// Ничья - 3 круга без кандидатов
	if (noCandidatesRounds >= 3) {
	    return { winner: 'draw', reason: 'no_candidates' }
	}
	
	// Игра продолжается
	return { winner: null, reason: null }
    })

    const setBaseScores = (result) => {
	gameStore.gameState.players.forEach(player => {
	    let baseScore = 0
	    
	    const isWinner = (
		(result === 'city_win' && (player.originalRole === PLAYER_ROLES.CIVILIAN || player.originalRole === PLAYER_ROLES.SHERIFF)) ||
		    (result === 'mafia_win' && (player.originalRole === PLAYER_ROLES.MAFIA || player.originalRole === PLAYER_ROLES.DON))
	    )
	    
	    if (result === 'draw') {
		baseScore = 0.5 // При ничьей всем по 0.5 балла
	    } else if (isWinner) {
		baseScore = 1 // Победители получают 1 балл
	    } else {
		baseScore = 0 // Проигравшие получают 0 баллов
	    }
	    
	    gameStore.setPlayerScore(player.id, baseScore, 0)
	})
    }

    // Methods for tests
    const checkWinCondition = (players) => {
	const alivePlayers = players.filter(p => p.status === 'ALIVE')
	
	const mafiaCount = alivePlayers.filter(p => 
	    p.role === PLAYER_ROLES.MAFIA || p.role === PLAYER_ROLES.DON
	).length
	
	const civilianCount = alivePlayers.filter(p => 
	    p.role === PLAYER_ROLES.CIVILIAN || p.role === PLAYER_ROLES.SHERIFF
	).length
	
	// Победа города - вся мафия убита
	if (mafiaCount === 0 && civilianCount > 0) {
	    return { 
		isGameOver: true,
		winner: 'city',
		reason: 'Вся мафия устранена'
	    }
	}
	
	// Победа мафии - мафии больше или равно мирным
	if (mafiaCount >= civilianCount && mafiaCount > 0) {
	    return { 
		isGameOver: true,
		winner: 'mafia',
		reason: 'Мафия в большинстве'
	    }
	}
	
	// Игра продолжается
	return { 
	    isGameOver: false,
	    winner: null,
	    reason: null
	}
    }

    const calculateScores = (players, game) => {
	const scores = []
	
	players.forEach(player => {
	    const score = {
		playerId: player.id,
		baseScore: 0,
		additionalScore: 0,
		bestMove: 0
	    }
	    
	    // Определяем победителя
	    const result = checkWinCondition(players)
	    
	    if (result.winner === 'city' && (player.role === PLAYER_ROLES.CIVILIAN || player.role === PLAYER_ROLES.SHERIFF)) {
		score.baseScore = 1
	    } else if (result.winner === 'mafia' && (player.role === PLAYER_ROLES.MAFIA || player.role === PLAYER_ROLES.DON)) {
		score.baseScore = 1
	    }
	    
	    // Подсчет лучшего хода
	    if (player.id === gameStore.firstEliminatedPlayer && game.bestMoveUsed) {
		const bestMoveTargets = gameStore.bestMoveTargets
		const mafiaInTargets = bestMoveTargets.filter(targetId => {
		    const target = players.find(p => p.id === targetId)
		    return target && (target.role === PLAYER_ROLES.MAFIA || target.role === PLAYER_ROLES.DON)
		}).length
		
		score.bestMove = mafiaInTargets
		score.additionalScore += mafiaInTargets * 0.5
	    }
	    
	    scores.push(score)
	})
	
	return scores
    }

    return {
	checkWinConditions,
	setBaseScores,
	checkWinCondition,
	calculateScores
    }
})
