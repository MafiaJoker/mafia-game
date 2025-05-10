// views/game-view.js
import playerView from './player-view.js';
import localization from '../utils/localization.js';
import { GAME_PHASES } from '../utils/constants.js';

export class GameView {
    constructor() {
        // Инициализируем все элементы DOM
        this.elements = {
            // Основные элементы игры
            roundNumber: document.getElementById('roundNumber'),
            timer: document.getElementById('timer'),
            startTimer: document.getElementById('startTimer'),
            stopTimer: document.getElementById('stopTimer'),
            resetTimer: document.getElementById('resetTimer'),
            
            // Кнопки управления игрой
            startDistribution: document.getElementById('startDistribution'),
            startGame: document.getElementById('startGame'),
            startVoting: document.getElementById('startVoting'),
            goToNight: document.getElementById('goToNight'),
            
            // Статус игры и секции
            gameStatus: document.getElementById('gameStatus'),
            gameActions: document.getElementById('gameActions'),
            
            // Секция голосования
            votingSection: document.getElementById('votingSection'),
            votingControls: document.getElementById('votingControls'),
            confirmVoting: document.getElementById('confirmVoting'),
            resetVoting: document.getElementById('resetVoting'),
            nominatedPlayers: document.getElementById('nominatedPlayers'),
            votingResults: document.getElementById('votingResults'),
            
            // Секция ночи
            nightSection: document.getElementById('nightSection'),
            nightControls: document.getElementById('nightControls'),
            confirmNight: document.getElementById('confirmNight'),
            mafiaActions: document.getElementById('mafiaActions'),
            donActions: document.getElementById('donActions'),
            sheriffActions: document.getElementById('sheriffActions'),
            mafiaTargets: document.getElementById('mafiaTargets'),
            donTargets: document.getElementById('donTargets'),
            sheriffTargets: document.getElementById('sheriffTargets'),
            donResult: document.getElementById('donResult'),
            sheriffResult: document.getElementById('sheriffResult'),
            
            // Секция лучшего хода
            bestMoveSection: document.getElementById('bestMoveSection'),
            bestMoveControls: document.getElementById('bestMoveControls'),
            confirmBestMove: document.getElementById('confirmBestMove'),
            bestMoveSelected: document.getElementById('bestMoveSelected'),
            bestMovePlayer: document.getElementById('bestMovePlayer'),
            bestMoveChoices: document.getElementById('bestMoveChoices'),
            
            // Контролы ППК
            ppkButton: document.getElementById('ppkButton'),
            ppkControls: document.getElementById('ppkControls'),
            cancelPpk: document.getElementById('cancelPpk'),
            mafiaWin: document.getElementById('mafiaWin'),
            cityWin: document.getElementById('cityWin'),
            
            // Список игроков
            playersList: document.getElementById('playersList')
        };
    }

    updateRound(round) {
        this.elements.roundNumber.textContent = round;
    }

    updateTimer(time) {
        this.elements.timer.textContent = time;
    }

    showGameStatus(message, type = 'info') {
        this.elements.gameStatus.textContent = message;
        this.elements.gameStatus.className = `alert alert-${type}`;
        this.elements.gameStatus.classList.remove('d-none');
    }

    hideGameStatus() {
        this.elements.gameStatus.classList.add('d-none');
    }

    updateGamePhase(phase) {
        // Скрыть все секции
        this.elements.votingSection.classList.add('d-none');
        this.elements.votingControls.classList.add('d-none');
        this.elements.nightSection.classList.add('d-none');
        this.elements.nightControls.classList.add('d-none');
        this.elements.bestMoveSection.classList.add('d-none');
        this.elements.bestMoveControls.classList.add('d-none');
        
        // Показать нужные секции в зависимости от фазы
        switch (phase) {
            case GAME_PHASES.DISTRIBUTION:
                this.elements.startDistribution.classList.remove('d-none');
                this.elements.startGame.classList.add('d-none');
                break;
                
            case GAME_PHASES.DAY:
                this.elements.startDistribution.classList.add('d-none');
                this.elements.startGame.classList.add('d-none');
                this.hideGameStatus();
                break;
                
            case GAME_PHASES.VOTING:
                this.elements.votingSection.classList.remove('d-none');
                this.elements.votingControls.classList.remove('d-none');
                break;
                
            case GAME_PHASES.NIGHT:
                this.elements.nightSection.classList.remove('d-none');
                this.elements.nightControls.classList.remove('d-none');
                break;
        }
    }

    renderPlayers(players, gameState, callbacks) {
        playerView.renderPlayers(players, gameState, callbacks);
    }
    
