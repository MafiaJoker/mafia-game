// UI константы: сообщения, цвета, тексты

// Сообщения для пользователя
export const UI_MESSAGES = {
  // Сообщения об ошибках
  ERRORS: {
    // Общие ошибки
    GENERAL: 'Произошла ошибка',
    NETWORK: 'Проблема с сетевым подключением',
    SERVER: 'Ошибка сервера',
    UNKNOWN: 'Неизвестная ошибка',
    
    // Ошибки сохранения/загрузки
    SAVE_FAILED: 'Ошибка сохранения изменений',
    LOAD_FAILED: 'Ошибка загрузки данных',
    DELETE_FAILED: 'Ошибка удаления',
    UPDATE_FAILED: 'Ошибка обновления',
    
    // Ошибки игры
    GAME_CREATE_FAILED: 'Не удалось создать игру',
    GAME_START_FAILED: 'Не удалось начать игру',
    PHASE_UPDATE_FAILED: 'Ошибка обновления фазы игры',
    VOTE_FAILED: 'Ошибка голосования',
    ACTION_FAILED: 'Не удалось выполнить действие',
    
    // Ошибки валидации
    INVALID_PLAYER_COUNT: 'Неверное количество игроков',
    INVALID_ROLE_DISTRIBUTION: 'Неверное распределение ролей',
    INVALID_VOTE: 'Недопустимое голосование',
    PLAYER_NOT_FOUND: 'Игрок не найден',
    
    // Ошибки авторизации
    AUTH_FAILED: 'Ошибка авторизации',
    ACCESS_DENIED: 'Доступ запрещен',
    SESSION_EXPIRED: 'Сессия истекла'
  },
  
  // Сообщения об успехе
  SUCCESS: {
    // Общие
    SAVED: 'Изменения сохранены',
    UPDATED: 'Данные обновлены',
    DELETED: 'Успешно удалено',
    CREATED: 'Успешно создано',
    
    // Игра
    GAME_CREATED: 'Игра создана',
    GAME_STARTED: 'Игра началась',
    GAME_FINISHED: 'Игра завершена',
    PHASE_UPDATED: 'Фаза обновлена',
    ROLES_ASSIGNED: 'Роли распределены',
    
    // Действия
    VOTE_RECORDED: 'Голос учтен',
    ACTION_COMPLETED: 'Действие выполнено',
    PLAYER_ELIMINATED: 'Игрок удален',
    FOUL_ADDED: 'Фол добавлен',
    
    // События
    EVENT_CREATED: 'Мероприятие создано',
    EVENT_UPDATED: 'Мероприятие обновлено',
    REGISTRATION_COMPLETE: 'Регистрация завершена'
  },
  
  // Подтверждения
  CONFIRMATIONS: {
    // Игра
    START_GAME: 'Начать игру?',
    FINISH_GAME: 'Завершить игру? Это действие нельзя отменить.',
    CANCEL_GAME: 'Отменить игру? Все данные будут потеряны.',
    
    // Игроки
    ELIMINATE_PLAYER: 'Удалить игрока {name} из игры?',
    ADD_FOUL: 'Добавить фол игроку {name}?',
    REMOVE_FOUL: 'Снять фол с игрока {name}?',
    
    // Действия
    CONFIRM_VOTE: 'Подтвердить голосование?',
    CONFIRM_KILL: 'Подтвердить убийство игрока {name}?',
    CONFIRM_CHECK: 'Подтвердить проверку игрока {name}?',
    SKIP_PHASE: 'Пропустить текущую фазу?',
    
    // Удаление
    DELETE_EVENT: 'Удалить мероприятие? Все связанные игры будут удалены.',
    DELETE_TABLE: 'Удалить стол?',
    DELETE_PLAYER: 'Удалить игрока из списка?'
  },
  
  // Предупреждения
  WARNINGS: {
    UNSAVED_CHANGES: 'Есть несохраненные изменения',
    FOUL_LIMIT: 'У игрока {name} максимальное количество фолов',
    CRITICAL_ROUNDS: 'Включен режим критических раундов',
    LOW_TIME: 'Осталось мало времени',
    NO_CANDIDATES: 'Нет кандидатов на выбывание'
  },
  
  // Информационные сообщения
  INFO: {
    LOADING: 'Загрузка...',
    SAVING: 'Сохранение...',
    PROCESSING: 'Обработка...',
    NO_DATA: 'Нет данных',
    EMPTY_LIST: 'Список пуст',
    SELECT_PLAYER: 'Выберите игрока',
    WAIT_TURN: 'Дождитесь своей очереди'
  }
}

