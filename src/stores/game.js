import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GAME_STATUSES, GAME_SUBSTATUS, PLAYER_ROLES } from '@/utils/constants.js'
import { apiService } from '@/services/api.js'

export const useGameStore = defineStore('game', () => {
    // State
    const gameInfo = ref(null)
    const gameState = ref({
	round: 0,
	gameStatus: GAME_STATUSES.CREATED,
	gameSubstatus: null,
	isGameStarted: false,
	players: [],
	nominatedPlayers: [],
	votingResults: {},
	shootoutPlayers: [],
	deadPlayers: [],
	eliminatedPlayers: [],
	nightKill: null,
	bestMoveUsed: false,
	noCandidatesRounds: 0,
	mafiaTarget: null,
	donTarget: null,
	sheriffTarget: null,
	bestMoveTargets: new Set(),
	rolesVisible: false,
	scores: {},
	isCriticalRound: false
    })

    // Getters
    const currentPlayer = computed(() => (playerId) => {
	return gameState.value.players.find(p => p.id === playerId)
    })

    const alivePlayers = computed(() => {
	return gameState.value.players.filter(p => p.isAlive && !p.isEliminated)
    })

    const isInRoleDistribution = computed(() => {
	return gameState.value.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION
    })

    const isGameInProgress = computed(() => {
	return gameState.value.gameStatus === GAME_STATUSES.IN_PROGRESS
    })

    const canStartGame = computed(() => {
	const mafiaCount = gameState.value.players.filter(p => p.role === PLAYER_ROLES.MAFIA).length
	const donCount = gameState.value.players.filter(p => p.role === PLAYER_ROLES.DON).length
	const sheriffCount = gameState.value.players.filter(p => p.role === PLAYER_ROLES.SHERIFF).length
	
	return mafiaCount === 2 && donCount === 1 && sheriffCount === 1
    })

    // Actions
    const checkBestMove = () => {
	// Проверка на первого убитого для лучшего хода
	if (gameState.value.deadPlayers.length === 1 && 
	    gameState.value.eliminatedPlayers.length === 0 && 
	    gameState.value.round === 1 &&
	    !gameState.value.bestMoveUsed) {
	    
	    gameState.value.showBestMove = true
	    return true
	}
	return false
    }
    
    const initGame = async (eventId, tableId, gameId) => {
	try {
	    gameInfo.value = { eventId, tableId, gameId }
	    
	    if (gameId) {
		await loadGameState(gameId)
	    } else {
		initPlayers()
		setGameStatus(GAME_STATUSES.SEATING_READY)
	    }
	} catch (error) {
	    console.error('Ошибка инициализации игры:', error)
	    throw error
	}
    }

    const loadGameState = async (gameId) => {
	try {
	    const state = await apiService.getGameState(gameId)
	    if (state) {
		Object.assign(gameState.value, state)
		if (state.bestMoveTargets && Array.isArray(state.bestMoveTargets)) {
		    gameState.value.bestMoveTargets = new Set(state.bestMoveTargets)
		}
		return true
	    }
	    return false
	} catch (error) {
	    console.error('Ошибка загрузки состояния игры:', error)
	    return false
	}
    }

    const saveGameState = async () => {
	if (!gameInfo.value?.gameId) return false

	try {
	    const stateToSave = {
		...gameState.value,
		bestMoveTargets: Array.from(gameState.value.bestMoveTargets)
	    }
	    
	    await apiService.saveGameState(gameInfo.value.gameId, stateToSave)
	    return true
	} catch (error) {
	    console.error('Ошибка сохранения состояния игры:', error)
	    return false
	}
    }

    const initPlayers = () => {
	gameState.value.players = []
	for (let i = 1; i <= 10; i++) {
	    gameState.value.players.push({
		id: i,
		name: `Игрок ${i}`,
		role: PLAYER_ROLES.CIVILIAN,
		originalRole: PLAYER_ROLES.CIVILIAN,
		fouls: 0,
		nominated: null,
		isAlive: true,
		isEliminated: false,
		isSilent: false,
		silentNextRound: false
	    })
	    gameState.value.scores[i] = { baseScore: 0, additionalScore: 0 }
	}
    }

    const setGameStatus = (status, substatus = null) => {
	gameState.value.gameStatus = status
	gameState.value.gameSubstatus = substatus
    }

    const changePlayerRole = (playerId) => {
	if (!isInRoleDistribution.value) return

	const player = currentPlayer.value(playerId)
	if (!player) return

	const existingRoles = gameState.value.players.map(p => p.role)
	const newRole = getNextRole(player.role, existingRoles)
	
	player.role = newRole
	player.originalRole = newRole
	
	return newRole
    }

    const getNextRole = (currentRole, existingRoles) => {
	const mafiaCount = existingRoles.filter(role => role === PLAYER_ROLES.MAFIA).length
	const donCount = existingRoles.filter(role => role === PLAYER_ROLES.DON).length
	const sheriffCount = existingRoles.filter(role => role === PLAYER_ROLES.SHERIFF).length
	
	if (currentRole === PLAYER_ROLES.CIVILIAN) {
	    if (mafiaCount < 2) return PLAYER_ROLES.MAFIA
	    if (donCount < 1) return PLAYER_ROLES.DON
	    if (sheriffCount < 1) return PLAYER_ROLES.SHERIFF
	} else if (currentRole === PLAYER_ROLES.MAFIA) {
	    if (donCount < 1) return PLAYER_ROLES.DON
	    if (sheriffCount < 1) return PLAYER_ROLES.SHERIFF
	    return PLAYER_ROLES.CIVILIAN
	} else if (currentRole === PLAYER_ROLES.DON) {
	    if (sheriffCount < 1) return PLAYER_ROLES.SHERIFF
	    return PLAYER_ROLES.CIVILIAN
	} else if (currentRole === PLAYER_ROLES.SHERIFF) {
	    return PLAYER_ROLES.CIVILIAN
	}
	
	return currentRole
    }

    const nominatePlayer = (nominatorId, nominatedId) => {
	const nominator = currentPlayer.value(nominatorId)
	if (nominator) {
	    nominator.nominated = nominatedId || null
	    updateNominatedPlayers()
	}
    }

    const updateNominatedPlayers = () => {
	const nominations = gameState.value.players
	      .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
	      .map(p => p.nominated)
	
	gameState.value.nominatedPlayers = [...new Set(nominations)].filter(id => {
	    const player = currentPlayer.value(id)
	    return player && player.isAlive && !player.isEliminated
	})
    }

    const incrementFoul = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    player.fouls++
	}
    }

    const eliminatePlayer = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    player.isEliminated = true
	    player.isAlive = false
	    gameState.value.eliminatedPlayers.push(playerId)
	    
	    // Убираем номинации этого игрока
	    gameState.value.players.forEach(p => {
		if (p.nominated === playerId) {
		    p.nominated = null
		}
	    })
	}
    }

    return {
	// State
	gameInfo,
	gameState,
	
	// Getters
	currentPlayer,
	alivePlayers,
	isInRoleDistribution,
	isGameInProgress,
	canStartGame,
	
	// Actions
	checkBestMove,
	initGame,
	loadGameState,
	saveGameState,
	initPlayers,
	setGameStatus,
	changePlayerRole,
	nominatePlayer,
	updateNominatedPlayers,
	incrementFoul,
	eliminatePlayer
    }
})
