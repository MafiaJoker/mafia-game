// controllers/game-controller.js
import gameModel from '../models/game-model.js';
import gameView from '../views/game-view.js';
import timerService from '../utils/timer-service.js';
import nightActionsService from '../services/night-actions-service.js';
import votingService from '../services/voting-service.js';
import { GAME_PHASES, NO_CANDIDATES_MAX_ROUNDS, MAX_FOULS } from '../utils/constants.js';
import localization from '../utils/localization.js';
import eventModel from '../models/event-model.js'; // Добавить эту строку

export class GameController {
    constructor() {
        // Регистрируем обработчики событий от модели
        gameModel.on('playerRoleChanged', (player) => {
            this.updatePlayers();
        });
        
        gameModel.on('canStartGameChanged', (canStart) => {
            gameView.elements.startGame.classList.toggle('d-none', !canStart);
        });
        
        gameModel.on('rolesVisibilityChanged', (visible) => {
            this.updatePlayers();
        });
        
        // Обработчики событий таймера
        timerService.on('tick', (time) => {
            gameView.updateTimer(time);
        });
        
        timerService.on('reset', (time) => {
            gameView.updateTimer(time);
        });
        
        // Обработчики ночных действий
        nightActionsService.on('sheriffCheck', (result) => {
            // Отображение результата проверки шерифа
            gameView.updateSheriffCheckResult(result);
        });
        
        nightActionsService.on('donCheck', (result) => {
            // Отображение результата проверки дона
            gameView.updateDonCheckResult(result);
        });
        
	nightActionsService.on('nightActionsApplied', (result) => {
	    // Обработка завершения ночи
	    gameView.updateGamePhase(GAME_PHASES.DAY);
	    gameView.updateRound(result.round);
	    
	    // Проверяем логирование
	    console.log("Ночные действия применены, round:", result.round);
	    console.log("Убитые игроки:", gameModel.state.deadPlayers);
	    console.log("Исключенные игроки:", gameModel.state.eliminatedPlayers);
	    
	    // Проверяем, нужно ли показать лучший ход
	    const bestMoveShown = this.checkForBestMove();
	    
	    // Если лучший ход не показан, обновляем UI
	    if (!bestMoveShown) {
		this.updatePlayers();
		this.updateNominatedPlayers();
	    }
	});
        
        // Обработчики голосования
        votingService.on('votingStarted', (nominatedPlayers) => {
            gameView.updateGamePhase(GAME_PHASES.VOTING);
            gameView.renderVotingOptions(nominatedPlayers, gameModel.state.votingResults);
        });
        
        votingService.on('votesRegistered', (data) => {
            gameView.renderVotingOptions(gameModel.state.nominatedPlayers, data.results);
        });
        
        votingService.on('shootoutStarted', (players) => {
            gameView.showGameStatus(
                localization.t('gameStatus', 'shootout') +
                players.map(id => {
                    const player = gameModel.getPlayer(id);
                    return `${id}: ${player.name}`;
                }).join(', ')
            );
            gameView.renderVotingOptions(players, {});
        });
        
        votingService.on('tooManyPlayersToEliminate', (data) => {
            gameView.showGameStatus(
                localization.t('gameStatus', 'tooManyPlayers', data.count, data.totalAlive),
                'warning'
            );
            gameView.elements.goToNight.classList.remove('d-none');
            gameView.elements.votingControls.classList.add('d-none');
            
            this.checkGameEnd();
        });
        
        votingService.on('multipleEliminationVoting', (players) => {
            // Интерфейс голосования за поднятие нескольких игроков
            gameView.renderMultipleEliminationVoting(players);
        });
        
        votingService.on('playerEliminated', (data) => {
            // Игрок удален в результате голосования
            this.updatePlayers();
            this.checkGameEnd();
        });
        
        votingService.on('multiplePlayersEliminated', (players) => {
            gameView.showGameStatus(
                localization.t('gameStatus', 'playerEliminated', 
                    players.map(id => id).join(', ')),
                'warning'
            );
            gameView.elements.goToNight.classList.remove('d-none');
            gameView.elements.votingSection.classList.add('d-none');
            
            this.updatePlayers();
            this.checkGameEnd();
        });
        
        votingService.on('insufficientVotes', () => {
            gameView.showGameStatus(
                localization.t('gameStatus', 'insufficientVotes'),
                'warning'
            );
            gameView.elements.goToNight.classList.remove('d-none');
            gameView.elements.votingSection.classList.add('d-none');
            
            this.checkGameEnd();
        });
        
        votingService.on('votingCompleted', () => {
            gameView.elements.votingSection.classList.add('d-none');
            gameView.elements.votingControls.classList.add('d-none');
            gameView.elements.goToNight.classList.remove('d-none');
        });
    }