    // Метод для отображения вариантов голосования
    renderVotingOptions(nominatedPlayers, votingResults) {
	const nominatedPlayersEl = this.elements.nominatedPlayers;
	nominatedPlayersEl.innerHTML = `<h5>${localization.t('ui', 'candidates')}</h5>`;
	
	// Получаем количество живых игроков
	const alivePlayers = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
	const usedVotes = Object.values(votingResults).reduce((a, b) => a + b, 0);
	const remainingTotalVotes = alivePlayers - usedVotes;
	
	nominatedPlayers.forEach(playerId => {
	    const player = gameModel.getPlayer(playerId);
	    const playerRow = document.createElement('div');
	    playerRow.className = 'row mb-2 align-items-center';
	    
	    const playerInfo = document.createElement('div');
	    playerInfo.className = 'col-md-4';
	    playerInfo.textContent = `${player.id}: ${player.name}`;
	    playerRow.appendChild(playerInfo);
	    
	    const votingOptions = document.createElement('div');
	    votingOptions.className = 'col-md-8';
	    
	    // Добавляем кнопку для снятия голосов (0 голосов)
	    const zeroVoteBtn = document.createElement('button');
	    zeroVoteBtn.className = 'btn vote-sm ' + 
		(votingResults[playerId] === undefined ? 'btn-primary' : 'btn-outline-primary');
	    zeroVoteBtn.textContent = '0';
	    zeroVoteBtn.onclick = () => this.onVoteClick(playerId, 0);
	    votingOptions.appendChild(zeroVoteBtn);
	    
	    // Определяем, сколько голосов можно отдать за этого кандидата
	    let maxPossibleVotes = remainingTotalVotes;
	    if (votingResults[playerId] !== undefined) {
		maxPossibleVotes += votingResults[playerId];
	    }
	    
	    // Создаем кнопки для возможных голосов
	    for (let i = 1; i <= maxPossibleVotes; i++) {
		const voteBtn = document.createElement('button');
		voteBtn.className = 'btn vote-sm ' + 
		    (votingResults[playerId] === i ? 'btn-primary' : 'btn-outline-primary');
		voteBtn.textContent = i;
		voteBtn.onclick = () => this.onVoteClick(playerId, i);
		votingOptions.appendChild(voteBtn);
	    }
	    
	    playerRow.appendChild(votingOptions);
	    nominatedPlayersEl.appendChild(playerRow);
	});
	
	// Отображение результатов голосования
	const votingResultsEl = this.elements.votingResults;
	votingResultsEl.innerHTML = `<h5>${localization.t('ui', 'results')}</h5>`;
	
	if (Object.keys(votingResults).length > 0) {
	    const resultsList = document.createElement('ul');
	    resultsList.className = 'list-group';
	    
	    let hasAnyVotes = false;
	    
	    // Фильтруем результаты, чтобы показывать только положительные голоса
	    Object.entries(votingResults).forEach(([playerId, votes]) => {
		if (votes > 0) {
		    hasAnyVotes = true;
		    const player = gameModel.getPlayer(parseInt(playerId));
		    const resultItem = document.createElement('li');
		    resultItem.className = 'list-group-item';
		    resultItem.textContent = `${player.id}: ${player.name} - ${votes} голосов`;
		    resultsList.appendChild(resultItem);
		}
	    });
	    
	    // Добавляем информацию об оставшихся голосах только если есть голоса
	    if (hasAnyVotes) {
		const remainingItem = document.createElement('li');
		remainingItem.className = 'list-group-item';
		remainingItem.textContent = localization.t('ui', 'votesLeft', remainingTotalVotes);
		resultsList.appendChild(remainingItem);
		
		votingResultsEl.appendChild(resultsList);
	    } else {
		votingResultsEl.innerHTML += '<p>Нет голосов. Выберите количество голосов для кандидатов.</p>';
	    }
	} else {
	    votingResultsEl.innerHTML += '<p>Нет голосов. Выберите количество голосов для кандидатов.</p>';
	}
    }
    
    // Обработчик клика по кнопке голосования
    onVoteClick(playerId, votes) {
        // Вызываем метод votingService для регистрации голосов
        if (window.votingService) {
            window.votingService.registerVotes(playerId, votes);
        } else {
            console.error('votingService не определен');
        }
    }
    
