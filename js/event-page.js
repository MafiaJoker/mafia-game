// event-page.js
import eventModel from './models/event-model.js';
import tableController from './controllers/table-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    // Получаем ID мероприятия из URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = parseInt(urlParams.get('id'));
    
    if (!eventId) {
        alert('ID мероприятия не указан');
        window.location.href = 'index.html';
        return;
    }
    
    // Загружаем мероприятие и отображаем его
    const event = eventModel.getEventById(eventId);
    if (!event) {
        alert('Мероприятие не найдено');
        window.location.href = 'index.html';
        return;
    }
    
    // Отображаем информацию о мероприятии
    document.getElementById('eventTitle').textContent = event.name;
    
    const eventInfo = document.getElementById('eventInfo');
    eventInfo.innerHTML = `
        <h5>${event.name}</h5>
        <p class="text-muted">${formatDate(event.date)}</p>
        <div class="mt-3">
            <h6>Описание:</h6>
            <p>${event.description || 'Описание отсутствует'}</p>
        </div>
        <div class="mt-3">
            <h6>Статистика:</h6>
            <p>${event.tables.length} столов</p>
        </div>
    `;
    
    // Загружаем список столов
    const tablesList = document.getElementById('eventTablesList');
    tablesList.innerHTML = '';
    
    if (event.tables.length === 0) {
        tablesList.innerHTML = `
            <div class="list-group-item text-center py-3 text-muted">
                <p>У этого мероприятия еще нет столов</p>
            </div>
        `;
    } else {
        event.tables.forEach(table => {
            const tableItem = document.createElement('a');
            tableItem.href = '#';
            tableItem.className = 'list-group-item list-group-item-action';
            tableItem.dataset.tableId = table.id;
            tableItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${table.name}</strong>
                        <div class="small text-muted">${table.capacity} мест</div>
                    </div>
                    <span class="seating-type ${table.seatingType}">
                        ${table.seatingType === 'free' ? 'Свободная' : 'Заданная'}
                    </span>
                </div>
            `;
            tableItem.addEventListener('click', (e) => {
                e.preventDefault();
                showTableDetails(event, table);
            });
            tablesList.appendChild(tableItem);
        });
    }
    
    // Настраиваем кнопку добавления стола
    const addTableBtn = document.getElementById('addTableBtn');
    addTableBtn.addEventListener('click', () => {
        tableController.openTableModal(eventId);
    });
    
    // Обработчик для добавления новой игры
    const addGameBtn = document.getElementById('addGameBtn');
    addGameBtn.addEventListener('click', () => {
        openGameModal(event, addGameBtn.dataset.tableId);
    });
    
    // Обработчик сохранения новой игры
    const saveGameBtn = document.getElementById('saveGame');
    saveGameBtn.addEventListener('click', () => {
        saveNewGame(event, saveGameBtn.dataset.tableId);
    });
    
    // Функция отображения деталей стола
    function showTableDetails(event, table) {
        const tableDetailsCard = document.getElementById('tableDetailsCard');
        const tableTitle = document.getElementById('tableTitle');
        const tableDetails = document.getElementById('tableDetails');
        const tableGames = document.getElementById('tableGames');
        const gamesList = document.getElementById('gamesList');
        const addGameBtn = document.getElementById('addGameBtn');
        
        // Сбрасываем стили активного элемента в списке столов
        document.querySelectorAll('#eventTablesList a').forEach(a => {
            a.classList.remove('active');
        });
        
        // Подсвечиваем выбранный стол
        const selectedTableItem = document.querySelector(`#eventTablesList a[data-table-id="${table.id}"]`);
        if (selectedTableItem) {
            selectedTableItem.classList.add('active');
        }
        
        // Заполняем детали стола
        tableTitle.textContent = table.name;
        tableDetails.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted">Вместимость:</h6>
                    <p>${table.capacity} игроков</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted">Тип рассадки:</h6>
                    <p>
                        <span class="seating-type ${table.seatingType}">
                            ${table.seatingType === 'free' ? 'Свободная' : 'Заданная'}
                        </span>
                    </p>
                </div>
            </div>
        `;
        
        // Отображаем игры
        gamesList.innerHTML = '';
        
        if (!table.games || table.games.length === 0) {
            gamesList.innerHTML = `
                <li class="text-center py-3 text-muted">
                    <i class="bi bi-controller" style="font-size: 1.5rem;"></i>
                    <p class="mt-2">У этого стола еще нет игр</p>
                </li>
            `;
        } else {
            table.games.forEach(game => {
                const gameItem = document.createElement('li');
                gameItem.className = 'game-item';
                gameItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${game.name}</h6>
                            <small class="text-muted">Создана: ${formatDate(game.created)}</small>
                        </div>
                        <a href="game.html?eventId=${event.id}&tableId=${table.id}&gameId=${game.id}" class="btn btn-sm btn-primary">
                            Войти в игру
                        </a>
                    </div>
                `;
                gamesList.appendChild(gameItem);
            });
        }
        
        // Показываем секцию игр и кнопку добавления
        tableGames.style.display = 'block';
        addGameBtn.style.display = 'block';
        addGameBtn.dataset.tableId = table.id;
    }
    
    // Открыть модальное окно создания новой игры
    function openGameModal(event, tableId) {
        const saveGameBtn = document.getElementById('saveGame');
        saveGameBtn.dataset.tableId = tableId;
        
        document.getElementById('gameForm').reset();
        
        const gameModal = new bootstrap.Modal(document.getElementById('gameModal'));
        gameModal.show();
    }
    
    // Сохранить новую игру
    function saveNewGame(event, tableId) {
        const gameName = document.getElementById('gameName').value;
        
        if (!gameName) {
            alert('Введите название игры');
            return;
        }
        
        // Находим нужный стол
        const table = event.tables.find(t => t.id === parseInt(tableId));
        if (!table) return;
        
        // Добавляем новую игру
        if (!table.games) table.games = [];
        
        const newGame = {
            id: Date.now(),
            name: gameName,
            created: new Date().toISOString(),
            players: []
        };
        
        table.games.push(newGame);
        
        // Сохраняем изменения
        eventModel.saveEvents();
        
        // Закрываем модальное окно и обновляем отображение
        bootstrap.Modal.getInstance(document.getElementById('gameModal')).hide();
        showTableDetails(event, table);
    }
    
    // Вспомогательная функция для форматирования даты
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        });
    }
});