    initGame() {
        try {
	    // Получаем параметры из URL
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = parseInt(urlParams.get('eventId'));
            const tableId = parseInt(urlParams.get('tableId'));
            const gameId = parseInt(urlParams.get('gameId'));
            
            // Если есть ID игры, пытаемся загрузить существующую игру
            if (eventId && tableId && gameId) {
		const event = eventModel.getEventById(eventId);
		if (event) {
                    const table = event.tables.find(t => t.id === tableId);
                    if (table && table.games) {
			const game = table.games.find(g => g.id === gameId);
			if (game) {
                            this.loadExistingGame(game, event, table);
                            return;
			}
                    }
		}
            }
	    
            // Инициализация модели уже произошла в конструкторе
            this.setupEventListeners();
	    gameView.initModalHandlers(); // Инициализируем обработчики модальных окон
            this.updatePlayers();
        } catch (error) {
            console.error('Ошибка инициализации игры:', error);
            gameView.showGameStatus('Не удалось инициализировать игру. Пожалуйста, обновите страницу.', 'danger');
        }
    }

    // Добавим метод для загрузки существующей игры
    async loadExistingGame(game, event, table) {
	// Сохраняем информацию о текущей игре
	gameModel.currentGameInfo = {
            eventId: event.id,
            tableId: table.id,
            gameId: game.id
	};
	
	// Пробуем загрузить состояние игры с сервера
	const stateLoaded = await gameModel.loadGameState();
	
	// Если состояние не загружено, инициализируем стандартное состояние
	if (!stateLoaded) {
            if (game.status === "in_progress" || game.status === "finished") {
		gameModel.state.round = game.currentRound || 0;
		gameModel.state.phase = game.status === "finished" ? "end" : "day";
		gameModel.state.isGameStarted = true;
		
		// Настраиваем интерфейс в соответствии с состоянием игры
		gameView.updateGamePhase(gameModel.state.phase);
		gameView.updateRound(gameModel.state.round);
		gameView.elements.ppkButton.classList.remove('d-none');
		gameView.elements.eliminatePlayerButton.classList.remove('d-none');
		
		// Если игра завершена, показываем результат
		if (game.status === "finished") {
                    let message = "";
                    if (game.result === "city_win") {
			message = localization.t('gameStatus', 'cityWin');
			gameView.showGameStatus(message, 'success');
                    } else if (game.result === "mafia_win") {
			message = localization.t('gameStatus', 'mafiaWin');
			gameView.showGameStatus(message, 'danger');
                    } else if (game.result === "draw") {
			message = localization.t('gameStatus', 'draw');
			gameView.showGameStatus(message, 'warning');
                    }
                    
                    gameView.disableGameControls();
		}
            } else {
		// Для игры в статусе "Не начата"
		gameModel.state.phase = GAME_PHASES.DISTRIBUTION;
		gameView.updateGamePhase(GAME_PHASES.DISTRIBUTION);
            }
	} else {
            // Если состояние успешно загружено, обновляем интерфейс
            gameView.updateGamePhase(gameModel.state.phase);
            gameView.updateRound(gameModel.state.round);
            
            if (gameModel.state.isGameStarted) {
		gameView.elements.ppkButton.classList.remove('d-none');
		gameView.elements.eliminatePlayerButton.classList.remove('d-none');
            }
            
            if (game.status === "finished") {
		gameView.disableGameControls();
            }
	}
	
	this.setupEventListeners();
	gameView.initModalHandlers();
	this.updatePlayers();
	
    }

    updatePlayers() {
        const callbacks = {
            onRoleChange: (playerId) => gameModel.changePlayerRole(playerId),
            onSilentNow: (playerId) => this.setSilentNow(playerId),
            onSilentNext: (playerId) => this.setSilentNextRound(playerId),
            onEliminate: (playerId) => this.eliminatePlayer(playerId),
	    onNominate: (nominatorId, nominatedId) => this.nominatePlayer(nominatorId, nominatedId),
	    onIncrementFoul: (playerId) => this.incrementFoul(playerId),
            onResetFouls: (playerId) => this.resetFouls(playerId)
        };
        
        gameView.renderPlayers(gameModel.state.players, gameModel.state, callbacks);
    }

