// js/components/score-manager.js
import { BaseComponent } from './base-component.js';
import { Card } from './card.js';
import { Button } from './button.js';
import gameModel from '../models/game-model.js';

export class ScoreManager extends BaseComponent {
    constructor() {
        super('div', { className: 'score-manager' });
        this.players = gameModel.state.players;
        this.scores = gameModel.state.scores;
        this.render();
    }

    render() {
        const card = new Card({
            className: 'mt-4'
        }).setHeader('Выставление баллов игрокам', { 
            bgColor: 'dark', 
            textColor: 'white' 
        });

        const table = this.createScoreTable();
        card.setBody(table);

        const footer = this.createFooter();
        card.setFooter(footer);

        this.appendChild(card);
    }

    createScoreTable() {
        const table = new BaseComponent('table', {
            className: 'table table-striped'
        });

        // Заголовок таблицы
        const thead = new BaseComponent('thead');
        const headerRow = new BaseComponent('tr');
        
        const headers = ['№', 'Игрок', 'Роль', 'Базовый балл', 'Доп. баллы', 'Итого'];
        headers.forEach(headerText => {
            const th = new BaseComponent('th', { text: headerText });
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Тело таблицы
        const tbody = new BaseComponent('tbody');
        
        this.players.forEach(player => {
            const row = this.createPlayerRow(player);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    }

    createPlayerRow(player) {
        const row = new BaseComponent('tr');
        const score = this.scores[player.id] || { baseScore: 0, additionalScore: 0 };

        // Номер игрока
        const numCell = new BaseComponent('td', { text: player.id.toString() });
        row.appendChild(numCell);

        // Имя игрока
        const nameCell = new BaseComponent('td', { text: player.name });
        row.appendChild(nameCell);

        // Роль
        const roleCell = new BaseComponent('td', { text: player.originalRole });
        row.appendChild(roleCell);

        // Базовый балл (только отображение)
        const baseScoreCell = new BaseComponent('td', { text: score.baseScore.toString() });
        row.appendChild(baseScoreCell);

        // Дополнительные баллы (с возможностью изменения)
        const additionalScoreCell = new BaseComponent('td');
        const additionalInput = new BaseComponent('input', {
            className: 'form-control form-control-sm',
            attributes: {
                type: 'number',
                min: '-3',
                max: '3',
                step: '0.1',
                value: score.additionalScore.toString(),
                'data-player-id': player.id
            }
        });

        additionalInput.on('change', (e) => {
            const newAdditionalScore = parseFloat(e.target.value) || 0;
            gameModel.setPlayerScore(player.id, score.baseScore, newAdditionalScore);
            this.updateTotalScore(player.id);
        });

        additionalScoreCell.appendChild(additionalInput);
        row.appendChild(additionalScoreCell);

        // Итого
        const totalCell = new BaseComponent('td', {
            className: 'fw-bold',
            attributes: { 'data-total-cell': player.id }
        });
        this.updateTotalScore(player.id, totalCell);
        row.appendChild(totalCell);

        return row;
    }

    updateTotalScore(playerId, cellElement = null) {
        if (!cellElement) {
            cellElement = this.element.querySelector(`[data-total-cell="${playerId}"]`);
        }
        
        if (cellElement) {
            const total = gameModel.getTotalPlayerScore(playerId);
            cellElement.textContent = total.toFixed(1);
        }
    }

    createFooter() {
        const footer = new BaseComponent('div', {
            className: 'd-flex justify-content-between align-items-center'
        });

        const info = new BaseComponent('small', {
            className: 'text-muted',
            text: 'Дополнительные баллы: от -3 до +3 баллов за игру'
        });

        const buttonsContainer = new BaseComponent('div');
        
        const saveButton = new Button({
            text: 'Сохранить баллы',
            variant: 'success'
        });

        saveButton.onClick(() => {
            this.saveScores();
        });

        const cancelButton = new Button({
            text: 'Отмена',
            variant: 'secondary',
            className: 'me-2'
        });

        cancelButton.onClick(() => {
            this.cancel();
        });

        buttonsContainer.appendChild(cancelButton);
        buttonsContainer.appendChild(saveButton);

        footer.appendChild(info);
        footer.appendChild(buttonsContainer);

        return footer;
    }

    async saveScores() {
        try {
            // Сохраняем состояние игры с обновленными баллами
            await gameModel.saveGameState();
            
            // Переходим к финальному статусу
            const gameFlowController = await import('../controllers/game/game-flow-controller.js');
            gameFlowController.default.finishScoring();
            
            // Скрываем интерфейс выставления баллов
            this.remove();
            
        } catch (error) {
            console.error('Ошибка сохранения баллов:', error);
            alert('Ошибка при сохранении баллов');
        }
    }

    cancel() {
        // Возвращаем исходные значения
        this.players.forEach(player => {
            const score = this.scores[player.id];
            if (score) {
                gameModel.setPlayerScore(player.id, score.baseScore, 0);
            }
        });
        
        this.remove();
    }
}
