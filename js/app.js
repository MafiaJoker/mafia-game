// js/app.js (обновленный)
import gameModel from './models/game-model.js';
import gameView from './views/game-view.js';
import gameController from './controllers/game-controller.js';
import votingService from './services/voting-service.js';
import nightActionsService from './services/night-actions-service.js';
import timerService from './utils/timer-service.js';
import apiAdapter from './adapter.js';

// Импортируем компоненты
import './components/index.js';

// Делаем модули доступными глобально для работы в обработчиках событий View
window.gameModel = gameModel;
window.gameController = gameController;
window.votingService = votingService;
window.nightActionsService = nightActionsService;
window.timerService = timerService;
window.apiAdapter = apiAdapter;

// Точка входа в приложение
window.onload = () => {
    gameController.initGame();
};