    // Метод для отображения голосования за поднятие нескольких игроков
    renderMultipleEliminationVoting(players) {
        const votingResultsEl = this.elements.votingResults;
        const alivePlayers = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
        
        const voteForLiftDiv = document.createElement('div');
        voteForLiftDiv.className = 'mt-3';
        voteForLiftDiv.innerHTML = `<h5>Сколько человек проголосовало за подъем игроков: ${players.map(id => {
            const player = gameModel.getPlayer(id);
            return `${id}: ${player.name}`;
        }).join(', ')}?</h5>`;
        
        const votingOptions = document.createElement('div');
        votingOptions.className = 'd-flex flex-wrap';
        
        for (let i = 0; i <= alivePlayers; i++) {
            const voteBtn = document.createElement('button');
            voteBtn.className = 'btn vote-btn btn-outline-primary';
            voteBtn.textContent = i;
            voteBtn.onclick = () => this.onMultipleEliminationVote(players, i, alivePlayers);
            votingOptions.appendChild(voteBtn);
        }
        
        voteForLiftDiv.appendChild(votingOptions);
        votingResultsEl.appendChild(voteForLiftDiv);
        
        this.elements.votingControls.classList.add('d-none');
    }
    
    // Обработчик голосования за поднятие нескольких игроков
    onMultipleEliminationVote(players, votes, totalPlayers) {
        if (window.votingService) {
            window.votingService.confirmMultipleElimination(players, votes, totalPlayers);
        } else {
            console.error('votingService не определен');
        }
    }
    
    // Рендеринг ночных действий
    renderNightActions(players) {
        // Мафия
        this.renderMafiaActions(players);
        
        // Дон
        this.renderDonActions(players);
        
        // Шериф
        this.renderSheriffActions(players);
    }
    
