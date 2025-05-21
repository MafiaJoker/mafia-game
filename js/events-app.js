// js/events-app.js
import eventController from './controllers/event-controller.js';
import tableController from './controllers/table-controller.js';
import eventModel from './models/event-model.js';
import eventView from './views/event-view.js';
import apiAdapter from './adapter.js';

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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Установка текущей даты по умолчанию
    setCurrentDateAsDefault();

    // Загружаем список ведущих
    await loadJudgesIntoSelector();

    // Загружаем список ведущих в селектор в шапке
    await loadJudgesIntoHeaderSelector();
    
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
        headerJudgeSelector.addEventListener('change', () => {
            localStorage.setItem('defaultJudgeId', headerJudgeSelector.value);
            
            // Синхронизируем выбор с основным селектором
            const judgeSelector = document.getElementById('judgeSelector');
            if (judgeSelector) {
                judgeSelector.value = headerJudgeSelector.value;
            }
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
