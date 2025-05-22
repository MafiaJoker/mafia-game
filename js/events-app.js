// js/events-app.js
import eventController from './controllers/event-controller.js';
import tableController from './controllers/table-controller.js';
import eventModel from './models/event-model.js';
import eventView from './views/event-view.js';
import apiAdapter from './adapter.js';
import toastManager from './utils/toast-manager.js';

// Делаем адаптер доступным глобально
window.apiAdapter = apiAdapter;
window.tableController = tableController;

// Функция для установки текущей даты по умолчанию
window.setCurrentDateAsDefault = function() {
    const eventDateField = document.getElementById('eventDate');
    if (eventDateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
        const day = String(today.getDate()).padStart(2, '0');
        eventDateField.value = `${year}-${month}-${day}`;
    }
}

// Функция для установки значений формы по умолчанию
window.setDefaultEventValues = async function() {
    // Убедимся, что мероприятия загружены
    await eventModel.loadEvents();
    
    // Заполнение названия
    const eventNameField = document.getElementById('eventName');
    if (eventNameField) {
        // Ищем все фановые игры (с категорией 'funky')
        const funkyGames = eventModel.events.filter(event => 
            event.category === 'funky');
        
        // Устанавливаем следующий номер
        eventNameField.value = `Игровой вечер #${funkyGames.length + 1}`;
    }
    
    // Заполнение описания
    const eventDescField = document.getElementById('eventDescription');
    if (eventDescField) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Ищем фановые игры за текущий месяц (с категорией 'funky')
        const currentMonthFunkyGames = eventModel.events.filter(event => {
            // Проверяем категорию
            const isFunky = event.category === 'funky';
            
            // Проверяем, что игра в текущем месяце
            const eventDate = new Date(event.date);
            const isCurrentMonth = eventDate.getMonth() === currentMonth && 
                                  eventDate.getFullYear() === currentYear;
            
            return isFunky && isCurrentMonth;
        });
        
        // Определяем, какая это игра по счету в текущем месяце
        const gameNumber = currentMonthFunkyGames.length + 1;
        
        // Получаем название месяца
        const monthNames = [
            'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
            'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
        ];
        
        // Составляем описание
        eventDescField.value = `Игровой вечер #${gameNumber} за ${monthNames[currentMonth]} ${currentYear} года.`
	;
    }
}

