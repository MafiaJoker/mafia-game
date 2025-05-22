// js/controllers/game/voting-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import votingService from '../../services/voting-service.js';
import { GAME_STATUSES, GAME_SUBSTATUS } from '../../utils/constants.js';
import localization from '../../utils/localization.js';
import EventEmitter from '../../utils/event-emitter.js';

export class VotingController extends EventEmitter {
    constructor() {
        super();
        this.setupVotingListeners();
    }

    setupVotingListeners() {
        votingService.on('votingStarted', (nominatedPlayers) => {
            gameModel.setGameSubstatus(GAME_SUBSTATUS.VOTING);
            gameView.updateGameStatus(gameModel.state.gameStatus, gameModel.state.gameSubstatus);
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
            
            this.emit('checkGameEnd');
        });
        
        votingService.on('playerEliminated', (data) => {
            this.emit('playerEliminated', data);
        });
        
        votingService.on('votingCompleted', () => {
            gameView.elements.votingSection.classList.add('d-none');
            gameView.elements.votingControls.classList.add('d-none');
            gameView.elements.goToNight.classList.remove('d-none');
        });
    }

    startVoting() {
        if (gameModel.state.nominatedPlayers.length === 1 && gameModel.state.round > 0) {
            this.handleSingleCandidate();
            return;
        }
        
        votingService.startVoting();
    }

    handleSingleCandidate() {
        const eliminatedPlayerId = gameModel.state.nominatedPlayers[0];
        const player = gameModel.getPlayer(eliminatedPlayerId);
        
        if (player) {
            gameView.showGameStatus(
                `Игрок ${player.id}: ${player.name} автоматически выбывает как единственная кандидатура`,
                'warning'
            );
            
            this.emit('eliminatePlayer', eliminatedPlayerId);
            
            gameModel.state.nominatedPlayers = [];
            gameModel.state.players.forEach(p => { p.nominated = null; });
            
            gameView.elements.startVoting.classList.add('d-none');
            gameView.elements.goToNight.classList.remove('d-none');
        }
    }

    confirmVoting() {
        votingService.confirmVoting();
    }

    resetVoting() {
        votingService.resetVoting();
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
        
        this.updateVotingButtons();
    }

    updateVotingButtons() {
        const startVotingBtn = gameView.elements.startVoting;
        const goToNightBtn = gameView.elements.goToNight;
        
        // Проверяем, что мы в процессе игры и в фазе обсуждения
        if (gameModel.isGameInProgress() && 
            (gameModel.state.gameSubstatus === GAME_SUBSTATUS.DISCUSSION || 
             gameModel.state.gameSubstatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION)) {
            
            const playersCount = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
            
            if (gameModel.state.round === 0 && playersCount === 10) {
                if (gameModel.state.nominatedPlayers.length >= 2) {
                    startVotingBtn.classList.remove('d-none');
                    goToNightBtn.classList.add('d-none');
                } else {
                    startVotingBtn.classList.add('d-none');
                    goToNightBtn.classList.remove('d-none');
                }
            } else if (gameModel.state.nominatedPlayers.length >= 1) {
                startVotingBtn.classList.remove('d-none');
                goToNightBtn.classList.add('d-none');
            } else {
                startVotingBtn.classList.add('d-none');
                goToNightBtn.classList.remove('d-none');
            }
        }
    }
}

export default new VotingController();
