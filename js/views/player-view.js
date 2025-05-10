// views/player-view.js
import { MAX_FOULS } from '../utils/constants.js';
import localization from '../utils/localization.js';

export class PlayerView {
    constructor() {
        this.playersList = document.getElementById('playersList');
    }

    // Создание DOM-элемента для игрока
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
        
        foulsContainer.appendChild(foulsCount);
        foulsEl.appendChild(foulsContainer);
        playerEl.appendChild(foulsEl);
        
        // Role
        const roleEl = document.createElement('div');
        roleEl.className = 'col-2 text-center';
        
        if (gameState.phase === 'distribution') {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-sm btn-outline-primary role-btn';
            roleBtn.innerHTML = this.getRoleIcon(player.role);
            roleBtn.onclick = () => callbacks.onRoleChange(player.id);
            roleEl.appendChild(roleBtn);
        } else {
            // Показываем роли только если они видимы или игра не началась
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
        
        // Логика номинаций игроков
        // ...
        
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
        
        if (player.canBeEliminated() && !player.isEliminated) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'col-12 mt-1';
            
            const eliminateBtn = this.createButton(
                localization.t('playerActions', 'eliminate'),
                'btn btn-danger',
                () => callbacks.onEliminate(player.id)
            );
            
            actionsEl.appendChild(eliminateBtn);
            playerEl.appendChild(actionsEl);
        }
        
        return playerEl;
    }

    // Вспомогательная функция для создания кнопок
    createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    // Получение иконки для роли
    getRoleIcon(role) {
        if (role === 'Мирный') { return `<input class="role-img" type="image" src="resources/citezen.svg" />` }
        if (role === 'Шериф') { return `<input class="role-img" type="image" src="resources/sheriff.svg" />` }
        if (role === 'Мафия') { return `<input class="role-img" type="image" src="resources/pistol.svg" />` }
        if (role === 'Дон') { return `<input class="role-img" type="image" src="resources/don.svg" />` }
    }

    // Рендеринг списка игроков
    renderPlayers(players, gameState, callbacks) {
        this.playersList.innerHTML = '';
        
        players.forEach((player) => {
            if (player.isEliminated) return;
            
            const playerEl = this.createPlayerElement(player, gameState, callbacks);
            this.playersList.appendChild(playerEl);
        });
    }

    // Обновление отображения фолов игрока
    updatePlayerFouls(playerId, fouls) {
        const foulElement = document.querySelector(`#player-${playerId} .fouls-count`);
        if (foulElement) {
            foulElement.textContent = fouls;
        }
    }
}

export default new PlayerView();
