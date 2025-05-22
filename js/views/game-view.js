// views/game-view.js
import playerView from './player-view.js';
import localization from '../utils/localization.js';
import { GAME_STATUSES, GAME_SUBSTATUS } from '../utils/constants.js';

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
            playersList: document.getElementById('playersList'),

            eliminatePlayerButton: document.getElementById('eliminatePlayerButton'),
            eliminatePlayerModal: document.getElementById('eliminatePlayerModal'),
            eliminatePlayerList: document.getElementById('eliminatePlayerList'),
            closeEliminateModal: document.getElementById('closeEliminateModal')
        };
    }

    initModalHandlers() {
        this.elements.closeEliminateModal.addEventListener('click', () => {
            this.elements.eliminatePlayerModal.classList.add('d-none');
        });
        
        this.elements.eliminatePlayerModal.addEventListener('click', (e) => {
            if (e.target === this.elements.eliminatePlayerModal) {
                this.elements.eliminatePlayerModal.classList.add('d-none');
            }
        });
    }

    showEliminatePlayerModal(players) {
        this.elements.eliminatePlayerList.innerHTML = '';
        
        players.forEach(player => {
            if (player.isAlive && !player.isEliminated) {
                const playerBtn = document.createElement('button');
                playerBtn.className = 'btn btn-outline-danger m-1';
                playerBtn.textContent = `${player.id}: ${player.name}`;
                playerBtn.onclick = () => {
                    if (window.gameController) {
                        window.gameController.eliminatePlayer(player.id);
                        this.elements.eliminatePlayerModal.classList.add('d-none');
                    }
                };
                this.elements.eliminatePlayerList.appendChild(playerBtn);
            }
        });
        
        this.elements.eliminatePlayerModal.classList.remove('d-none');
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

    // Убираем updateGamePhase, заменяем на updateGameStatus
    updateGameStatus(gameStatus, gameSubstatus = null) {
        // Скрыть все секции
        this.elements.votingSection.classList.add('d-none');
        this.elements.votingControls.classList.add('d-none');
        this.elements.nightSection.classList.add('d-none');
        this.elements.nightControls.classList.add('d-none');
        this.elements.bestMoveSection.classList.add('d-none');
        this.elements.bestMoveControls.classList.add('d-none');
        
        // Показать нужные секции в зависимости от статуса
        switch (gameStatus) {
            case GAME_STATUSES.ROLE_DISTRIBUTION:
                this.elements.startDistribution.classList.remove('d-none');
                this.elements.startGame.classList.remove('d-none');
                break;
                
            case GAME_STATUSES.IN_PROGRESS:
                this.handleInProgressStatus(gameSubstatus);
                break;
                
            default:
                this.hideGameStatus();
                break;
        }
    }

    handleInProgressStatus(gameSubstatus) {
        switch (gameSubstatus) {
            case GAME_SUBSTATUS.DISCUSSION:
            case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
                // Показываем кнопки обсуждения
                break;
                
            case GAME_SUBSTATUS.VOTING:
                this.elements.votingSection.classList.remove('d-none');
                this.elements.votingControls.classList.remove('d-none');
                break;
                
            case GAME_SUBSTATUS.NIGHT:
                this.elements.nightSection.classList.remove('d-none');
                this.elements.nightControls.classList.remove('d-none');
                break;
        }
    }

    renderPlayers(players, gameState, callbacks) {
        playerView.renderPlayers(players, gameState, callbacks);
    }
    
    // Остальные методы остаются без изменений...
    renderVotingOptions(nominatedPlayers, votingResults) {
        const nominatedPlayersEl = this.elements.nominatedPlayers;
        nominatedPlayersEl.innerHTML = `<h5>${localization.t('ui', 'candidates')}</h5>`;
        
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
            
            const zeroVoteBtn = document.createElement('button');
            zeroVoteBtn.className = 'btn vote-sm ' + 
                (votingResults[playerId] === undefined ? 'btn-primary' : 'btn-outline-primary');
            zeroVoteBtn.textContent = '0';
            zeroVoteBtn.onclick = () => this.onVoteClick(playerId, 0);
            votingOptions.appendChild(zeroVoteBtn);
            
            let maxPossibleVotes = remainingTotalVotes;
            if (votingResults[playerId] !== undefined) {
                maxPossibleVotes += votingResults[playerId];
            }
            
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
        
        const votingResultsEl = this.elements.votingResults;
        votingResultsEl.innerHTML = `<h5>${localization.t('ui', 'results')}</h5>`;
        
        if (Object.keys(votingResults).length > 0) {
            const resultsList = document.createElement('ul');
            resultsList.className = 'list-group';
            
            let hasAnyVotes = false;
            
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
    
    onVoteClick(playerId, votes) {
        if (window.votingService) {
            window.votingService.registerVotes(playerId, votes);
        } else {
            console.error('votingService не определен');
        }
    }
    
    // Остальные методы для ночных действий, лучшего хода и т.д. остаются без изменений
    renderNightActions(players) {
        this.renderMafiaActions(players);
        this.renderDonActions(players);
        this.renderSheriffActions(players);
    }

    renderMafiaActions(players) {
        const mafiaTargetsEl = this.elements.mafiaTargets;
        mafiaTargetsEl.innerHTML = '';
        
        const mafiaAlive = players.some(p => 
            (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
                p.isAlive && !p.isEliminated);
        
        if (mafiaAlive) {
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

    // Остальные методы ночных действий, лучшего хода остаются без изменений...
    // (renderDonActions, renderSheriffActions, showBestMoveSection и т.д.)
    
    disableGameControls() {
        this.elements.startVoting.classList.add('d-none');
        this.elements.goToNight.classList.add('d-none');
        this.elements.ppkButton.classList.add('d-none');
        this.elements.ppkControls.classList.add('d-none');
        this.elements.eliminatePlayerButton.classList.add('d-none');
        this.elements.votingSection.classList.add('d-none');
        this.elements.votingControls.classList.add('d-none');
        this.elements.nightSection.classList.add('d-none');
        this.elements.nightControls.classList.add('d-none');
        this.elements.bestMoveSection.classList.add('d-none');
        this.elements.bestMoveControls.classList.add('d-none');
    }
}

export default new GameView();
