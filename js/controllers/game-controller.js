// controllers/game-controller.js
import gameModel from '../models/game-model.js';
import gameView from '../views/game-view.js';
import timerService from '../utils/timer-service.js';
import nightActionsService from '../services/night-actions-service.js';
import votingService from '../services/voting-service.js';
import { GAME_PHASES, NO_CANDIDATES_MAX_ROUNDS } from '../utils/constants.js';
import localization from '../utils/localization.js';

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
            gameView.updateRound(result.round);
            this.checkForBestMove();
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
            // Инициализация модели уже произошла в конструкторе
            this.setupEventListeners();
            this.updatePlayers();
        } catch (error) {
            console.error('Ошибка инициализации игры:', error);
            gameView.showGameStatus('Не удалось инициализировать игру. Пожалуйста, обновите страницу.', 'danger');
        }
    }

    updatePlayers() {
        const callbacks = {
            onRoleChange: (playerId) => gameModel.changePlayerRole(playerId),
            onSilentNow: (playerId) => this.setSilentNow(playerId),
            onSilentNext: (playerId) => this.setSilentNextRound(playerId),
            onEliminate: (playerId) => this.eliminatePlayer(playerId)
        };
        
        gameView.renderPlayers(gameModel.state.players, gameModel.state, callbacks);
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
        
        // Обработчик для переключения видимости ролей
        document.querySelector('.row.mb-2.fw-bold .col-2.text-center').addEventListener('click', 
            () => gameModel.toggleRolesVisibility());
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
        
        // Проверяем условия для начала голосования
        this.updateNominatedPlayers();
        
        // Запускаем таймер
        timerService.reset();
        
        this.updatePlayers();
    }

    startVoting() {
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
        nightActionsService.applyNightActions();
        this.updatePlayers();
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
            gameModel.state.round === 1) {
            // Первый убитый (ПУ) имеет право на лучший ход
            this.showBestMove(gameModel.state.deadPlayers[0]);
        } else {
            this.checkGameEnd();
            this.updateNominatedPlayers();
        }
    }

    showBestMove(playerId) {
        const player = gameModel.getPlayer(playerId);
        gameView.showBestMoveSection(player);
        gameModel.state.bestMoveTargets = new Set();
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

    eliminatePlayer(playerId) {
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
        this.endGame();
    }

    declareCityWin() {
        gameView.showGameStatus(
            localization.t('gameStatus', 'cityWin'),
            'success'
        );
        this.endGame();
    }

    declareDraw() {
        gameView.showGameStatus(
            localization.t('gameStatus', 'draw'),
            'warning'
        );
        this.endGame();
    }

    endGame() {
        gameModel.state.isGameStarted = false;
        
        // Отключаем все игровые действия
        gameView.disableGameControls();
        
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
