// views/player-view.js
import { MAX_FOULS, GAME_STATUSES } from '../utils/constants.js';
import localization from '../utils/localization.js';

export class PlayerView {
    constructor() {
        this.playersList = document.getElementById('playersList');
    }

    createPlayerElement(player, gameState, callbacks) {
        const rowClass = player.isSilent ? 'bg-danger text-white' : 
                        (player.isAlive ? '' : 'bg-secondary text-white');
                        
        const playerEl = document.createElement('div');
        playerEl.className = `row mb-2 align-items-center ${rowClass}`;
        playerEl.id = `player-${player.id}`;
        
        // Number
        const numberEl = document.createElement('div');
        numberEl.className = 'col-1 text-center';
        numberEl.textContent = player.id;
        playerEl.appendChild(numberEl);
        
        // Fouls
        const foulsEl = document.createElement('div');
        foulsEl.className = 'col-1';
        
        const foulsContainer = document.createElement('div');
        foulsContainer.className = 'd-flex align-items-center justify-content-center';
        
        const foulsCount = document.createElement('span');
        foulsCount.className = 'mx-1 fouls-count';
        foulsCount.textContent = player.fouls;
        foulsCount.style.cursor = 'pointer';

        if (player.fouls < MAX_FOULS.BEFORE_SILENCE || 
            (player.fouls === MAX_FOULS.BEFORE_SILENCE && (player.isSilent || player.silentNextRound)) || 
            player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) {
            foulsCount.onclick = () => callbacks.onIncrementFoul(player.id);
        }
        
        foulsContainer.appendChild(foulsCount);
        foulsEl.appendChild(foulsContainer);
        playerEl.appendChild(foulsEl);

        if (player.fouls === MAX_FOULS.BEFORE_ELIMINATION && !player.isEliminated) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'col-12 mt-1';
            
            const resetFoulsBtn = this.createButton(
                'Сбросить фолы',
                'btn btn-sm btn-secondary me-2',
                () => callbacks.onResetFouls(player.id)
            );
            
            const eliminateBtn = this.createButton(
                localization.t('playerActions', 'eliminate'),
                'btn btn-danger',
                () => callbacks.onEliminate(player.id)
            );
            
            actionsEl.appendChild(resetFoulsBtn);
            actionsEl.appendChild(eliminateBtn);
            playerEl.appendChild(actionsEl);
        }
        
        // Role
        const roleEl = document.createElement('div');
        roleEl.className = 'col-2 text-center';
        
        if (gameState.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION) {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-sm btn-outline-primary role-btn';
            roleBtn.innerHTML = this.getRoleIcon(player.role);
            roleBtn.onclick = () => callbacks.onRoleChange(player.id);
            roleEl.appendChild(roleBtn);
        } else {
            roleEl.innerHTML = (gameState.rolesVisible || !gameState.isGameStarted) ? 
                              this.getRoleIcon(player.role) : '';
        }
        
        playerEl.appendChild(roleEl);
        
        // Name
        const nameEl = document.createElement('div');
        nameEl.className = 'col-3';
        nameEl.textContent = player.name;
        playerEl.appendChild(nameEl);
        
        // Nomination
        const nominationEl = document.createElement('div');
        nominationEl.className = 'col-5';

        // Показываем номинации только в процессе игры в фазе обсуждения
        if (player.isAlive && gameState.gameStatus === GAME_STATUSES.IN_PROGRESS && 
            (gameState.gameSubstatus === 'discussion' || gameState.gameSubstatus === 'critical_discussion')) {
            
            const selectEl = document.createElement('select');
            selectEl.className = 'form-select';
            selectEl.onchange = (e) => callbacks.onNominate(player.id, parseInt(e.target.value));
            
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';
            selectEl.appendChild(emptyOption);
            
            const nominatedPlayerIds = gameState.players
                  .filter(p => p.isAlive && !p.isEliminated && p.nominated !== null)
                  .map(p => p.nominated);
            
            gameState.players.forEach(p => {
                if ((p.isAlive && !p.isEliminated && 
                     (!nominatedPlayerIds.includes(p.id) || p.id === player.nominated)) || 
                    p.id === player.id) {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = `${p.id}`;
                    if (player.nominated === p.id) {
                        option.selected = true;
                    }
                    selectEl.appendChild(option);
                }
            });
            
            nominationEl.appendChild(selectEl);
        } else {
            if (player.nominated) {
                const nominatedPlayer = gameState.players.find(p => p.id === player.nominated);
                nominationEl.textContent = `${nominatedPlayer.id}: ${nominatedPlayer.name}`;
            } else {
                nominationEl.textContent = '';
            }
        }
        
        playerEl.appendChild(nominationEl);
        
        // Actions for fouls
        if (player.fouls === MAX_FOULS.BEFORE_SILENCE && !(player.isSilent || player.silentNextRound)) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'col-12 mt-1';
            
            const silentNowBtn = this.createButton(
                localization.t('playerActions', 'silentNow'),
                'btn btn-sm btn-danger me-2',
                () => callbacks.onSilentNow(player.id)
            );
            
            const silentNextBtn = this.createButton(
                localization.t('playerActions', 'silentNext'),
                'btn btn-sm btn-secondary',
                () => callbacks.onSilentNext(player.id)
            );
            
            actionsEl.appendChild(silentNowBtn);
            actionsEl.appendChild(silentNextBtn);
            playerEl.appendChild(actionsEl);
        }
        
        return playerEl;
    }

    createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    getRoleIcon(role) {
        if (role === 'Мирный') { return `<input class="role-img" type="image" src="resources/citezen.svg" />` }
        if (role === 'Шериф') { return `<input class="role-img" type="image" src="resources/sheriff.svg" />` }
        if (role === 'Мафия') { return `<input class="role-img" type="image" src="resources/pistol.svg" />` }
        if (role === 'Дон') { return `<input class="role-img" type="image" src="resources/don.svg" />` }
    }

    renderPlayers(players, gameState, callbacks) {
        this.playersList.innerHTML = '';
        
        const roleToggleBtn = document.querySelector('.row.mb-2.fw-bold .col-2.text-center');
        roleToggleBtn.style.textDecoration = 'underline';
        roleToggleBtn.style.cursor = 'pointer';
        roleToggleBtn.style.color = 'blue';
        
        players.forEach((player) => {
            if (player.isEliminated) return;
            
            const playerEl = this.createPlayerElement(player, gameState, callbacks);
            this.playersList.appendChild(playerEl);
        });
    }

    updatePlayerFouls(playerId, fouls) {
        const foulElement = document.querySelector(`#player-${playerId} .fouls-count`);
        if (foulElement) {
            foulElement.textContent = fouls;
        }
    }
}

export default new PlayerView();
