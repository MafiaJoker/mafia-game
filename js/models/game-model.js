// models/game-model.js
import { Player } from './player-model.js';
import { GAME_PHASES, DEFAULT_PLAYERS_COUNT, NO_CANDIDATES_MAX_ROUNDS } from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';

export class GameModel extends EventEmitter {
    constructor() {
        super();
        this.state = {
            round: 0,
            phase: GAME_PHASES.DISTRIBUTION,
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
            rolesVisible: false
        };
        
        this.initPlayers();
    }

    initPlayers() {
        this.state.players = [];
        for (let i = 1; i <= DEFAULT_PLAYERS_COUNT; i++) {
            this.state.players.push(new Player(i));
        }
    }
    
    toggleRolesVisibility() {
        this.state.rolesVisible = !this.state.rolesVisible;
        this.emit('rolesVisibilityChanged', this.state.rolesVisible);
    }

    getPlayer(playerId) {
        return this.state.players.find(p => p.id === playerId);
    }

    changePlayerRole(playerId) {
        if (this.state.phase !== GAME_PHASES.DISTRIBUTION) return;
        
        const player = this.getPlayer(playerId);
        if (!player) return;
        
        const existingRoles = this.state.players.map(p => p.role);
        player.changeRole(existingRoles);
        
        this.emit('playerRoleChanged', player);
        
        const canStartGame = this.canStartGame();
        this.emit('canStartGameChanged', canStartGame);
        
        return player.role;
    }

    canStartGame() {
        return this.state.players.filter(p => p.role === 'Мафия').length === 2 &&
               this.state.players.filter(p => p.role === 'Дон').length === 1 &&
               this.state.players.filter(p => p.role === 'Шериф').length === 1;
    }

    // Здесь будут остальные методы модели
    // ...
}

export default new GameModel();