    // Добавить новые методы для работы с фолами
    incrementFoul(playerId) {
	const player = gameModel.getPlayer(playerId);
	if (player) {
            // Проверяем, можно ли увеличить фолы
            if (player.fouls < MAX_FOULS.BEFORE_SILENCE || 
		(player.fouls === MAX_FOULS.BEFORE_SILENCE && (player.isSilent || player.silentNextRound)) ||
		player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) {
		player.incrementFoul();
		this.updatePlayers();
            }
	}
    }

    resetFouls(playerId) {
	const player = gameModel.getPlayer(playerId);
	if (player) {
            player.fouls = 0;
            this.updatePlayers();
	}
    }
    
    setupEventListeners() {
        // Установка обработчиков событий для всех элементов UI
        gameView.elements.startDistribution.addEventListener('click', () => this.initDistribution());
        gameView.elements.startGame.addEventListener('click', () => this.startGame());
        gameView.elements.startVoting.addEventListener('click', () => this.startVoting());
        gameView.elements.goToNight.addEventListener('click', () => this.goToNight());
        
        gameView.elements.confirmVoting.addEventListener('click', () => this.confirmVoting());
        gameView.elements.resetVoting.addEventListener('click', () => this.resetVoting());
        gameView.elements.confirmNight.addEventListener('click', () => this.confirmNight());
        gameView.elements.confirmBestMove.addEventListener('click', () => this.confirmBestMove());
        
        gameView.elements.startTimer.addEventListener('click', () => timerService.start());
        gameView.elements.stopTimer.addEventListener('click', () => timerService.stop());
        gameView.elements.resetTimer.addEventListener('click', () => timerService.reset());

        // Обработчики ППК
        gameView.elements.ppkButton.addEventListener('click', () => gameView.showPpkControls());
        gameView.elements.cancelPpk.addEventListener('click', () => gameView.hidePpkControls());
        gameView.elements.mafiaWin.addEventListener('click', () => this.declareMafiaWin());
        gameView.elements.cityWin.addEventListener('click', () => this.declareCityWin());

	gameView.elements.eliminatePlayerButton.addEventListener('click', () => this.showEliminatePlayerModal());
        
        // Обработчик для переключения видимости ролей
        document.querySelector('.row.mb-2.fw-bold .col-2.text-center').
	    addEventListener('click', () => gameModel.toggleRolesVisibility());
    }

    showEliminatePlayerModal() {
	gameView.showEliminatePlayerModal(gameModel.state.players);
    }

    initDistribution() {
        gameModel.state.phase = GAME_PHASES.DISTRIBUTION;
        gameView.updateGamePhase(GAME_PHASES.DISTRIBUTION);
        this.updatePlayers();
    }

    startGame() {
        if (!gameModel.canStartGame()) {
            alert('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!');
            return;
        }
        
        gameModel.state.isGameStarted = true;
        gameModel.state.phase = GAME_PHASES.DAY;
        
        gameView.updateGamePhase(GAME_PHASES.DAY);
        gameView.elements.ppkButton.classList.remove('d-none');
	gameView.elements.eliminatePlayerButton.classList.remove('d-none'); // Показываем кнопку удаления

	// Обновляем статус игры в хранилище
	this.updateGameStatus("in_progress");
	
        // Проверяем условия для начала голосования
        this.updateNominatedPlayers();
        
        // Запускаем таймер
        timerService.reset();
        
        this.updatePlayers();
    }

    startVoting() {
	// Если только одна кандидатура и это не нулевой круг - сразу автоматически выбываем
	if (gameModel.state.nominatedPlayers.length === 1 && gameModel.state.round > 0) {
            const eliminatedPlayerId = gameModel.state.nominatedPlayers[0];
            const player = gameModel.getPlayer(eliminatedPlayerId);
            
            if (player) {
		// Показываем статус, что игрок выбывает
		gameView.showGameStatus(
                    `Игрок ${player.id}: ${player.name} автоматически выбывает как единственная кандидатура`,
                    'warning'
		);
		
		// Выбываем игрока
		this.eliminatePlayer(eliminatedPlayerId);
		
		// Очищаем номинации
		gameModel.state.nominatedPlayers = [];
		gameModel.state.players.forEach(p => { p.nominated = null; });
		
		// Показываем кнопку "В ночь"
		gameView.elements.startVoting.classList.add('d-none');
		gameView.elements.goToNight.classList.remove('d-none');
		
		return; // Выходим из функции, не начиная голосование
            }
	}
	
        votingService.startVoting();
    }

