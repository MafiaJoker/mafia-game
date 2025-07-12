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
	isCriticalRound: false,
	showBestMove: false
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
    const finishGame = async (result) => {
	try {
            // Устанавливаем статус завершенной игры
            setGameStatus(GAME_STATUSES.FINISHED_NO_SCORES)
            gameState.value.isGameStarted = false
            
            // Устанавливаем базовые баллы в зависимости от результата
            setBaseScores(result)
            
            // Обновляем статус игры в API
            if (gameInfo.value) {
		await apiService.updateGame(
                    gameInfo.value.gameId, 
                    {
			status: 'finished',
			result: result,
			currentRound: gameState.value.round
                    }
		)
            }
            
            await saveGameState()
            return true
	} catch (error) {
            console.error('Ошибка завершения игры:', error)
            return false
	}
    }
    const setBaseScores = (result) => {
	gameState.value.players.forEach(player => {
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
            
            // For test compatibility, store as simple number
            gameState.value.scores[player.id] = baseScore
	})
    }

    const setPlayerScore = (playerId, baseScore, additionalScore = 0) => {
	if (!gameState.value.scores[playerId]) {
            gameState.value.scores[playerId] = { baseScore: 0, additionalScore: 0 }
	}
	
	gameState.value.scores[playerId].baseScore = baseScore
	gameState.value.scores[playerId].additionalScore = additionalScore
    }

    const getPlayerScore = (playerId) => {
	return gameState.value.scores[playerId] || { baseScore: 0, additionalScore: 0 }
    }
    
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

    // Additional methods for tests
    const assignRole = (playerId, role) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    player.role = role
	    player.originalRole = role
	}
    }

    const initializeGame = (config) => {
	gameInfo.value = {
	    eventId: config.eventId,
	    tableId: config.tableId,
	    gameId: config.gameId || null
	}
	
	// Reset game state
	gameState.value = {
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
	    isCriticalRound: false,
	    showBestMove: false,
	    firstEliminatedPlayer: null
	}
    }

    const addPlayer = (playerData) => {
	const player = {
	    id: playerData.id,
	    name: playerData.nickname || playerData.name,
	    nickname: playerData.nickname,
	    realName: playerData.realName,
	    role: PLAYER_ROLES.CIVILIAN,
	    originalRole: PLAYER_ROLES.CIVILIAN,
	    fouls: 0,
	    canSpeak: true,
	    nominated: null,
	    isAlive: true,
	    isEliminated: false,
	    isSilent: false,
	    silentNextRound: false,
	    seatNumber: gameState.value.players.length + 1,
	    status: 'ALIVE'
	}
	
	gameState.value.players.push(player)
	gameState.value.scores[player.id] = 0
    }

    const distributeRolesRandomly = () => {
	const roles = [
	    ...Array(6).fill(PLAYER_ROLES.CIVILIAN),
	    ...Array(2).fill(PLAYER_ROLES.MAFIA),
	    PLAYER_ROLES.DON,
	    PLAYER_ROLES.SHERIFF
	]
	
	// Shuffle roles
	for (let i = roles.length - 1; i > 0; i--) {
	    const j = Math.floor(Math.random() * (i + 1));
	    [roles[i], roles[j]] = [roles[j], roles[i]]
	}
	
	// Assign roles to players
	gameState.value.players.forEach((player, index) => {
	    player.role = roles[index]
	    player.originalRole = roles[index]
	})
    }

    const startGame = async () => {
	gameState.value.gameStatus = GAME_STATUSES.IN_PROGRESS
	gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
	gameState.value.isGameStarted = true
	gameState.value.round = 1
	gameState.value.phase = 'DAY'
	
	// Создаем игру если нужно
	if (!gameInfo.value?.gameId && gameInfo.value) {
	    try {
		const response = await apiService.createGame({
		    eventId: gameInfo.value.eventId
		})
		if (response?.data?.id) {
		    gameInfo.value.gameId = response.data.id
		}
	    } catch (error) {
		console.error('Failed to create game:', error)
	    }
	}
	
	await saveGameState()
    }

    const nextRound = () => {
	gameState.value.round++
	gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
    }

    const incrementNoCandidatesRounds = () => {
	gameState.value.noCandidatesRounds++
    }

    const eliminatePlayerByVote = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player && player.isAlive) {
	    player.isAlive = false
	    player.status = 'VOTED_OUT'
	    gameState.value.deadPlayers.push(playerId)
	    
	    // Если это первый выбывший в первом раунде, активируем лучший ход
	    if (gameState.value.deadPlayers.length === 1 && gameState.value.round === 1) {
		gameState.value.showBestMove = true
		gameState.value.firstEliminatedPlayer = playerId
	    }
	    
	    // Сбрасываем счетчик раундов без кандидатов
	    gameState.value.noCandidatesRounds = 0
	}
    }

    const addFoul = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    player.fouls++
	    if (player.fouls >= 3) {
		player.canSpeak = false
	    }
	    if (player.fouls >= 4) {
		player.isEliminated = true
		player.isAlive = false
		player.status = 'KICKED'
		if (!gameState.value.eliminatedPlayers.includes(playerId)) {
		    gameState.value.eliminatedPlayers.push(playerId)
		}
	    }
	}
    }

    const removeFoul = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player && player.fouls > 0) {
	    player.fouls--
	}
    }

    const setNightKill = (playerId) => {
	gameState.value.nightKill = playerId
    }

    const applyNightKill = () => {
	if (gameState.value.nightKill) {
	    const player = currentPlayer.value(gameState.value.nightKill)
	    if (player && player.isAlive) {
		player.isAlive = false
		player.status = 'KILLED'
		gameState.value.deadPlayers.push(gameState.value.nightKill)
	    }
	    gameState.value.nightKill = null
	}
    }

    const toggleBestMoveTarget = (playerId) => {
	// Конвертируем Set в массив для удобства работы
	const targets = Array.from(gameState.value.bestMoveTargets)
	const index = targets.indexOf(playerId)
	
	if (index !== -1) {
	    targets.splice(index, 1)
	} else if (targets.length < 3) {
	    targets.push(playerId)
	}
	
	gameState.value.bestMoveTargets = new Set(targets)
    }

    const useBestMove = () => {
	gameState.value.bestMoveUsed = true
	gameState.value.showBestMove = false
    }

    const nextPhase = () => {
	if (gameState.value.phase === 'DAY') {
	    gameState.value.phase = 'NIGHT'
	    gameState.value.gameSubstatus = GAME_SUBSTATUS.MAFIA_KILL
	} else {
	    gameState.value.phase = 'DAY'
	    gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
	}
    }

    // Getters for tests
    const players = computed(() => gameState.value.players)
    const phase = computed(() => gameState.value.phase)
    const round = computed(() => gameState.value.round)
    const game = computed(() => ({
	noCandidatesRounds: gameState.value.noCandidatesRounds,
	bestMoveUsed: gameState.value.bestMoveUsed
    }))
    const showBestMove = computed(() => gameState.value.showBestMove)
    const firstEliminatedPlayer = computed(() => gameState.value.firstEliminatedPlayer)
    const bestMoveTargets = computed(() => Array.from(gameState.value.bestMoveTargets))
    
    // Критический раунд - когда за столом 3 или 4 живых игрока
    const isCriticalRound = computed(() => {
	const alivePlayers = gameState.value.players.filter(p => p.isAlive && !p.isEliminated).length
	return alivePlayers === 3 || alivePlayers === 4
    })

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
	finishGame,
	setBaseScores,
	setPlayerScore,
	getPlayerScore,
	initGame,
	loadGameState,
	saveGameState,
	initPlayers,
	setGameStatus,
	changePlayerRole,
	nominatePlayer,
	updateNominatedPlayers,
	incrementFoul,
	eliminatePlayer,
	assignRole,
	distributeRolesRandomly,
	startGame,
	nextRound,
	incrementNoCandidatesRounds,
	eliminatePlayerByVote,
	addFoul,
	removeFoul,
	setNightKill,
	applyNightKill,
	toggleBestMoveTarget,
	useBestMove,
	initializeGame,
	addPlayer,
	nextPhase,
	
	// Computed for tests
	players,
	phase,
	round,
	game,
	showBestMove,
	firstEliminatedPlayer,
	bestMoveTargets,
	isCriticalRound
    }
})