// Цветовая схема
export const COLORS = {
  // Цвета ролей
  ROLES: {
    CIVILIAN: '#909399',    // Серый
    SHERIFF: '#f56c6c',     // Красный
    MAFIA: '#000000',       // Черный
    DON: '#000000'          // Черный
  },
  
  // Цвета команд
  TEAMS: {
    RED: '#f56c6c',         // Красная команда (мирные)
    BLACK: '#000000',       // Черная команда (мафия)
    NEUTRAL: '#909399'      // Нейтральный
  },
  
  // Цвета статусов
  STATUSES: {
    ALIVE: '#67c23a',       // Зеленый - живой
    DEAD: '#f56c6c',        // Красный - убит
    ELIMINATED: '#e6a23c',  // Оранжевый - удален
    NOMINATED: '#409eff',   // Синий - номинирован
    SPEAKING: '#00a854'     // Зеленый - говорит
  },
  
  // Цвета игры
  GAME: {
    WIN: '#67c23a',         // Победа
    LOSE: '#f56c6c',        // Поражение
    DRAW: '#e6a23c',        // Ничья
    IN_PROGRESS: '#409eff', // В процессе
    CANCELLED: '#909399'    // Отменена
  },
  
  // Цвета фолов
  FOULS: {
    0: '#67c23a',           // Нет фолов
    1: '#e6a23c',           // 1 фол
    2: '#ff9800',           // 2 фола
    3: '#f56c6c',           // 3 фола
    4: '#d32f2f'            // 4 фола
  },
  
  // UI цвета
  UI: {
    PRIMARY: '#409eff',
    SUCCESS: '#67c23a',
    WARNING: '#e6a23c',
    DANGER: '#f56c6c',
    INFO: '#909399',
    LIGHT: '#f5f7fa',
    DARK: '#303133'
  }
}

// Метки (labels)
export const LABELS = {
  // Роли
  ROLES: {
    civilian: 'Мирный житель',
    sheriff: 'Шериф',
    mafia: 'Мафия',
    don: 'Дон'
  },
  
  // Статусы игроков
  PLAYER_STATUS: {
    alive: 'В игре',
    dead: 'Убит',
    eliminated: 'Удален',
    nominated: 'Номинирован',
    silenced: 'Лишен голоса'
  },
  
  // Фазы игры
  GAME_PHASES: {
    day: 'День',
    night: 'Ночь',
    voting: 'Голосование',
    discussion: 'Обсуждение',
    shootout: 'Перестрелка'
  },
  
  // Действия
  ACTIONS: {
    vote: 'Голосовать',
    nominate: 'Номинировать',
    speak: 'Говорить',
    skip: 'Пропустить',
    check: 'Проверить',
    kill: 'Убить'
  },
  
  // Результаты
  RESULTS: {
    civilians_win: 'Победа мирных',
    mafia_win: 'Победа мафии',
    draw: 'Ничья',
    cancelled: 'Игра отменена'
  }
}

// Текстовые шаблоны
export const TEXT_TEMPLATES = {
  // Игроки
  PLAYER_NUMBER: 'Игрок №{number}',
  PLAYER_ROLE: '{name} - {role}',
  PLAYER_FOULS: 'Фолы: {count}',
  
  // Голосование
  VOTE_COUNT: 'Голосов: {count}',
  VOTE_RESULT: '{name} набрал {count} голосов',
  
  // Фазы
  ROUND_NUMBER: 'Раунд {number}',
  PHASE_TIMER: 'Осталось: {time}',
  
  // Результаты
  TEAM_WIN: 'Победила команда: {team}',
  GAME_DURATION: 'Длительность игры: {duration}',
  FINAL_SCORE: 'Итоговый счет: {score}'
}

// Плейсхолдеры для форм
export const PLACEHOLDERS = {
  // Поиск
  SEARCH: 'Поиск...',
  SEARCH_PLAYER: 'Найти игрока...',
  SEARCH_EVENT: 'Найти мероприятие...',
  
  // Формы игры
  PLAYER_NAME: 'Имя игрока',
  PLAYER_NICKNAME: 'Никнейм',
  TABLE_NAME: 'Название стола',
  
  // Комментарии
  COMMENT: 'Добавить комментарий...',
  SCORE_COMMENT: 'Комментарий к баллам (например: "Лучший ход в 3-м раунде")',
  FOUL_REASON: 'Причина фола...',
  
  // События
  EVENT_NAME: 'Название мероприятия',
  EVENT_DESCRIPTION: 'Описание мероприятия (поддерживается Markdown)',
  EVENT_LOCATION: 'Место проведения'
}

// Tooltips (подсказки)
export const TOOLTIPS = {
  // Кнопки
  ADD_FOUL: 'Добавить фол',
  REMOVE_FOUL: 'Снять фол',
  ELIMINATE: 'Удалить из игры',
  NOMINATE: 'Номинировать на голосование',
  
  // Роли
  SHERIFF_CHECK: 'Шериф может проверить одного игрока за ночь',
  DON_CHECK: 'Дон проверяет, является ли игрок шерифом',
  MAFIA_KILL: 'Мафия выбирает жертву',
  
  // Статусы
  SILENCED: 'Игрок не может говорить и голосовать',
  NOMINATED: 'Игрок выставлен на голосование',
  BEST_MOVE: 'Первый выбывший может дать дополнительные баллы'
}