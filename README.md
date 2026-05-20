# Мафия Helper - Vue.js

Веб-приложение для ведения игр в Мафию, написанное на Vue 3 + Element Plus.

## Возможности

- 🎮 Полное ведение игры в Мафию
- 👥 Управление игроками и ролями  
- 🗳️ Система голосования с автоматическим подсчетом
- 🌙 Ночные действия (стрельба мафии, проверки)
- 📊 Система баллов и статистики
- 📅 Управление мероприятиями и столами
- ⏱️ Встроенный таймер
- 📱 Адаптивный дизайн

## Технологии

- Vue 3 (Composition API)
- Element Plus UI
- Pinia (управление состоянием)
- Vue Router
- Vite (сборщик)
- Axios (HTTP клиент)

## Установка и запуск

### Требования
- Node.js 20+
- npm или yarn
- Backend API (должен быть запущен отдельно на http://localhost:8000)

### Локальная разработка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd mafia-game
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:

   Файл `.env.development` уже настроен для локальной разработки:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_TELEGRAM_BOT_USERNAME=dev_mafia_joker_widget_bot
   VITE_SHOW_TEST_LOGIN=true
   ```

4. Запустите сервер разработки:
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

### Дополнительные команды

Очистить кеш Vite и перезапустить:
```bash
npm run dev:clean
```

## Решение проблем (Troubleshooting)

### Ошибка: `Cannot find module @rollup/rollup-darwin-arm64`

**Проблема:** При запуске `npm run dev` возникает ошибка отсутствия модуля `@rollup/rollup-darwin-arm64` (или другой платформо-специфичной версии).

**Причина:** Баг npm с установкой optional dependencies ([npm/cli#4828](https://github.com/npm/cli/issues/4828))

**Решение:**
```bash
# 1. Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# 2. Переустановите зависимости
npm install

# 3. Запустите проект
npm run dev
```

### Проблемы с кешем Vite

Если после обновления зависимостей или кода возникают странные ошибки:

```bash
# Очистите кеш и перезапустите
npm run dev:clean
```

Или вручную:
```bash
rm -rf node_modules/.vite
npm run dev
```

### Порт уже занят

Если порт 5173 занят другим процессом, Vite автоматически выберет следующий доступный порт (5174, 5175 и т.д.).

Чтобы использовать конкретный порт:
```bash
npm run dev -- --port 3000
```

## Структура проекта

```
mafia-game/
├── src/
│   ├── assets/          # Статические ресурсы (стили, изображения)
│   ├── components/      # Vue компоненты
│   │   ├── common/      # Общие компоненты (Header, Footer)
│   │   ├── events/      # Компоненты управления мероприятиями
│   │   └── game/        # Компоненты игрового процесса
│   ├── locales/         # Файлы переводов (ru, en, am)
│   ├── router/          # Настройки Vue Router
│   ├── services/        # API сервисы и бизнес-логика
│   ├── stores/          # Pinia хранилища состояния
│   ├── views/           # Страницы приложения
│   └── main.js          # Точка входа приложения
├── electron/            # Файлы для Electron сборки
├── public/              # Публичные файлы
└── scripts/             # Утилиты и скрипты

```

## Конфигурация API

По умолчанию приложение ожидает backend API на `http://localhost:8000/api/v1`

Для изменения адреса API отредактируйте файл `.env.development` или создайте `.env.local`:

```env
VITE_API_BASE_URL=https://your-api-server.com/api/v1
```

## Многоязычность

Приложение поддерживает три языка:
- 🇷🇺 Русский (по умолчанию)
- 🇬🇧 Английский
- 🇦🇲 Армянский

Файлы переводов находятся в `src/locales/`

## Деплой

Web SPA деплоится в Kubernetes (Vultr VKE) через GitHub Actions:

- `push` в `master` → dev (`https://dev.jokermafia.am`, namespace `mafia-helper-dev`)
- `release published` → prod (`https://app.jokermafia.am`, namespace `mafia-helper-prod`)

`VITE_*` значения запекаются в bundle на этапе `docker build` (см.
`.github/workflows/deploy.yml`, build-args). Для изменения переменной нужно править
Dockerfile (`ARG`/`ENV`) и workflow.

Подробности: [deployments/README.md](deployments/README.md).

### Локальная проверка Docker-сборки

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://dev.api.jokermafia.am/api/v1 \
  --build-arg VITE_TELEGRAM_BOT_USERNAME=dev_mafia_joker_widget_bot \
  --build-arg VITE_SHOW_TEST_LOGIN=false \
  --build-arg VITE_APP_COMMIT_HASH=$(git rev-parse --short HEAD) \
  -t mafia-helper-web:local .

docker run --rm -p 8080:8080 mafia-helper-web:local
# открыть http://localhost:8080
```

## Документация

- [ELECTRON.md](ELECTRON.md) - Сборка Electron приложения
- [deployments/README.md](deployments/README.md) - Kubernetes-деплой и CI/CD
- [CLAUDE.md](CLAUDE.md) - Инструкции для Claude Code

## Лицензия

MIT