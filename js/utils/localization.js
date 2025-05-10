// utils/localization.js
import { PLAYER_ROLES } from './constants.js';

const locales = {
    ru: {
        roles: {
            [PLAYER_ROLES.CIVILIAN]: 'Мирный',
            [PLAYER_ROLES.SHERIFF]: 'Шериф',
            [PLAYER_ROLES.MAFIA]: 'Мафия',
            [PLAYER_ROLES.DON]: 'Дон'
        },
        buttons: {
            startGame: 'Начать игру',
            distribute: 'Раздать роли',
            startVoting: 'Начать голосование',
            goToNight: 'В ночь',
            confirm: 'Подтвердить',
            cancel: 'Отмена',
            resetVoting: 'Начать заново'
        },
        gamePhases: {
            distribution: 'Раздача ролей',
            day: 'День',
            voting: 'Голосование',
            night: 'Ночь'
        },
        playerActions: {
            silentNow: 'Молчит на этом кругу',
            silentNext: 'Молчит на следующем кругу',
            eliminate: 'Удалить игрока',
            increment: 'Увеличить',
            decrement: 'Уменьшить'
        },
        gameStatus: {
            shootout: 'Перестрелка между игроками: ',
            tooManyPlayers: 'Нельзя поднять {0} игроков, когда за столом всего {1}. Начинается ночь.',
            playerEliminated: 'Игроки {0} заголосованы.',
            insufficientVotes: 'Недостаточно голосов для подъема. Никто не выбывает.',
            mafiaWin: 'Конец игры! Победа команды мафии!',
            cityWin: 'Конец игры! Победа мирного города!',
            draw: 'Конец игры! Ничья! 3 круга не было голосований.'
        },
        nightActions: {
            mafiaHeader: 'Стрельба мафии:',
            donHeader: 'Проверка дона:',
            sheriffHeader: 'Проверка шерифа:',
            miss: 'Промах',
            noMafia: 'Нет живых игроков команды мафии.',
            noDon: 'Дон мертв или отсутствует.',
            noSheriff: 'Шериф мертв или отсутствует.',
            isSheriff: 'Игрок {0}: {1} является шерифом!',
            notSheriff: 'Игрок {0}: {1} не является шерифом.',
            isMafia: 'Игрок {0}: {1} является членом мафии!',
            notMafia: 'Игрок {0}: {1} является мирным жителем.'
        },
        bestMove: {
            header: 'Лучший ход для игрока {0}: {1}',
            selected: 'Выбрано: {0}/3',
            confirm: 'Подтвердить ЛХ'
        },
        ui: {
            round: 'Круг: ',
            players: 'Игроки',
            voting: 'Голосование',
            candidates: 'Кандидаты на голосование:',
            results: 'Результаты голосования:',
            votesLeft: 'Осталось голосов: {0}',
            nightActions: 'Ночные действия',
            bestMove: 'Лучший ход'
        }
    },
    en: {
        roles: {
            [PLAYER_ROLES.CIVILIAN]: 'Civilian',
            [PLAYER_ROLES.SHERIFF]: 'Sheriff',
            [PLAYER_ROLES.MAFIA]: 'Mafia',
            [PLAYER_ROLES.DON]: 'Don'
        },
        buttons: {
            startGame: 'Start Game',
            distribute: 'Distribute Roles',
            startVoting: 'Start Voting',
            goToNight: 'Go to Night',
            confirm: 'Confirm',
            cancel: 'Cancel',
            resetVoting: 'Reset'
        },
        // Другие переводы для английского языка
    }
};

export class Localization {
    constructor() {
        this.currentLocale = 'ru';
    }

    setLocale(locale) {
        if (locales[locale]) {
            this.currentLocale = locale;
        }
    }

    // Получить текст по ключу
    t(category, key, ...args) {
        if (!locales[this.currentLocale] || !locales[this.currentLocale][category]) {
            return key;
        }
        
        let text = locales[this.currentLocale][category][key];
        
        if (!text) return key;
        
        // Заменить плейсхолдеры {0}, {1}, ... на аргументы
        for (let i = 0; i < args.length; i++) {
            text = text.replace(`{${i}}`, args[i]);
        }
        
        return text;
    }
}

export default new Localization();
