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

    return {
	checkWinConditions,
	setBaseScores
    }
})
