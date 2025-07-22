# Mafia Game Helper - Desktop Application

Настольная версия приложения Mafia Game Helper на базе Electron.

## Разработка

### Требования
- Node.js 18+
- npm или yarn
- Git

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки

1. Запустите Vue dev сервер:
```bash
npm run dev
```

2. В отдельном терминале запустите Electron:
```bash
npm run electron:serve
```

## Сборка

### Сборка для текущей платформы
```bash
npm run electron:build
```

### Сборка для конкретной платформы
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# Все платформы
npm run electron:build:all
```

Собранные файлы будут находиться в папке `dist-electron/`.

## Особенности Electron версии

### Системное меню
- **Файл** → Новое мероприятие (Ctrl+N)
- **Правка** → Стандартные операции редактирования
- **Вид** → Управление окном и инструменты разработчика
- **Справка** → О программе и документация

### Горячие клавиши
- `Ctrl+N` - Новое мероприятие
- `Ctrl+R` - Перезагрузить
- `F11` - Полноэкранный режим
- `F12` - Инструменты разработчика


### Безопасность
- Отключен `nodeIntegration`
- Включен `contextIsolation`
- Использование `preload.js` для безопасного API

## Конфигурация

### API сервер
По умолчанию приложение подключается к `http://localhost:8000/api/v1`.
Для изменения используйте переменную окружения `VITE_API_BASE_URL`.

### Сборка для production
Убедитесь, что:
1. API сервер доступен по нужному адресу
2. Настроены правильные CORS заголовки
3. Подписан код (для macOS и Windows)

## Структура проекта

```
electron/
├── main.js          # Главный процесс Electron
├── preload.js       # Preload скрипт для безопасности
└── icon.png         # Иконка приложения

electron-builder.yml # Конфигурация сборки
```

## Известные проблемы

1. **HMR не работает в Electron** - используйте перезагрузку (Ctrl+R)
2. **DevTools** - доступны только в режиме разработки

## Лицензия

См. основной файл LICENSE в корне проекта.