// Загрузка списка ведущих в выпадающий список
async function loadJudgesIntoSelector() {
    const judgeSelector = document.getElementById('judgeSelector');
    if (!judgeSelector) return;
    
    try {
        // Загружаем список ведущих с API
        const judges = await apiAdapter.loadJudges();
        
        // Очищаем список
        judgeSelector.innerHTML = '';
        
        // Добавляем пустой элемент для возможности не выбирать ведущего
        const emptyOption = document.createElement('option');
        emptyOption.value = "";
        emptyOption.textContent = "Выберите ведущего";
        emptyOption.disabled = true;
        emptyOption.selected = true;
        judgeSelector.appendChild(emptyOption);
        
        // Если ведущих нет, добавляем подсказку
        if (judges.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Нет доступных ведущих";
            option.disabled = true;
            judgeSelector.appendChild(option);
        } else {
            // Добавляем ведущих в список
            judges.forEach(judge => {
                const option = document.createElement('option');
                option.value = judge.id;
                option.textContent = judge.name;
                judgeSelector.appendChild(option);
            });
            
            // Выбираем ведущего по умолчанию из localStorage
            const defaultJudgeId = localStorage.getItem('defaultJudgeId');
            if (defaultJudgeId && judges.some(judge => judge.id == defaultJudgeId)) {
                judgeSelector.value = defaultJudgeId;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка ведущих:', error);
        judgeSelector.innerHTML = '<option value="" disabled selected>Ошибка загрузки списка ведущих</option>';
    }
}

// Функция для загрузки списка ведущих в селектор в шапке
async function loadJudgesIntoHeaderSelector() {
    const headerJudgeSelector = document.getElementById('headerJudgeSelector');
    if (!headerJudgeSelector) return;
    
    try {
        // Загружаем список ведущих с API
        const judges = await apiAdapter.loadJudges();
        
        // Очищаем список
        headerJudgeSelector.innerHTML = '';
        
        // Добавляем пустой элемент для возможности не выбирать ведущего
        const emptyOption = document.createElement('option');
        emptyOption.value = "";
        emptyOption.textContent = "Выберите ведущего";
        emptyOption.disabled = true;
        emptyOption.selected = true;
        headerJudgeSelector.appendChild(emptyOption);
        
        // Если ведущих нет, добавляем подсказку
        if (judges.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Нет доступных ведущих";
            option.disabled = true;
            headerJudgeSelector.appendChild(option);
        } else {
            // Добавляем ведущих в список
            judges.forEach(judge => {
                const option = document.createElement('option');
                option.value = judge.id;
                option.textContent = judge.name;
                headerJudgeSelector.appendChild(option);
            });
            
            // Выбираем ведущего по умолчанию из localStorage
            const defaultJudgeId = localStorage.getItem('defaultJudgeId');
            if (defaultJudgeId && judges.some(judge => judge.id == defaultJudgeId)) {
                headerJudgeSelector.value = defaultJudgeId;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка ведущих в шапку:', error);
        headerJudgeSelector.innerHTML = '<option value="" disabled selected>Ошибка загрузки</option>';
    }
}

// Функция для поиска и отображения активных игр текущего ведущего
async function showCurrentJudgeActiveGames() {
    const judgeId = localStorage.getItem('defaultJudgeId');
    
    // Проверяем, существует ли контейнер для активных игр
    let currentJudgeGamesSection = document.getElementById('currentJudgeGamesSection');
    
    // Если секция еще не существует, создаем её
    if (!currentJudgeGamesSection) {
        const container = document.querySelector('.main-container');
        if (!container) return; // Если нет главного контейнера, выходим
        
        // Создаем новую секцию для активных игр
        currentJudgeGamesSection = document.createElement('div');
        currentJudgeGamesSection.className = 'mt-5';
        currentJudgeGamesSection.id = 'currentJudgeGamesSection';
        
        // Добавляем заголовок
        const heading = document.createElement('h3');
        heading.className = 'mb-4 border-bottom pb-2';
        heading.innerHTML = '<i class="bi bi-controller"></i> Ваши активные игры';
        
        // Добавляем предупреждение, если ведущий не выбран
        const warning = document.createElement('small');
        warning.className = 'text-muted ms-2';
        warning.id = 'noJudgeSelectedWarning';
        warning.textContent = '(выберите ведущего)';
        warning.style.display = judgeId ? 'none' : 'inline';
        heading.appendChild(warning);
        
        currentJudgeGamesSection.appendChild(heading);
        
        // Создаем контейнер для карточек игр
        const gamesContainer = document.createElement('div');
        gamesContainer.className = 'row';
        gamesContainer.id = 'currentJudgeGames';
        currentJudgeGamesSection.appendChild(gamesContainer);
        
        // Вставляем секцию перед архивом мероприятий
        const archiveSection = document.querySelector('.main-container .mt-5');
        if (archiveSection) {
            container.insertBefore(currentJudgeGamesSection, archiveSection);
        } else {
            container.appendChild(currentJudgeGamesSection);
        }
    }
    
    // Получаем или создаем контейнер для игр
    let currentJudgeGames = document.getElementById('currentJudgeGames');
    if (!currentJudgeGames) {
        currentJudgeGames = document.createElement('div');
        currentJudgeGames.className = 'row';
        currentJudgeGames.id = 'currentJudgeGames';
        currentJudgeGamesSection.appendChild(currentJudgeGames);
    }
    
    // Сбрасываем содержимое контейнера
    currentJudgeGames.innerHTML = '';
    
    // Если ведущий не выбран, показываем сообщение и выходим
    if (!judgeId) {
        const noJudgeWarning = document.getElementById('noJudgeSelectedWarning');
        if (noJudgeWarning) noJudgeWarning.style.display = 'inline';
        
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'col-12 text-center py-4 text-muted';
        emptyMessage.innerHTML = '<p>Выберите ведущего, чтобы увидеть его активные игры</p>';
        currentJudgeGames.appendChild(emptyMessage);
        return;
    }
    
    try {
        // Получаем данные о ведущем
        const judge = await apiAdapter.getJudge(judgeId);
        if (!judge) throw new Error('Ведущий не найден');
        
        // Обновляем отображение предупреждения
        const noJudgeWarning = document.getElementById('noJudgeSelectedWarning');
        if (noJudgeWarning) noJudgeWarning.style.display = 'none';
        
        // Загружаем все мероприятия, если они еще не загружены
        if (eventModel.events.length === 0) {
            await eventModel.loadEvents();
        }
        
        // Ищем все активные игры, где этот ведущий является ведущим
        let activeGames = [];
        
        eventModel.events.forEach(event => {
            event.tables.forEach(table => {
                // Проверяем, является ли выбранный ведущий ведущим стола
                if (table.judge && table.judge.includes(judge.name)) {
                    table.games.forEach(game => {
                        if (game.status === 'in_progress') {
                            activeGames.push({
                                eventId: event.id,
                                eventName: event.name,
                                tableId: table.id,
                                tableName: table.name,
                                gameId: game.id,
                                gameName: game.name,
                                round: game.currentRound || 0
                            });
                        }
                    });
                }
            });
        });
        
        // Отображаем найденные игры
        if (activeGames.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'col-12 text-center py-4 text-muted';
            emptyMessage.innerHTML = '<p>У выбранного ведущего нет активных игр</p>';
            currentJudgeGames.appendChild(emptyMessage);
        } else {
            activeGames.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'col-md-4 mb-3';
                gameCard.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">${game.gameName}</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <strong>Мероприятие:</strong> ${game.eventName}<br>
                                <strong>Стол:</strong> ${game.tableName}<br>
                                <strong>Текущий круг:</strong> ${game.round}
                            </p>
                        </div>
                        <div class="card-footer">
                            <a href="game.html?eventId=${game.eventId}&tableId=${game.tableId}&gameId=${game.gameId}" 
                               class="btn btn-sm btn-primary w-100">
                                <i class="bi bi-play-fill"></i> Продолжить игру
                            </a>
                        </div>
                    </div>
                `;
                
                currentJudgeGames.appendChild(gameCard);
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке активных игр ведущего:', error);
        currentJudgeGames.innerHTML = `
            <div class="col-12 text-center py-4 text-danger">
                <p><i class="bi bi-exclamation-triangle"></i> Ошибка при загрузке активных игр: ${error.message}</p>
            </div>
        `;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Установка текущей даты по умолчанию
    setCurrentDateAsDefault();

    // Загружаем список ведущих
    await loadJudgesIntoSelector();

    // Загружаем список ведущих в селектор в шапке
    await loadJudgesIntoHeaderSelector();

    // Устанавливаем значения по умолчанию для полей формы
    await setDefaultEventValues();

    // Добавляем вызов функции после загрузки данных
    await showCurrentJudgeActiveGames();
    
    // Настраиваем обработчик для выбора ведущего
    const judgeSelector = document.getElementById('judgeSelector');
    if (judgeSelector) {
        judgeSelector.addEventListener('change', () => {
            localStorage.setItem('defaultJudgeId', judgeSelector.value);
        });
    }

    // Настраиваем обработчик для выбора ведущего в шапке
    const headerJudgeSelector = document.getElementById('headerJudgeSelector');
    if (headerJudgeSelector) {
        headerJudgeSelector.addEventListener('change', async () => {
            localStorage.setItem('defaultJudgeId', headerJudgeSelector.value);
            
            // Синхронизируем выбор с основным селектором
            const judgeSelector = document.getElementById('judgeSelector');
            if (judgeSelector) {
                judgeSelector.value = headerJudgeSelector.value;
            }
	    
	    await showCurrentJudgeActiveGames();
        });
    }
    
    // Сначала убедимся, что контроллер инициализирован
    console.log('Инициализация контроллера:', eventController);
    
    // Явно загружаем данные и обновляем интерфейс
    await eventModel.loadEvents();

    // Используем обновленную логику отображения
    const activeEvents = eventModel.getActiveEvents();
    const archivedEvents = eventModel.getArchivedEvents();
    
    eventView.renderEventsList(eventModel.events);
});

console.log('События мафии инициализированы');