    confirmVoting() {
        votingService.confirmVoting();
    }

    resetVoting() {
        votingService.resetVoting();
    }

    goToNight() {
        gameModel.state.phase = GAME_PHASES.NIGHT;
        gameView.updateGamePhase(GAME_PHASES.NIGHT);
        
        // Сброс ночных целей
        gameModel.state.mafiaTarget = null;
        gameModel.state.donTarget = null;
        gameModel.state.sheriffTarget = null;
        gameModel.state.nominatedPlayers = [];

	// Очистка всех номинаций
	gameModel.state.players.forEach(p => {
            p.nominated = null;
	});

	this.updatePlayers();
	
        gameView.renderNightActions(gameModel.state.players);
    }

    selectMafiaTarget(playerId) {
        gameModel.state.mafiaTarget = playerId;
        gameView.renderNightActions(gameModel.state.players);
    }

    selectDonTarget(playerId) {
        gameModel.state.donTarget = playerId;
        const checkResult = nightActionsService.checkDon(playerId);
        gameModel.state.donTarget = playerId;
        gameView.renderNightActions(gameModel.state.players);
    }

    selectSheriffTarget(playerId) {
        gameModel.state.sheriffTarget = playerId;
        const checkResult = nightActionsService.checkSheriff(playerId);
        gameModel.state.sheriffTarget = playerId;
        gameView.renderNightActions(gameModel.state.players);
    }

    confirmNight() {
	const nightResult = nightActionsService.applyNightActions();
	gameView.updateGamePhase(GAME_PHASES.DAY);

	// Обновляем состояние игры при изменении круга
	this.updateGameStatus("in_progress");
	
	// Очистка результатов предыдущих ночных проверок
	gameView.elements.donResult.classList.add('d-none');
	gameView.elements.sheriffResult.classList.add('d-none');
    	
	// Здесь проверка на лучший ход, которая должна происходить перед обновлением игроков
	this.checkForBestMove();
	
	this.updatePlayers();
	this.checkGameEnd();
	this.updateNominatedPlayers();
    }
    
    updateNominatedPlayers() {
        gameModel.state.nominatedPlayers = [];
        const nominations = gameModel.state.players
              .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
              .map(p => p.nominated);
        
        const uniqueNominations = [...new Set(nominations)];
        
        uniqueNominations.forEach(id => {
            const player = gameModel.state.players.find(p => p.id === id);
            if (player && player.isAlive && !player.isEliminated) {
                gameModel.state.nominatedPlayers.push(id);
            }
        });
        
        // Показываем кнопку "Начать голосование", если есть номинации
        const startVotingBtn = gameView.elements.startVoting;
        const goToNightBtn = gameView.elements.goToNight;
        
        if (gameModel.state.phase === GAME_PHASES.DAY) {
            const playersCount = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
            
            if (gameModel.state.round === 0 && playersCount === 10) {
                // Первый день (нулевой круг) - требуется минимум 2 кандидатуры при 10 игроках
                if (gameModel.state.nominatedPlayers.length >= 2) {
                    startVotingBtn.classList.remove('d-none');
                    goToNightBtn.classList.add('d-none');
                } else {
                    startVotingBtn.classList.add('d-none');
                    goToNightBtn.classList.remove('d-none');
                }
            } else if (gameModel.state.nominatedPlayers.length >= 1) {
                // Для всех остальных случаев - требуется минимум 1 кандидатура
                startVotingBtn.classList.remove('d-none');
                goToNightBtn.classList.add('d-none');
            } else {
                // Нет кандидатур - идем в ночь
                startVotingBtn.classList.add('d-none');
                goToNightBtn.classList.remove('d-none');
            }
        }
    }

    checkForBestMove() {
	// Проверка на первого убитого для лучшего хода
	if (gameModel.state.deadPlayers.length === 1 && 
            gameModel.state.eliminatedPlayers.length === 0 && 
            gameModel.state.round === 1 &&
            !gameModel.state.bestMoveUsed) {  // Добавим проверку, что лучший ход еще не использован
            
            // Первый убитый (ПУ) имеет право на лучший ход
            this.showBestMove(gameModel.state.deadPlayers[0]);
            return true; // Возвращаем true, если показываем лучший ход
	} else {
            this.checkGameEnd();
            this.updateNominatedPlayers();
            return false;
	}
    }
    
