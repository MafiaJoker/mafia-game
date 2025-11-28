import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { GAME_STATUSES, GAME_SUBSTATUS, PLAYER_ROLES, API_PLAYER_ROLES, API_TO_LOCAL_ROLES } from '@/utils/constants.js'
import { GAME_RULES } from '@/utils/gameConstants.js'
import { apiService } from '@/services/api.js'
import { useGamePhasesStore } from './gamePhases.js'
import { LRUCache } from '@/utils/lruCache.js'

// LRU cache to store game states (max 100 games)
const gameStatesCache = new LRUCache(100)

// Create default state for a game
const createDefaultGameState = () => reactive({
    gameInfo: null,
    gameState: {
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
        votingHappenedThisRound: false,
        gameResult: null,
        last_phase_fouls: []
    }
})

export const useGameStore = defineStore('game', () => {
    // Get phases store
    const gamePhasesStore = useGamePhasesStore()

    // Утилитарная функция для получения настройки закрытой рассадки
    const getClosedSeatingForEvent = (eventId) => {
        if (!eventId) return false
        const savedClosedSeating = localStorage.getItem(`event_${eventId}_closed_seating`)
        return savedClosedSeating === 'true'
    }

    // Current game ID tracking
    const currentGameId = ref(null)

    // Get current game state from cache
    const getCurrentState = () => {
        if (!currentGameId.value) {
            return createDefaultGameState()
        }

        let state = gameStatesCache.get(currentGameId.value)
        if (!state) {
            state = createDefaultGameState()
            gameStatesCache.set(currentGameId.value, state)
        } else {
            // Update access time
            gameStatesCache.touch(currentGameId.value)
        }

        return state
    }

    // Reactive state accessors
    const gameInfo = computed({
        get: () => getCurrentState().gameInfo,
        set: (value) => {
            const state = getCurrentState()
            state.gameInfo = value
        }
    })

    const gameState = computed({
        get: () => getCurrentState().gameState,
        set: (value) => {
            const state = getCurrentState()
            state.gameState = value
        }
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
            return gameState.value.players.filter(p => p.isAlive && !p.isEliminated && p.isInGame !== false)
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

    const hasVotingInCurrentPhase = computed(() => {
	const currentPhase = gamePhasesStore.currentPhase
	return currentPhase && Array.isArray(currentPhase.voted_box_id)
    })

    // Computed property для номинированных игроков (используем прямой массив)
    const nominatedPlayers = computed(() => {
	return gameState.value.nominatedPlayers
    })

    // Определение кто начинает речь на текущем кругу

    // Actions
    const finishGame = async (result) => {
	try {
            // Устанавливаем статус завершенной игры
            setGameStatus(GAME_STATUSES.FINISHED_NO_SCORES)
            gameState.value.isGameStarted = false
            
            // Сохраняем результат игры
            gameState.value.gameResult = result
            
            // Устанавливаем базовые баллы в зависимости от результата
            setBaseScores(result)
            
            await gamePhasesStore.saveGamePhases()
            
            // Обновляем состояние игры после завершения
            await loadGameDetailed(gameInfo.value.gameId)
            
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
		(result === 'civilians_win' && (player.originalRole === PLAYER_ROLES.CIVILIAN || player.originalRole === PLAYER_ROLES.SHERIFF)) ||
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
	    gameState.value.round === 1 &&  // Проверяем в первом раунде (до создания новой фазы)
	    !gameState.value.bestMoveUsed) {
	    
	    gameState.value.showBestMove = true
	    return true
	}
	return false
    }

    const checkVictoryConditions = () => {
	const alivePlayers = gameState.value.players.filter(p => p.isInGame === true)
	const aliveMafia = alivePlayers.filter(p => p.originalRole === PLAYER_ROLES.MAFIA || p.originalRole === PLAYER_ROLES.DON)
	const aliveCivilians = alivePlayers.filter(p => p.originalRole === PLAYER_ROLES.CIVILIAN || p.originalRole === PLAYER_ROLES.SHERIFF)
	
	
	// Победа мирных - все мафия убиты
	if (aliveMafia.length === 0) {
	    finishGame('civilians_win')
	    return 'civilians_win'
	}
	
	// Победа мафии - мафии столько же или больше чем мирных
	if (aliveMafia.length >= aliveCivilians.length) {
	    finishGame('mafia_win')
	    return 'mafia_win'
	}
	
	return null
    }
    
    const initGame = async (eventId, tableId, gameId) => {
	try {
	    // Set current game ID for cache lookup
	    currentGameId.value = gameId

	    // Get or create state for this game
	    let state = gameStatesCache.get(gameId)
	    if (!state) {
		state = createDefaultGameState()
		gameStatesCache.set(gameId, state)
	    } else {
		gameStatesCache.touch(gameId)
	    }

	    gameInfo.value = { eventId, tableId, gameId, closedSeating: getClosedSeatingForEvent(eventId) }

	    if (gameId) {
		const gameStateData = await loadGameDetailed(gameId)
		// Инициализируем gamePhasesStore
		gamePhasesStore.initializeGame(gameId)
		// Пытаемся загрузить фазы (может не существовать для старых игр)
		const gameStatus = gameInfo.value?.gameData?.status || gameInfo.value?.gameData?.result
		await gamePhasesStore.loadGamePhases(gameId, gameStatus, gameStateData)

		// Синхронизируем фолы из gameState в фазы
		gamePhasesStore.syncFoulsFromGameState(gameState.value.players, gameState.value.last_phase_fouls)

		// Синхронизируем раунд с фазами
		gameState.value.round = gamePhasesStore.currentPhaseId

		// Синхронизируем состояния игроков с фазами
		syncPlayersWithPhases()

		// Обновляем closedSeating после загрузки eventId из gameData
		if (gameInfo.value.eventId) {
		    gameInfo.value.closedSeating = getClosedSeatingForEvent(gameInfo.value.eventId)
		}
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
	    // Set current game ID for cache lookup
	    if (currentGameId.value !== gameId) {
		currentGameId.value = gameId
	    }

	    // Update access time
	    if (gameStatesCache.has(gameId)) {
		gameStatesCache.touch(gameId)
	    }

	    // Всегда сначала загружаем базовую информацию об игре (включая eventId)
	    const gameData = await apiService.getGame(gameId)
	    
	    // Затем загружаем полное состояние игры если игра активна
	    let gameStateData = null
	    if (gameData && (gameData.status === 'in_progress' || gameData.result)) {
		try {
		    gameStateData = await apiService.getGameState(gameId)
		} catch (error) {
		}
	    }
	    
	    if (gameData) {
		// Инициализируем gameInfo если он null
		if (!gameInfo.value) {
		    gameInfo.value = { gameId: gameId }
		}
		
		// Загружаем основную информацию об игре
		gameInfo.value.gameData = gameData
		
		// Извлекаем eventId из данных игры (всегда обновляем из свежих данных)
		gameInfo.value.eventId = gameData.event?.id || gameData.event_id
		
		// Инициализируем игроков из детальной информации
		// Используем gameStateData.players если доступно (актуальные фолы), иначе gameData.players
		const playersSource = (gameStateData && gameStateData.players) ? gameStateData.players : gameData.players
		if (playersSource && playersSource.length > 0) {
		    
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
			userId: null,
			isInGame: true
		    }))
		    
		    // Заполняем данными из API
		    playersSource.forEach((apiPlayer) => {
			const slotIndex = (apiPlayer.box_id || 1) - 1 // box_id начинается с 1
			if (slotIndex >= 0 && slotIndex < 10) {
			    // Проверяем is_in_game - если false, игрок не участвует в игре
			    const isInGame = gameStateData ? (apiPlayer.is_in_game !== false) : true
			    
			    // Если роль null или не определена:
			    // - Для игр в процессе или завершенных - это мирный житель
			    // - Для новых игр - оставляем null
			    const isGameStarted = gameData.status === 'in_progress' || gameData.result
			    const localRole = apiPlayer.role ? (API_TO_LOCAL_ROLES[apiPlayer.role] || PLAYER_ROLES.CIVILIAN) : (isGameStarted ? PLAYER_ROLES.CIVILIAN : null)
			    const playerName = apiPlayer.nickname || ''
			    const userId = apiPlayer.id || null
			    
			    // Для gameStateData используем is_in_game, для gameData используем is_killed/is_removed
			    const isAlive = gameStateData ? apiPlayer.is_in_game : (!apiPlayer.is_killed && !apiPlayer.is_removed)
			    const isEliminated = gameStateData ? !apiPlayer.is_in_game : (apiPlayer.is_removed || false)
			    
			    const fouls = apiPlayer.fouls || 0
			    console.log(`Loading player ${apiPlayer.box_id}: fouls from API = ${fouls}`)
			    
			    playersArray[slotIndex] = {
				id: apiPlayer.box_id || (slotIndex + 1),
				name: playerName,
				role: localRole,
				originalRole: localRole,
				fouls: fouls,
				nominated: null,
				isAlive: isAlive,
				isEliminated: isEliminated,
				isSilent: false,
				silentNextRound: false,
				userId: userId,
				boxId: apiPlayer.box_id,
				isInGame: isInGame
			    }
			}
		    })
		    
		    gameState.value.players = playersArray
		} else {
		    initPlayers()
		}
		
		// Получаем статус из result или status
		const gameStatus = gameData.result || gameData.status
		
		if (gameStatus === 'in_progress') {
		    gameState.value.gameStatus = GAME_STATUSES.IN_PROGRESS
		    gameState.value.isGameStarted = true
		    // Подстатусы существуют только на фронте - сохраняем текущий подстатус если он есть
		    // Если подстатуса нет, ставим DISCUSSION по умолчанию
		    if (!gameState.value.gameSubstatus) {
		        gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
		    }
		} else if (gameStatus && gameStatus !== 'in_progress') {
		    // Завершённые игры (finished_with_scores, cancelled и т.д.)
		    gameState.value.gameStatus = gameStatus
		    gameState.value.isGameStarted = true
		} else {
		    setGameStatus(GAME_STATUSES.SEATING_READY)
		    gameState.value.isGameStarted = false
		}
		
		// Применяем данные состояния игры, если они есть, НО исключаем gameSubstatus
		if (gameStateData) {
		    // Исключаем players и gameSubstatus - они уже установлены выше
		    const { players, gameSubstatus, ...stateWithoutPlayersAndSubstatus } = gameStateData
		    Object.assign(gameState.value, stateWithoutPlayersAndSubstatus)
		    
		    // Обрабатываем bestMoveTargets если это массив
		    if (gameStateData.bestMoveTargets && Array.isArray(gameStateData.bestMoveTargets)) {
			gameState.value.bestMoveTargets = new Set(gameStateData.bestMoveTargets)
		    }
		    
		    // Собираем last_phase_fouls из игроков, если оно там
		    if (gameStateData.players) {
			// Всегда пересобираем last_phase_fouls из игроков
			gameState.value.last_phase_fouls = []
			gameStateData.players.forEach(player => {
			    console.log(`Player ${player.box_id} has last_phase_fouls:`, player.last_phase_fouls)
			    if (typeof player.last_phase_fouls === 'number' && player.box_id) {
				gameState.value.last_phase_fouls.push({
				    box_id: player.box_id,
				    count_fouls: player.last_phase_fouls
				})
			    }
			})
			console.log('Collected last_phase_fouls from players:', gameState.value.last_phase_fouls)
		    }
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
		    // При создании рассадки роли не отправляем, они будут назначены позже
		    role: null
		}))

	    if (playersData.length === 0) {
		return { success: false, message: 'Нет игроков для сохранения' }
	    }

	    // Отправляем игроков на сервер
	    await apiService.createGamePlayers(gameInfo.value.gameId, playersData)
	    
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
		    // При обновлении рассадки роли не отправляем
		    role: null
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

    const confirmRoles = async () => {
	if (!gameInfo.value?.gameId) {
	    return { success: false, message: 'ID игры не найден' }
	}

	try {
	    // Подготавливаем данные игроков с ролями для отправки на сервер
	    const playersData = gameState.value.players
		.filter(p => p.name && p.name.trim() !== '')
		.map(player => ({
		    box_id: player.id,
		    user_id: player.userId,
		    // Правильно переводим роли: null или не назначенная роль = civilian
		    role: player.role ? API_PLAYER_ROLES[player.role] : 'civilian'
		}))

	    if (playersData.length === 0) {
		return { success: false, message: 'Нет игроков для сохранения' }
	    }

	    // Отправляем роли на сервер
	    await apiService.addPlayersToGame(gameInfo.value.gameId, playersData)
	    
	    return { success: true, message: `Роли сохранены для ${playersData.length} игроков` }
	    
	} catch (error) {
	    console.error('Ошибка сохранения ролей:', error)
	    return { success: false, message: 'Ошибка сохранения ролей на сервере' }
	}
    }

    const initPlayers = () => {
	gameState.value.players = []
	for (let i = 1; i <= GAME_RULES.PLAYERS.MAX; i++) {
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
		userId: null,
        isInGame: true
	    })
	    gameState.value.scores[i] = { baseScore: 0, additionalScore: 0 }
	}
    }

    const setGameStatus = (status, substatus = null) => {
	gameState.value.gameStatus = status
	gameState.value.gameSubstatus = substatus
	
	// Автоматически показываем роли во время раздачи ролей
	if (status === GAME_STATUSES.ROLE_DISTRIBUTION) {
	    gameState.value.rolesVisible = true
	}
	
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
	    let allUsers = []
	    
	    // Если есть eventId, загружаем только подтвержденных участников события
	    if (gameInfo.value?.eventId) {
		const response = await apiService.getEventRegistrations(gameInfo.value.eventId, {
		    status: 'confirmed',
		    pageSize: 100
		})
		allUsers = (response.items || []).map(reg => ({
		    id: reg.user?.id || reg.user_id,
		    nickname: reg.user?.nickname || reg.user_nickname || 'Без никнейма'
		}))
	    } else {
		// Иначе загружаем всех пользователей из базы (обратная совместимость)
		const response = await apiService.getUsers()
		allUsers = response.items || response || []
	    }
	    
	    if (allUsers.length === 0) {
		const message = gameInfo.value?.eventId 
		    ? 'Нет подтвержденных участников события' 
		    : 'Нет пользователей в базе данных'
		return { success: false, message }
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
	      .filter(p => p.isAlive && !p.isEliminated && p.isInGame !== false && p.nominated !== null)
	      .map(p => p.nominated)
	
	gameState.value.nominatedPlayers = [...new Set(nominations)].filter(id => {
	    const player = currentPlayer.value(id)
	    return player && player.isAlive && !player.isEliminated && player.isInGame !== false
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
	    player.isInGame = false  // Игрок выбывает из игры
	    if (!gameState.value.eliminatedPlayers.includes(playerId)) {
	        gameState.value.eliminatedPlayers.push(playerId)
	    }
	    
	    // Удаляем выбывшего игрока из списка номинированных
	    const nominatedIndex = gameState.value.nominatedPlayers.indexOf(playerId)
	    if (nominatedIndex !== -1) {
	        gameState.value.nominatedPlayers.splice(nominatedIndex, 1)
	    }
	    
	    // Убираем номинации этого игрока
	    gameState.value.players.forEach(p => {
		if (p.nominated === playerId) {
		    p.nominated = null
		}
	    })
	    
	    // Сохраняем фазы
	    gamePhasesStore.saveGamePhases()
	    
	    // Синхронизируем статусы игроков с фазами
	    syncPlayersWithPhases()
	    
	    // Проверяем условия победы после выведения игрока
	    checkVictoryConditions()
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
	const gameId = config.gameId || null

	// Set current game ID for cache lookup
	currentGameId.value = gameId

	// Create or reset state for this game
	const state = createDefaultGameState()
	state.gameInfo = {
	    eventId: config.eventId,
	    tableId: config.tableId,
	    gameId: gameId
	}

	// Store in cache
	if (gameId) {
	    gameStatesCache.set(gameId, state)
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
	    // 1. Отправляем роли на сервер (вместо рассадки)
	    try {
		const rolesResult = await confirmRoles()
		if (!rolesResult.success) {
		    console.warn(`Не удалось обновить роли: ${rolesResult.message}`)
		}
	    } catch (error) {
		console.warn('Ошибка при коммите ролей, но продолжаем:', error)
	    }
	    
	    setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION)
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
		// Всегда инициализируем для обеспечения чистого состояния
		gamePhasesStore.initializeGame(gameInfo.value.gameId)
		
		// 3. Создаем первую фазу на сервере
		const phaseResult = await gamePhasesStore.createPhaseOnServer()
		if (!phaseResult) {
		    console.warn('Не удалось создать фазу на сервере, но продолжаем')
		}
		
		// 4. Загружаем актуальное состояние игры для синхронизации last_phase_fouls
		await loadGameDetailed(gameInfo.value.gameId)
		
		// 5. Синхронизируем фолы из gameState в фазы
		gamePhasesStore.syncFoulsFromGameState(gameState.value.players, gameState.value.last_phase_fouls)
	    }
	    
	    return true
	} catch (error) {
	    console.error('Ошибка при запуске игры:', error)
	    throw error
	}
    }

    const nextRound = () => {
	// Переходим к следующей фазе
	gamePhasesStore.nextPhase()
	
	// Синхронизируем раунд с фазами
	gameState.value.round = gamePhasesStore.currentPhaseId
	gameState.value.gameSubstatus = GAME_SUBSTATUS.DISCUSSION
	
	gamePhasesStore.saveGamePhases()
    }

    const incrementNoCandidatesRounds = () => {
	gameState.value.noCandidatesRounds++
    }

    const eliminatePlayerByVote = (playerId) => {
	const player = currentPlayer.value(playerId)
	if (player && player.isInGame === true) {
	    player.isAlive = false
	    player.isInGame = false  // Игрок выбывает из игры
	    player.status = 'VOTED_OUT'
	    gameState.value.deadPlayers.push(playerId)
	    
	    // Сбрасываем счетчик раундов без кандидатов
	    gameState.value.noCandidatesRounds = 0
	}
    }

    const addFoul = async (playerId) => {
	let player = currentPlayer.value(playerId)
	if (player) {
	    // Если у игрока уже 4 фола, сбрасываем их вместо добавления
	    if (player.fouls >= GAME_RULES.FOULS.ELIMINATION_THRESHOLD) {
		console.log(`Player ${playerId} has ${player.fouls} fouls (>= ${GAME_RULES.FOULS.ELIMINATION_THRESHOLD}), resetting...`)
		await resetPlayerFouls(playerId)
		return
	    }
	    
	    console.log(`Adding foul to player ${playerId}, current fouls: ${player.fouls}`)
	    
	    // 1. Получаем актуальные last_phase_fouls
	    await loadGameDetailed(gameInfo.value?.gameId)
	    gamePhasesStore.syncFoulsFromGameState(gameState.value.players, gameState.value.last_phase_fouls)
	    
	    // 2. Получаем свежую ссылку на игрока после загрузки
	    player = currentPlayer.value(playerId)
	    if (!player) return
	    
	    // 3. Добавляем фол локально
	    player.fouls = player.fouls + 1
	    
	    // 4. Добавляем фол в текущую фазу
	    gamePhasesStore.addFoul(player.id) // используем box_id
	    
	    console.log(`Player ${playerId} now has ${player.fouls} fouls`)
	    
	    // 5. Отправляем обновление на сервер
	    try {
		await gamePhasesStore.updateFoulsOnServer(player.id, gameState.value.last_phase_fouls)
		console.log('Fouls updated on server successfully')
	    } catch (error) {
		console.error('Error updating fouls on server:', error)
		// Откатываем изменения при ошибке
		player.fouls = player.fouls - 1
		gamePhasesStore.removeFoul(player.id)
	    }
	}
    }

    const resetPlayerFouls = async (playerId) => {
	let player = currentPlayer.value(playerId)
	if (player) {
	    console.log(`Resetting fouls for player ${playerId}, current fouls: ${player.fouls}`)
	    
	    // 1. Получаем актуальные last_phase_fouls
	    await loadGameDetailed(gameInfo.value?.gameId)
	    gamePhasesStore.syncFoulsFromGameState(gameState.value.players, gameState.value.last_phase_fouls)
	    
	    // 2. Получаем свежую ссылку на игрока после загрузки
	    player = currentPlayer.value(playerId)
	    if (!player) return
	    
	    // 3. Сбрасываем фолы локально
	    player.fouls = 0
	    
	    // 4. Модифицируем last_phase_fouls для этого игрока, чтобы отправить 0
	    const modifiedLastPhaseFouls = gameState.value.last_phase_fouls.map(foul => {
		if (foul.box_id === player.id) {
		    return { ...foul, count_fouls: 0 }
		}
		return foul
	    })
	    
	    // Если игрока не было в last_phase_fouls, добавляем его с 0 фолами
	    if (!modifiedLastPhaseFouls.find(f => f.box_id === player.id)) {
		modifiedLastPhaseFouls.push({ box_id: player.id, count_fouls: 0 })
	    }
	    
	    // 5. Сбрасываем фолы в текущей фазе
	    gamePhasesStore.resetFouls(player.id)
	    
	    // 6. Отправляем обновление на сервер с модифицированными last_phase_fouls
	    try {
		await gamePhasesStore.updateFoulsOnServer(player.id, modifiedLastPhaseFouls)
		console.log('Fouls reset on server successfully')
		
		// 7. Обновляем локальный last_phase_fouls
		gameState.value.last_phase_fouls = modifiedLastPhaseFouls
	    } catch (error) {
		console.error('Error resetting fouls on server:', error)
	    }
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
	const alivePlayers = gameState.value.players.filter(p => p.isAlive && !p.isEliminated && p.isInGame !== false).length
	return alivePlayers === 3 || alivePlayers === 4
    })
    
    // Синхронизация состояний игроков с фазами
    const syncPlayersWithPhases = () => {
	if (!gamePhasesStore.phases.length) {
	    console.log('syncPlayersWithPhases: No phases available')
	    return
	}
	
	const currentPhaseId = gamePhasesStore.currentPhaseId
	const killedPlayers = gamePhasesStore.getKilledPlayersUpToPhase(currentPhaseId)
	const removedPlayers = gamePhasesStore.getRemovedPlayersUpToPhase(currentPhaseId)
	
	console.log('syncPlayersWithPhases: Syncing players with phases, currentPhaseId:', currentPhaseId)
	
	// Обновляем состойния игроков на основе фаз
	gameState.value.players.forEach(player => {
	    const isKilled = killedPlayers.includes(player.id)
	    const isRemoved = removedPlayers.includes(player.id)
	    
	    player.isAlive = !isKilled && !isRemoved
	    player.isEliminated = isRemoved
	    
	    // НЕ обновляем фолы здесь, так как у нас есть только текущая фаза
	    // Фолы должны приходить из API и обновляться только при явных действиях
	    // player.fouls уже содержит правильное значение из API
	})
    }
    
    const updateGameState = async () => {
	try {
	    if (!gameInfo.value?.gameId) return false
	    
	    // Получаем актуальные данные игры
	    const gameStateData = await loadGameDetailed(gameInfo.value.gameId)
	    
	    // Проверяем статус игры
	    const gameStatus = gameInfo.value?.gameData?.status || gameInfo.value?.gameData?.result
	    if (gameStatus !== 'in_progress') {
		// Игра завершена
		gameState.value.gameStatus = gameStatus
		gameState.value.isGameStarted = false
		
		// Игра завершена - состояние уже обновлено через loadGameDetailed
		
		return true
	    }
	    
	    return true
	} catch (error) {
	    console.error('Ошибка обновления состояния игры:', error)
	    throw error
	}
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
	hasVotingInCurrentPhase,
	nominatedPlayers,
	
	// Actions
	checkBestMove,
	checkVictoryConditions,
	finishGame,
	setBaseScores,
	setPlayerScore,
	getPlayerScore,
	initGame,
	loadGameDetailed,
	confirmSeating,
	updateSeating,
	confirmRoles,
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
	resetPlayerFouls,
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
	updateGameState,
	syncPlayersWithPhases,
	
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
