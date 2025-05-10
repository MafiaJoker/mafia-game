// models/player-model.js
import { PLAYER_ROLES, MAX_FOULS } from '../utils/constants.js';

export class Player {
    constructor(id) {
        this.id = id;
        this.name = `Игрок ${id}`;
        this.role = PLAYER_ROLES.CIVILIAN;
        this.originalRole = PLAYER_ROLES.CIVILIAN;
        this.fouls = 0;
        this.nominated = null;
        this.isAlive = true;
        this.isEliminated = false;
        this.isSilent = false;
        this.silentNextRound = false;
    }

    incrementFoul() {
        this.fouls++;
        return this.fouls;
    }

    decrementFoul() {
        if (this.fouls > 0) {
            this.fouls--;
        }
        return this.fouls;
    }

    setSilentNow() {
        this.isSilent = true;
    }

    setSilentNextRound() {
        this.silentNextRound = true;
    }

    // Изменение роли с учетом правил
    changeRole(existingRoles) {
        const mafiaCount = existingRoles.filter(role => role === PLAYER_ROLES.MAFIA).length;
        const donCount = existingRoles.filter(role => role === PLAYER_ROLES.DON).length;
        const sheriffCount = existingRoles.filter(role => role === PLAYER_ROLES.SHERIFF).length;
        
        if (this.role === PLAYER_ROLES.CIVILIAN) {
            if (mafiaCount < 2) {
                this.role = PLAYER_ROLES.MAFIA;
            } else if (donCount < 1) {
                this.role = PLAYER_ROLES.DON;
            } else if (sheriffCount < 1) {
                this.role = PLAYER_ROLES.SHERIFF;
            }
        } else if (this.role === PLAYER_ROLES.MAFIA) {
            if (donCount < 1) {
                this.role = PLAYER_ROLES.DON;
            } else if (sheriffCount < 1) {
                this.role = PLAYER_ROLES.SHERIFF;
            } else {
                this.role = PLAYER_ROLES.CIVILIAN;
            }
        } else if (this.role === PLAYER_ROLES.DON) {
            if (sheriffCount < 1) {
                this.role = PLAYER_ROLES.SHERIFF;
            } else {
                this.role = PLAYER_ROLES.CIVILIAN;
            }
        } else if (this.role === PLAYER_ROLES.SHERIFF) {
            this.role = PLAYER_ROLES.CIVILIAN;
        }
        
        this.originalRole = this.role;
        return this.role;
    }

    eliminate() {
        this.isEliminated = true;
        this.isAlive = false;
    }

    isAtMaxFouls() {
        return this.fouls >= MAX_FOULS.BEFORE_SILENCE;
    }

    canBeEliminated() {
        return this.fouls >= MAX_FOULS.BEFORE_ELIMINATION;
    }
}
