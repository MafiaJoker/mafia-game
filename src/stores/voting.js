import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from './game'
import { useGamePhasesStore } from './gamePhases'
import { GAME_SUBSTATUS } from '@/utils/constants'

export const useVotingStore = defineStore('voting', () => {
    const gameStore = useGameStore()
    const gamePhasesStore = useGamePhasesStore()

    const startVoting = () => {
	if (gameStore.gameState.nominatedPlayers.length === 0) return false
	
	gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.VOTING)
	gameStore.gameState.votingResults = {}
	
	return true
    }

    const registerVotes = (playerId, votes) => {
	if (votes === 0) {
	    delete gameStore.gameState.votingResults[playerId]
	} else {
	    gameStore.gameState.votingResults[playerId] = votes
	}
    }

    const confirmVoting = async () => {
	const results = gameStore.gameState.votingResults
	
	if (Object.keys(results).length === 0) return null
	
	let maxVotes = 0
	let playersWithMaxVotes = []
	
	Object.entries(results).forEach(([playerId, votes]) => {
	    if (votes > maxVotes) {
		maxVotes = votes
		playersWithMaxVotes = [parseInt(playerId)]
	    } else if (votes === maxVotes) {
		playersWithMaxVotes.push(parseInt(playerId))
	    }
	})

	if (playersWithMaxVotes.length > 1) {
	    // Перестрелка
	    const isSameShootout = playersWithMaxVotes.length === gameStore.gameState.shootoutPlayers.length && 
		  playersWithMaxVotes.every(id => gameStore.gameState.shootoutPlayers.includes(id))
            
	    if (!isSameShootout) {
		gameStore.gameState.shootoutPlayers = playersWithMaxVotes
		gameStore.gameState.votingResults = {}
		gameStore.gameState.nominatedPlayers = playersWithMaxVotes
		
		return { result: 'shootout', players: playersWithMaxVotes }
	    }
	    
	    // Если та же перестрелка повторяется - нужно голосование за поднятие всех
	    // Очищаем номинации но оставляем shootoutPlayers для отображения
	    gameStore.gameState.nominatedPlayers = []
	    gameStore.gameState.votingResults = {}
	    return { result: 'raise_all_voting', players: playersWithMaxVotes }
	}
	
	// Список выведенных игроков для записи в фазу
	const eliminatedPlayers = []
	
	if (playersWithMaxVotes.length === 1) {
	    const eliminatedId = playersWithMaxVotes[0]
	    gameStore.eliminatePlayerByVote(eliminatedId)
	    gameStore.gameState.noCandidatesRounds = 0
	    eliminatedPlayers.push(eliminatedId)
	}
	
	// Сохраняем результат голосования в фазы (даже если никто не выбыл)
	if (gamePhasesStore.currentPhase) {
	    gamePhasesStore.currentPhase.voted_box_id = eliminatedPlayers.length > 0 ? eliminatedPlayers : []
	    // Обновляем фазу на сервере
	    await gamePhasesStore.updateCurrentPhaseOnServer()
	}
	
	// Получаем обновленное состояние игры с сервера после голосования
	await gameStore.updateGameState()
	
	// Проверяем результат игры с сервера
	const gameData = gameStore.gameInfo?.gameData
	if (gameData && (gameData.result === 'civilians_win' || gameData.result === 'mafia_win')) {
	    console.log('Game ended with result from server:', gameData.result)
	    gameStore.finishGame(gameData.result)
	    return { result: 'victory', winner: gameData.result, players: playersWithMaxVotes }
	}
	
	gameStore.gameState.shootoutPlayers = []
	gameStore.gameState.nominatedPlayers = []
	gameStore.gameState.votingResults = {}
	
	// Очищаем все номинации у игроков
	gameStore.gameState.players.forEach(p => {
	    p.nominated = null
	})
	
	// Отмечаем что голосование в этом раунде уже было
	gameStore.gameState.votingHappenedThisRound = true
	
	// Возвращаемся к обсуждению после голосования (только если игра не закончилась)
	if (gameStore.gameState.gameStatus !== 'finished_no_scores' && gameStore.gameState.gameStatus !== 'finished_with_scores') {
	    gameStore.setGameStatus(
	        gameStore.gameState.gameStatus, 
	        gameStore.isCriticalRound ? GAME_SUBSTATUS.CRITICAL_DISCUSSION : GAME_SUBSTATUS.DISCUSSION
	    )
	}
	
	return { result: 'eliminated', players: playersWithMaxVotes }
    }

    const resetVoting = () => {
	gameStore.gameState.votingResults = {}
	gameStore.gameState.votes = []
    }

    // Methods for tests
    const addVote = ({ voterId, candidateId }) => {
	if (!gameStore.gameState.votes) {
	    gameStore.gameState.votes = []
	}
	gameStore.gameState.votes.push({ voterId, candidateId })
    }

    const getVotingResult = () => {
	if (!gameStore.gameState.votes || gameStore.gameState.votes.length === 0) {
	    return { eliminated: [] }
	}

	// Count votes for each candidate
	const voteCounts = {}
	gameStore.gameState.votes.forEach(vote => {
	    if (!voteCounts[vote.candidateId]) {
		voteCounts[vote.candidateId] = 0
	    }
	    voteCounts[vote.candidateId]++
	})

	// Find candidates with max votes
	let maxVotes = 0
	let eliminated = []

	Object.entries(voteCounts).forEach(([candidateId, votes]) => {
	    if (votes > maxVotes) {
		maxVotes = votes
		eliminated = [parseInt(candidateId)]
	    } else if (votes === maxVotes) {
		eliminated.push(parseInt(candidateId))
	    }
	})

	// If tie with too many players, no one is eliminated
	const alivePlayers = gameStore.players.filter(p => p.status === 'ALIVE').length
	if (eliminated.length >= alivePlayers / 2) {
	    return { eliminated: [] }
	}

	return { eliminated }
    }

    const handleShootout = (playerIds) => {
	gameStore.gameState.shootoutPlayers = playerIds
    }

    const setShootoutLoser = (playerId) => {
	// Mark player as eliminated in shootout
	const player = gameStore.players.find(p => p.id === playerId)
	if (player) {
	    player.shootoutLoser = true
	}
    }

    return {
	startVoting,
	registerVotes,
	confirmVoting,
	resetVoting,
	addVote,
	getVotingResult,
	handleShootout,
	setShootoutLoser
    }
})
