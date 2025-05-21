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
        eventNameField.value = `Фановая игра #${funkyGames.length + 1}`;
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
        eventDescField.value = `${gameNumber}-я фановая игра вечера за ${monthNames[currentMonth]} ${currentYear} года.`;
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

    // Устанавливаем значения по умолчанию для полей формы
    await setDefaultEventValues();
    
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
