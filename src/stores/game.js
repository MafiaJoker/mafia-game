import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GAME_STATUSES, GAME_SUBSTATUS, PLAYER_ROLES, API_PLAYER_ROLES, API_TO_LOCAL_ROLES } from '@/utils/constants.js'
import { apiService } from '@/services/api.js'
import { useGamePhasesStore } from './gamePhases.js'

export const useGameStore = defineStore('game', () => {
    // Get phases store
    const gamePhasesStore = useGamePhasesStore()
    
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

    // Helper methods for box_id conversion
    const getPlayerByBoxId = (boxId) => {
        return gameState.value.players.find(p => p.id === boxId)
    }

    const getBoxIdByPlayerId = (playerId) => {
        const player = gameState.value.players.find(p => p.userId === playerId)
        return player ? player.id : null
    }

    const getPlayerByUserId = (userId) => {
        return gameState.value.players.find(p => p.userId === userId)
    }

    // Convert phases data to legacy format for backward compatibility
    const getDeadPlayersFromPhases = computed(() => {
        if (!gamePhasesStore.phases.length) return []
        
        const killedBoxIds = gamePhasesStore.getKilledPlayersUpToPhase(gamePhasesStore.currentPhaseId)
        return killedBoxIds
    })

    const getEliminatedPlayersFromPhases = computed(() => {
        if (!gamePhasesStore.phases.length) return []
        
        const removedBoxIds = gamePhasesStore.getRemovedPlayersUpToPhase(gamePhasesStore.currentPhaseId)
        return removedBoxIds
    })

    const getAlivePlayersFromPhases = computed(() => {
        if (!gamePhasesStore.phases.length) {
            return gameState.value.players.filter(p => p.isAlive && !p.isEliminated)
        }
        
        const aliveBoxIds = gamePhasesStore.getAlivePlayersAtPhase(gamePhasesStore.currentPhaseId)
        return gameState.value.players.filter(p => aliveBoxIds.includes(p.id))
    })

    // Getters
    const currentPlayer = computed(() => (playerId) => {
	return gameState.value.players.find(p => p.id === playerId)
    })

    const alivePlayers = computed(() => {
	return getAlivePlayersFromPhases.value
    })

    const isInRoleDistribution = computed(() => {
	return gameState.value.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION
    })

    const canEditRoles = computed(() => {
	// Можно редактировать роли только в статусе распределения ролей
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
            
            await gamePhasesStore.saveGamePhases()
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
		const gameStateData = await loadGameDetailed(gameId)
		// Инициализируем gamePhasesStore
		gamePhasesStore.initializeGame(gameId)
		// Пытаемся загрузить фазы (может не существовать для старых игр)
		const gameStatus = gameInfo.value?.gameData?.status || gameInfo.value?.gameData?.result
		await gamePhasesStore.loadGamePhases(gameId, gameStatus, gameStateData)
		
		// Синхронизируем раунд с фазами
		gameState.value.round = gamePhasesStore.currentPhaseId
		
		// Синхронизируем состояния игроков с фазами
		syncPlayersWithPhases()
	    } else {
		initPlayers()
		setGameStatus(GAME_STATUSES.SEATING_READY)
		// Инициализируем gamePhasesStore для новой игры
		if (gameId) {
		    gamePhasesStore.initializeGame(gameId)
		}
	    }
	} catch (error) {
	    console.error('Ошибка инициализации игры:', error)
	    throw error
	}
    }

    const loadGameDetailed = async (gameId) => {
	try {
	    console.log('Loading game with ID:', gameId)
	    
	    // Всегда сначала загружаем базовую информацию об игре (включая eventId)
	    const gameData = await apiService.getGame(gameId)
	    console.log('Базовая информация об игре:', gameData)
	    
	    // Затем загружаем полное состояние игры если игра активна
	    let gameStateData = null
	    if (gameData && (gameData.status === 'in_progress' || gameData.result)) {
		try {
		    gameStateData = await apiService.getGameState(gameId)
		    console.log('Полное состояние игры загружено:', gameStateData)
		} catch (error) {
		    console.log('Не удалось загрузить состояние игры:', error)
		}
	    }
	    
	    if (gameData) {
		// Загружаем основную информацию об игре
		gameInfo.value.gameData = gameData
		
		// Извлекаем eventId из данных игры (всегда обновляем из свежих данных)
		gameInfo.value.eventId = gameData.event?.id || gameData.event_id
		
		console.log('Loaded game data:', gameData)
		console.log('gameInfo after assignment:', gameInfo.value)
		
		// Инициализируем игроков из детальной информации
		if (gameData.players && gameData.players.length > 0) {
		    console.log('Loading players from API:', gameData.players)
		    
		    // Создаем массив из 10 пустых слотов
		    const playersArray = Array(10).fill(null).map((_, index) => ({
			id: index + 1,
			name: '',
			role: null, // Изначально роли не назначены
			originalRole: null,
			fouls: 0,
			nominated: null,
			isAlive: true,
			isEliminated: false,
			isSilent: false,
			silentNextRound: false,
			userId: null
		    }))
		    
		    // Заполняем данными из API
		    gameData.players.forEach((apiPlayer) => {
			const slotIndex = (apiPlayer.box_id || 1) - 1 // box_id начинается с 1
			if (slotIndex >= 0 && slotIndex < 10) {
			    // Если роль null или не определена:
			    // - Для игр в процессе или завершенных - это мирный житель
			    // - Для новых игр - оставляем null
			    const isGameStarted = gameData.status === 'in_progress' || gameData.result
			    const localRole = apiPlayer.role ? (API_TO_LOCAL_ROLES[apiPlayer.role] || PLAYER_ROLES.CIVILIAN) : (isGameStarted ? PLAYER_ROLES.CIVILIAN : null)
			    const playerName = apiPlayer.nickname || ''
			    const userId = apiPlayer.id || null
			    
			    playersArray[slotIndex] = {
				id: apiPlayer.box_id || (slotIndex + 1),
				name: playerName,
				role: localRole,
				originalRole: localRole,
				fouls: apiPlayer.fouls_count || 0,
				nominated: null,
				isAlive: !apiPlayer.is_killed && !apiPlayer.is_removed,
				isEliminated: apiPlayer.is_removed || false,
				isSilent: false,
				silentNextRound: false,
				userId: userId,
				boxId: apiPlayer.box_id
			    }
			    console.log(`Player loaded: slot ${slotIndex + 1}, name: ${playerName}, role: ${localRole}, userId: ${userId}`)
			}
		    })
		    
		    gameState.value.players = playersArray
		} else {
		    initPlayers()
		}
		
		// Применяем данные состояния игры, если они есть (gameStateData не null означает что мы загрузили полное состояние)
		if (gameStateData) {
		    // Применяем все поля состояния, кроме игроков (они уже загружены выше)
		    const { players, ...stateWithoutPlayers } = gameStateData
		    Object.assign(gameState.value, stateWithoutPlayers)
		    
		    // Обрабатываем bestMoveTargets если это массив
		    if (gameStateData.bestMoveTargets && Array.isArray(gameStateData.bestMoveTargets)) {
			gameState.value.bestMoveTargets = new Set(gameStateData.bestMoveTargets)
		    }
		}
		
		// Устанавливаем статус игры на основе данных
		if (gameData.result) {
		    gameState.value.gameStatus = gameData.result
		    gameState.value.isGameStarted = true
		} else if (gameData.status === 'in_progress') {
		    gameState.value.gameStatus = GAME_STATUSES.IN_PROGRESS
		    gameState.value.isGameStarted = true
		    // Если состояние не загружено, устанавливаем подстатус по умолчанию
		    if (!gameStateData) {
			gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
		    }
		} else {
		    setGameStatus(GAME_STATUSES.SEATING_READY)
		    gameState.value.isGameStarted = false
		}
		
		return gameStateData
	    }
	    return null
	} catch (error) {
	    console.error('Ошибка загрузки детальной информации игры:', error)
	    return null
	}
    }


    // saveGameState method removed - use gamePhasesStore.saveGamePhases() instead

    const confirmSeating = async () => {
	if (!gameInfo.value?.gameId) {
	    return { success: false, message: 'ID игры не найден' }
	}

	try {
	    // Подготавливаем данные игроков для отправки на сервер
	    const playersData = gameState.value.players
		.filter(p => p.name && p.name.trim() !== '')
		.map(player => ({
		    box_id: player.id,
		    user_id: player.userId,
		    role: player.role ? API_PLAYER_ROLES[player.role] : null, // Отправляем null если роль не назначена
		    fouls_count: player.fouls || 0
		}))

	    if (playersData.length === 0) {
		return { success: false, message: 'Нет игроков для сохранения' }
	    }

	    // Отправляем игроков на сервер
	    await apiService.createGamePlayers(gameInfo.value.gameId, playersData)
	    
	    // Обновляем статус игры на seating_ready
	    await apiService.updateGame(gameInfo.value.gameId, {
		status: 'seating_ready'
	    })
	    
	    // Обновляем локальный статус
	    setGameStatus(GAME_STATUSES.SEATING_READY)
	    
	    // Сохраняем состояние игры
	    await gamePhasesStore.saveGamePhases()
	    
	    return { success: true, message: `Рассадка сохранена для ${playersData.length} игроков` }
	    
	} catch (error) {
	    console.error('Ошибка сохранения рассадки:', error)
	    return { success: false, message: 'Ошибка сохранения рассадки на сервере' }
	}
    }

    const updateSeating = async () => {
	if (!gameInfo.value?.gameId) {
	    return { success: false, message: 'ID игры не найден' }
	}

	try {
	    // Подготавливаем данные игроков для отправки на сервер
	    const playersData = gameState.value.players
		.filter(p => p.name && p.name.trim() !== '')
		.map(player => ({
		    box_id: player.id,
		    user_id: player.userId,
		    role: null, // При обновлении рассадки роли не отправляем
		    fouls_count: player.fouls || 0
		}))

	    if (playersData.length === 0) {
		return { success: false, message: 'Нет игроков для сохранения' }
	    }

	    // Обновляем игроков на сервере используя AddPlayersToGame
	    await apiService.addPlayersToGame(gameInfo.value.gameId, playersData)
	    
	    return { success: true, message: `Рассадка обновлена для ${playersData.length} игроков` }
	    
	} catch (error) {
	    console.error('Ошибка обновления рассадки:', error)
	    return { success: false, message: 'Ошибка обновления рассадки на сервере' }
	}
    }

    const initPlayers = () => {
	gameState.value.players = []
	for (let i = 1; i <= 10; i++) {
	    gameState.value.players.push({
		id: i,
		name: '',
		role: null, // Изначально роли не назначены
		originalRole: null,
		fouls: 0,
		nominated: null,
		isAlive: true,
		isEliminated: false,
		isSilent: false,
		silentNextRound: false,
		userId: null
	    })
	    gameState.value.scores[i] = { baseScore: 0, additionalScore: 0 }
	}
    }

    const setGameStatus = (status, substatus = null) => {
	gameState.value.gameStatus = status
	gameState.value.gameSubstatus = substatus
	
	// Автоматически скрываем роли с начала договорки
	if (status === GAME_STATUSES.NEGOTIATION || status === GAME_STATUSES.FREE_SEATING || status === GAME_STATUSES.IN_PROGRESS) {
	    gameState.value.rolesVisible = false
	}
    }

    const updatePlayer = (playerId, updates) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    Object.assign(player, updates)
	}
    }

    const shufflePlayers = async () => {
	try {
	    // Загружаем всех пользователей из базы
	    const response = await apiService.getUsers()
	    const allUsers = response.items || response || []
	    
	    if (allUsers.length === 0) {
		return { success: false, message: 'Нет пользователей в базе данных' }
	    }
	    
	    // Выбираем 10 случайных пользователей (или сколько есть, если меньше 10)
	    const shuffledUsers = [...allUsers]
	    for (let i = shuffledUsers.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledUsers[i], shuffledUsers[j]] = [shuffledUsers[j], shuffledUsers[i]]
	    }
	    
	    const selectedUsers = shuffledUsers.slice(0, 10)
	    
	    // Очищаем всех игроков
	    gameState.value.players.forEach(player => {
		player.name = ''
		player.userId = null
	    })
	    
	    // Назначаем случайных пользователей на случайные места
	    selectedUsers.forEach((user, index) => {
		if (index < gameState.value.players.length) {
		    gameState.value.players[index].name = user.nickname || 'Без никнейма'
		    gameState.value.players[index].userId = user.id
		}
	    })
	    
	    return { success: true, message: `Рассажено ${selectedUsers.length} игроков` }
	    
	} catch (error) {
	    console.error('Ошибка загрузки пользователей:', error)
	    return { success: false, message: 'Ошибка загрузки пользователей из базы' }
	}
    }

    const changePlayerRole = (playerId) => {
	if (!canEditRoles.value) return

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
	
	// Если роль не назначена (null), начинаем с мирного
	if (!currentRole || currentRole === PLAYER_ROLES.CIVILIAN) {
	    if (mafiaCount < 2) return PLAYER_ROLES.MAFIA
	    if (donCount < 1) return PLAYER_ROLES.DON
	    if (sheriffCount < 1) return PLAYER_ROLES.SHERIFF
	    return PLAYER_ROLES.CIVILIAN
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
	    // Записываем в фазы
	    gamePhasesStore.addRemovedPlayer(player.id) // используем box_id
	    
	    // Обновляем локальное состояние для совместимости
	    player.isEliminated = true
	    player.isAlive = false
	    if (!gameState.value.eliminatedPlayers.includes(playerId)) {
	        gameState.value.eliminatedPlayers.push(playerId)
	    }
	    
	    // Убираем номинации этого игрока
	    gameState.value.players.forEach(p => {
		if (p.nominated === playerId) {
		    p.nominated = null
		}
	    })
	    
	    // Сохраняем фазы
	    gamePhasesStore.saveGamePhases()
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
	try {
	    // 1. Пытаемся коммитить рассадку, но не останавливаемся если не получается
	    try {
		const seatingResult = await confirmSeating()
		if (!seatingResult.success) {
		    console.warn(`Не удалось обновить рассадку: ${seatingResult.message}`)
		}
	    } catch (error) {
		console.warn('Ошибка при коммите рассадки, но продолжаем:', error)
	    }
	    
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
	    
	    // 2. Инициализируем gamePhasesStore
	    if (gameInfo.value?.gameId) {
		if (gamePhasesStore.gameId !== gameInfo.value.gameId) {
		    gamePhasesStore.initializeGame(gameInfo.value.gameId)
		}
		
		// 3. Создаем первую фазу на сервере
		const phaseResult = await gamePhasesStore.createPhaseOnServer()
		if (!phaseResult) {
		    console.warn('Не удалось создать фазу на сервере, но продолжаем')
		}
	    }
	    
	    return true
	} catch (error) {
	    console.error('Ошибка при запуске игры:', error)
	    throw error
	}
    }

    const nextRound = () => {
	gameState.value.round++
	gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
	
	// Переходим к следующей фазе
	gamePhasesStore.nextPhase()
	gamePhasesStore.saveGamePhases()
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
	    // Обновляем в фазах
	    gamePhasesStore.addFoul(player.id) // используем box_id
	    
	    // Обновляем локальное состояние для совместимости
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
		// Также записываем в removed_box_ids
		gamePhasesStore.addRemovedPlayer(player.id)
	    }
	    
	    gamePhasesStore.saveGamePhases()
	}
    }

    const removeFoul = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player && player.fouls > 0) {
	    // Обновляем в фазах
	    gamePhasesStore.removeFoul(player.id) // используем box_id
	    
	    // Обновляем локальное состояние для совместимости
	    player.fouls--
	    
	    gamePhasesStore.saveGamePhases()
	}
    }

    const setDonTarget = (playerId) => {
	// Сохраняем в старом формате для совместимости
	gameState.value.donTarget = playerId
	
	// Записываем в фазы
	const player = currentPlayer.value(playerId)
	if (player) {
	    gamePhasesStore.setDonCheck(player.id) // используем box_id
	    gamePhasesStore.saveGamePhases()
	}
    }

    const setSheriffTarget = (playerId) => {
	// Сохраняем в старом формате для совместимости
	gameState.value.sheriffTarget = playerId
	
	// Записываем в фазы
	const player = currentPlayer.value(playerId)
	if (player) {
	    gamePhasesStore.setSheriffCheck(player.id) // используем box_id
	    gamePhasesStore.saveGamePhases()
	}
    }

    const setNightKill = (playerId) => {
	// Сохраняем в старом формате для совместимости
	gameState.value.nightKill = playerId
	
	// Записываем в фазы
	const player = currentPlayer.value(playerId)
	if (player) {
	    gamePhasesStore.setKilled(player.id) // используем box_id
	    gamePhasesStore.saveGamePhases()
	}
    }

    const applyNightKill = () => {
	if (gameState.value.nightKill) {
	    const player = currentPlayer.value(gameState.value.nightKill)
	    if (player && player.isAlive) {
		// Обновляем локальное состояние для совместимости
		player.isAlive = false
		player.status = 'KILLED'
		if (!gameState.value.deadPlayers.includes(gameState.value.nightKill)) {
		    gameState.value.deadPlayers.push(gameState.value.nightKill)
		}
	    }
	    gameState.value.nightKill = null
	}
    }

    const toggleBestMoveTarget = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player) {
	    // Используем новую систему фаз
	    gamePhasesStore.toggleBestMoveTarget(player.id) // используем box_id
	    
	    // Обновляем старое состояние для совместимости
	    const targets = Array.from(gameState.value.bestMoveTargets)
	    const index = targets.indexOf(playerId)
	    
	    if (index !== -1) {
		targets.splice(index, 1)
	    } else if (targets.length < 3) {
		targets.push(playerId)
	    }
	    
	    gameState.value.bestMoveTargets = new Set(targets)
	    gamePhasesStore.saveGamePhases()
	}
    }

    const setPPK = (playerId) => {
	// Записываем в фазы
	const player = currentPlayer.value(playerId)
	if (player) {
	    gamePhasesStore.setPPK(player.id) // используем box_id
	    gamePhasesStore.saveGamePhases()
	}
    }

    const useBestMove = () => {
	gameState.value.bestMoveUsed = true
	gameState.value.showBestMove = false
	gamePhasesStore.saveGamePhases()
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
    
    // Синхронизация состояний игроков с фазами
    const syncPlayersWithPhases = () => {
	if (!gamePhasesStore.phases.length) return
	
	const currentPhaseId = gamePhasesStore.currentPhaseId
	const killedPlayers = gamePhasesStore.getKilledPlayersUpToPhase(currentPhaseId)
	const removedPlayers = gamePhasesStore.getRemovedPlayersUpToPhase(currentPhaseId)
	
	// Обновляем состойния игроков на основе фаз
	gameState.value.players.forEach(player => {
	    const isKilled = killedPlayers.includes(player.id)
	    const isRemoved = removedPlayers.includes(player.id)
	    
	    player.isAlive = !isKilled && !isRemoved
	    player.isEliminated = isRemoved
	    
	    // Обновляем фолы из текущей фазы
	    const foulsCount = gamePhasesStore.getPlayerFoulsAtPhase(player.id, currentPhaseId)
	    player.fouls = foulsCount
	})
    }

    return {
	// State
	gameInfo,
	gameState,
	
	// Helper methods
	getPlayerByBoxId,
	getBoxIdByPlayerId,
	getPlayerByUserId,
	getDeadPlayersFromPhases,
	getEliminatedPlayersFromPhases,
	getAlivePlayersFromPhases,
	
	// Getters
	currentPlayer,
	alivePlayers,
	isInRoleDistribution,
	canEditRoles,
	isGameInProgress,
	canStartGame,
	
	// Actions
	checkBestMove,
	finishGame,
	setBaseScores,
	setPlayerScore,
	getPlayerScore,
	initGame,
	loadGameDetailed,
	confirmSeating,
	updateSeating,
	initPlayers,
	setGameStatus,
	updatePlayer,
	shufflePlayers,
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
	setDonTarget,
	setSheriffTarget,
	setNightKill,
	applyNightKill,
	setPPK,
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