    showBestMove(playerId) {
	const player = gameModel.getPlayer(playerId);
	if (!player) return false;
	
	console.log("Показываем лучший ход для игрока:", player); // Добавим логирование
	gameModel.state.bestMoveTargets = new Set();
	gameView.showBestMoveSection(player);
	return true;
    }
    
    toggleBestMoveTarget(playerId, button) {
        if (gameModel.state.bestMoveTargets.has(playerId)) {
            gameModel.state.bestMoveTargets.delete(playerId);
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
        } else if (gameModel.state.bestMoveTargets.size < 3) {
            gameModel.state.bestMoveTargets.add(playerId);
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
        }
        
        gameView.updateBestMoveSelection(gameModel.state.bestMoveTargets.size);
    }

    confirmBestMove() {
        gameModel.state.bestMoveUsed = true;
        gameView.hideBestMoveSection();
        this.updatePlayers();
        this.checkGameEnd();
        this.updateNominatedPlayers();
    }

    async eliminatePlayer(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.eliminate();
            gameModel.state.eliminatedPlayers.push(playerId);
            
            // Сбрасываем все номинации для этого игрока
            gameModel.state.players.forEach(p => {
                if (p.nominated === playerId) {
                    p.nominated = null;
                }
            });
            
            this.updatePlayers();
            this.checkGameEnd();

	    // Сохраняем состояние игры
            await gameModel.saveGameState();
        }
    }

    setSilentNow(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.setSilentNow();      
            this.updatePlayers();
        }
    }

    setSilentNextRound(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.setSilentNextRound();      
            this.updatePlayers();
        }
    }

    nominatePlayer(nominatorId, nominatedId) {
        const nominator = gameModel.getPlayer(nominatorId);
        
        if (nominatedId) {
            nominator.nominated = nominatedId;
        } else {
            nominator.nominated = null;
        }
        
        this.updateNominatedPlayers();
        this.updatePlayers();
    }

    checkGameEnd() {
        const mafiaCount = gameModel.state.players.filter(p => 
            (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
                p.isAlive && !p.isEliminated).length;
        
        const civilianCount = gameModel.state.players.filter(p => 
            (p.originalRole === 'Мирный' || p.originalRole === 'Шериф') && 
                p.isAlive && !p.isEliminated).length;
        
        if (mafiaCount === 0) {
            this.declareCityWin();
            return true;
        } else if (mafiaCount >= civilianCount) {
            this.declareMafiaWin();
            return true;
        } else if (gameModel.state.noCandidatesRounds >= NO_CANDIDATES_MAX_ROUNDS) {
            this.declareDraw();
            return true;
        }
        
        return false;
    }

    declareMafiaWin() {
        gameView.showGameStatus(
            localization.t('gameStatus', 'mafiaWin'),
            'danger'
        );
	this.updateGameStatus("finished", "mafia_win");
        this.endGame();
    }

    declareCityWin() {
        gameView.showGameStatus(
            localization.t('gameStatus', 'cityWin'),
            'success'
        );
	this.updateGameStatus("finished", "city_win");
        this.endGame();
    }

    declareDraw() {
        gameView.showGameStatus(
            localization.t('gameStatus', 'draw'),
            'warning'
        );
	this.updateGameStatus("finished", "draw");
        this.endGame();
    }

    // Добавим новый метод для обновления статуса игры
    updateGameStatus(status, result = null) {
	if (!gameModel.currentGameInfo) return;
	
	const { eventId, tableId, gameId } = gameModel.currentGameInfo;
	const event = eventModel.getEventById(eventId);
	if (!event) return;
	
	const table = event.tables.find(t => t.id === tableId);
	if (!table || !table.games) return;
	
	const game = table.games.find(g => g.id === gameId);
	if (!game) return;
	
	// Обновляем статус и информацию игры
	game.status = status;
	game.currentRound = gameModel.state.round;
	
	if (result) {
            game.result = result;
	}
	
	// Сохраняем изменения
	eventModel.saveEvents();
    }

    endGame() {
        gameModel.state.isGameStarted = false;
        
        // Отключаем все игровые действия
        gameView.disableGameControls();

	gameView.elements.ppkButton.classList.add('d-none');
	gameView.elements.eliminatePlayerButton.classList.add('d-none');
	
        // Показываем все роли
        gameModel.state.players.forEach(p => {
            p.role = p.originalRole;
        });
        this.updatePlayers();
        
        // Останавливаем таймер
        timerService.stop();
    }
}

export default new GameController();