    // Рендеринг действий мафии
    renderMafiaActions(players) {
        const mafiaTargetsEl = this.elements.mafiaTargets;
        mafiaTargetsEl.innerHTML = '';
        
        // Проверяем, есть ли живые мафиози
        const mafiaAlive = players.some(p => 
            (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
                p.isAlive && !p.isEliminated);
        
        if (mafiaAlive) {
            // Добавляем всех живых игроков как потенциальные цели
            players.forEach(p => {
                if (p.isAlive && !p.isEliminated) {
                    const targetBtn = document.createElement('button');
                    targetBtn.className = 'btn vote-btn ' + 
                        (gameModel.state.mafiaTarget === p.id ? 'btn-danger' : 'btn-outline-danger');
                    targetBtn.textContent = `${p.id}`;
                    targetBtn.onclick = () => this.onMafiaTargetSelect(p.id);
                    mafiaTargetsEl.appendChild(targetBtn);
                }
            });
            
            // Добавляем кнопку "Промах"
            const missBtn = document.createElement('button');
            missBtn.className = 'btn m-1 ' + 
                (gameModel.state.mafiaTarget === 0 ? 'btn-secondary' : 'btn-outline-secondary');
            missBtn.textContent = localization.t('nightActions', 'miss');
            missBtn.onclick = () => this.onMafiaTargetSelect(0);
            mafiaTargetsEl.appendChild(missBtn);
        } else {
            mafiaTargetsEl.innerHTML = `<p>${localization.t('nightActions', 'noMafia')}</p>`;
        }
    }
    
    // Обработчик выбора цели мафии
    onMafiaTargetSelect(playerId) {
        if (window.gameController) {
            window.gameController.selectMafiaTarget(playerId);
        } else {
            console.error('gameController не определен');
        }
    }
    
    // Рендеринг действий дона
    renderDonActions(players) {
        const donTargetsEl = this.elements.donTargets;
        donTargetsEl.innerHTML = '';
        
        // Проверяем, жив ли дон
        const donAlive = players.some(p => 
            p.originalRole === 'Дон' && p.isAlive && !p.isEliminated);
        
        if (donAlive) {
            // Добавляем всех игроков (включая удаленных) как потенциальные проверки
            players.forEach(p => {
                const targetBtn = document.createElement('button');
                targetBtn.className = 'btn vote-btn ' + 
                    (gameModel.state.donTarget === p.id ? 'btn-info' : 'btn-outline-info');
                targetBtn.textContent = `${p.id}`;
                targetBtn.onclick = () => this.onDonTargetSelect(p.id);
                donTargetsEl.appendChild(targetBtn);
            });
        } else {
            donTargetsEl.innerHTML = `<p>${localization.t('nightActions', 'noDon')}</p>`;
        }
    }
    
    // Обработчик выбора цели дона
    onDonTargetSelect(playerId) {
        if (window.gameController) {
            window.gameController.selectDonTarget(playerId);
        } else {
            console.error('gameController не определен');
        }
    }
    
    // Обновление результата проверки дона
    updateDonCheckResult(result) {
        if (!result) return;
        
        const resultEl = this.elements.donResult;
        resultEl.className = 'alert mt-2 ' + (result.isSheriff ? 'alert-danger' : 'alert-success');
        resultEl.textContent = result.isSheriff ? 
            localization.t('nightActions', 'isSheriff', result.targetId, result.targetName) : 
            localization.t('nightActions', 'notSheriff', result.targetId, result.targetName);
        resultEl.classList.remove('d-none');
    }
    
    // Рендеринг действий шерифа
    renderSheriffActions(players) {
        const sheriffTargetsEl = this.elements.sheriffTargets;
        sheriffTargetsEl.innerHTML = '';
        
        // Проверяем, жив ли шериф
        const sheriffAlive = players.some(p => 
            p.originalRole === 'Шериф' && p.isAlive && !p.isEliminated);
        
        if (sheriffAlive) {
            // Добавляем всех игроков (включая удаленных) как потенциальные проверки
            players.forEach(p => {
                const targetBtn = document.createElement('button');
                targetBtn.className = 'btn vote-btn ' + 
                    (gameModel.state.sheriffTarget === p.id ? 'btn-warning' : 'btn-outline-warning');
                targetBtn.textContent = `${p.id}`;
                targetBtn.onclick = () => this.onSheriffTargetSelect(p.id);
                sheriffTargetsEl.appendChild(targetBtn);
            });
        } else {
            sheriffTargetsEl.innerHTML = `<p>${localization.t('nightActions', 'noSheriff')}</p>`;
        }
    }
    
    // Обработчик выбора цели шерифа
    onSheriffTargetSelect(playerId) {
        if (window.gameController) {
            window.gameController.selectSheriffTarget(playerId);
        } else {
            console.error('gameController не определен');
        }
    }
    
    // Обновление результата проверки шерифа
    updateSheriffCheckResult(result) {
        if (!result) return;
        
        const resultEl = this.elements.sheriffResult;
        resultEl.className = 'alert mt-2 ' + (result.isMafia ? 'alert-danger' : 'alert-success');
        resultEl.textContent = result.isMafia ? 
            localization.t('nightActions', 'isMafia', result.targetId, result.targetName) : 
            localization.t('nightActions', 'notMafia', result.targetId, result.targetName);
        resultEl.classList.remove('d-none');
    }
    
    // Показ секции лучшего хода
    showBestMoveSection(player) {
        this.elements.bestMoveSection.classList.remove('d-none');
        this.elements.bestMoveControls.classList.remove('d-none');
        
        const bestMovePlayerEl = this.elements.bestMovePlayer;
        bestMovePlayerEl.innerHTML = `<h5>${localization.t('bestMove', 'header', player.id, player.name)}</h5>`;
        
        const bestMoveChoicesEl = this.elements.bestMoveChoices;
        bestMoveChoicesEl.innerHTML = '';
        
        gameModel.state.players.forEach(p => {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'btn vote-btn btn-outline-primary';
            playerBtn.textContent = `${p.id}`;
            playerBtn.dataset.playerId = p.id;
            playerBtn.onclick = () => this.onBestMoveTargetToggle(p.id, playerBtn);
            
            bestMoveChoicesEl.appendChild(playerBtn);
        });
        
        this.elements.bestMoveSelected.textContent = '0';
        this.elements.confirmBestMove.disabled = true;
    }
    
    // Обработчик выбора цели для лучшего хода
    onBestMoveTargetToggle(playerId, button) {
        if (window.gameController) {
            window.gameController.toggleBestMoveTarget(playerId, button);
        } else {
            console.error('gameController не определен');
        }
    }
    
    // Обновление количества выбранных целей для лучшего хода
    updateBestMoveSelection(count) {
        this.elements.bestMoveSelected.textContent = count;
        this.elements.confirmBestMove.disabled = count !== 3;
    }
    
    // Скрытие секции лучшего хода
    hideBestMoveSection() {
        this.elements.bestMoveSection.classList.add('d-none');
        this.elements.bestMoveControls.classList.add('d-none');
    }
    
    // Показ контролов ППК
    showPpkControls() {
        this.elements.ppkButton.classList.add('d-none');
        this.elements.ppkControls.classList.remove('d-none');
    }
    
    // Скрытие контролов ППК
    hidePpkControls() {
        this.elements.ppkButton.classList.remove('d-none');
        this.elements.ppkControls.classList.add('d-none');
    }
    
    // Отключение всех контролов игры
    disableGameControls() {
        this.elements.startVoting.classList.add('d-none');
        this.elements.goToNight.classList.add('d-none');
        this.elements.ppkButton.classList.add('d-none');
        this.elements.ppkControls.classList.add('d-none');   
        this.elements.votingSection.classList.add('d-none');
        this.elements.votingControls.classList.add('d-none');
        this.elements.nightSection.classList.add('d-none');
        this.elements.nightControls.classList.add('d-none');
        this.elements.bestMoveSection.classList.add('d-none');
        this.elements.bestMoveControls.classList.add('d-none');
    }
}

export default new GameView();
