// event-page.js
import eventModel from './models/event-model.js';
import tableController from './controllers/table-controller.js';
import apiAdapter from './adapter.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Получаем ID мероприятия из URL
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = parseInt(urlParams.get('id'));
        
        if (!eventId) {
            alert('ID мероприятия не указан');
            window.location.href = 'index.html';
            return;
        }
        
        // Ждем загрузки всех мероприятий
        await eventModel.loadEvents();
        
        // Теперь пытаемся найти мероприятие
        const event = eventModel.getEventById(eventId);
        if (!event) {
            alert('Мероприятие не найдено');
            window.location.href = 'index.html';
            return;
        }
        
        // Отображаем информацию о мероприятии
        document.getElementById('eventTitle').textContent = event.name;
        
        // Остальной код отображения мероприятия остаётся без изменений
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
                    </div>
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

	// Функция для удаления игры
	function deleteGame(eventId, tableId, gameId) {
	    const event = eventModel.getEventById(eventId);
	    if (!event) return;
	    
	    const table = event.tables.find(t => t.id === parseInt(tableId));
	    if (!table || !table.games) return;
	    
	    // Фильтруем массив игр, удаляя игру с указанным ID
	    table.games = table.games.filter(g => g.id !== gameId);
	    
	    // Сохраняем изменения
	    eventModel.saveEvents();
	    
	    // Обновляем отображение
	    showTableDetails(event, table);
	}
	
	// Добавим обработчик событий для всех кнопок удаления игр
	document.addEventListener('click', (e) => {
	    const deleteBtn = e.target.closest('.delete-game-btn');
	    if (deleteBtn) {
		e.preventDefault();
		e.stopPropagation();
		
		const gameId = parseInt(deleteBtn.dataset.gameId);
		const tableId = parseInt(document.getElementById('addGameBtn').dataset.tableId);
		
		if (confirm('Вы уверены, что хотите удалить эту игру?')) {
		    deleteGame(eventId, tableId, gameId);
		}
	    }
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

		    // Определяем статус игры и дополнительную информацию
		    let statusText, statusClass;
		    let additionalInfo = '';

		    switch (game.status) {
		    case "in_progress":
			statusText = "В процессе";
			statusClass = "text-primary";
			additionalInfo = `<span class="badge bg-info">Круг: ${game.currentRound}</span>`;
			break;
		    case "finished":
			statusText = "Завершена";
			statusClass = "text-success";
			let resultText = '';
			if (game.result === "city_win") resultText = "Победа города";
			else if (game.result === "mafia_win") resultText = "Победа мафии";
			else if (game.result === "draw") resultText = "Ничья";
			additionalInfo = `<span class="badge bg-success">${resultText}</span>`;
			break;
		    default: // not_started
			statusText = "Не начата";
			statusClass = "text-secondary";
		    }
		    
		    gameItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-1">${game.name}</h6>
                <div class="d-flex align-items-center">
                    <small class="text-muted me-2">Создана: ${formatDate(game.created)}</small>
                    <span class="${statusClass} me-2">${statusText}</span>
                    ${additionalInfo}
                </div>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-danger delete-game-btn" data-game-id="${game.id}">
                    <i class="bi bi-trash"></i>
                </button>
                <a href="game.html?eventId=${event.id}&tableId=${table.id}&gameId=${game.id}" class="btn btn-sm btn-primary">
                    Войти в игру
                </a>
            </div>
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
	async function saveNewGame(event, tableId) {
	    const gameName = document.getElementById('gameName').value;
	    
	    if (!gameName) {
		alert('Введите название игры');
		return;
	    }
	    
	    try {
		// Создаем данные для новой игры
		const gameData = {
		    name: gameName
		    // API автоматически добавит остальные поля по умолчанию
		};
		
		// Сохраняем игру через API
		const newGame = await apiAdapter.saveGame(event.id, parseInt(tableId), gameData);
		
		// Находим нужный стол для обновления UI
		const table = event.tables.find(t => t.id === parseInt(tableId));
		if (table) {
		    if (!table.games) table.games = [];
		    table.games.push(newGame);
		    
		    // Закрываем модальное окно и обновляем отображение
		    bootstrap.Modal.getInstance(document.getElementById('gameModal')).hide();
		    showTableDetails(event, table);
		}
	    } catch (error) {
		console.error('Ошибка создания игры:', error);
		alert('Не удалось создать игру. Проверьте, запущен ли API-сервер.');
	    }
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
    } catch (error) {
        console.error('Ошибка при загрузке мероприятия:', error);
        alert('Произошла ошибка при загрузке мероприятия. Проверьте, запущен ли API-сервер.');
        window.location.href = 'index.html';
    }
});
