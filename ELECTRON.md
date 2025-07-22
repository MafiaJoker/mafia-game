# Electron App Documentation

## Telegram OAuth для Electron

### Проблема

В Electron приложении стандартный Telegram Widget не работает, потому что:
1. Telegram OAuth может работать только с зарегистрированным доменом в боте
2. `localhost` нельзя регистрировать в Telegram боте по соображениям безопасности
3. Electron приложение работает с `file://` протоколом

### Решение

Реализован OAuth flow через системный браузер:

1. **Пользователь кликает "Войти через Telegram"** в Electron приложении
2. **Открывается системный браузер** с Telegram OAuth URL
3. **Пользователь авторизуется** в браузере через Telegram
4. **Браузер перенаправляется** на `mafia-helper://telegram-oauth` с данными авторизации
5. **Electron приложение перехватывает** protocol callback
6. **Данные передаются** в renderer процесс и отправляются на API
7. **Пользователь автоматически входит** в приложение

### Компоненты реализации

#### 1. Protocol Registration (`electron-builder.yml`)
```yaml
protocols:
  - name: Mafia Helper
    schemes:
      - mafia-helper
```

#### 2. Main Process (`electron/main.js`)
- **Protocol handling**: Регистрация `app.setAsDefaultProtocolClient('mafia-helper')`
- **OAuth URL generation**: Создание ссылки для Telegram OAuth
- **Browser opening**: `shell.openExternal()` для открытия в системном браузере
- **Callback handling**: Обработка `mafia-helper://telegram-oauth` URLs

#### 3. Preload Script (`electron/preload.js`)
```javascript
// API для renderer процесса
electronAPI: {
  openTelegramOAuth: (botUsername, authUrl) => // Начать OAuth
  onTelegramOAuthCallback: (callback) => // Получить результат
}
```

#### 4. Auth Store (`src/stores/auth.js`)
```javascript
// Метод авторизации через Electron OAuth
telegramLoginElectron(botUsername, authUrl) {
  // 1. Запуск OAuth в браузере
  // 2. Ожидание callback с таймаутом (5 минут)
  // 3. Обработка полученных данных
  // 4. Авторизация через API
}
```

#### 5. UI Component (`src/components/auth/TelegramLoginWidget.vue`)
- **Автоматическое определение** окружения Electron
- **Специальная кнопка** для OAuth в Electron
- **Fallback** к веб виджету в браузере

### Настройка бота

В `electron/main.js` нужно обновить функцию `getBotId()`:

```javascript
function getBotId(botUsername) {
  const botMappings = {
    'your_bot_username': 'YOUR_BOT_ID', // Получить у @BotFather
    'dev_mafia_joker_widget_bot': '7839081063'
  }
  return botMappings[botUsername] || botUsername
}
```

**Как получить Bot ID:**
1. Отправить `/getme` команду боту через Bot API
2. Или использовать `https://api.telegram.org/botYOUR_BOT_TOKEN/getMe`

### Безопасность

1. **OAuth происходит в системном браузере** - данные не проходят через Electron
2. **Timeout защита** - OAuth автоматически отменяется через 5 минут
3. **Валидация данных** - проверка hash от Telegram на сервере
4. **Single instance** - предотвращение множественных запусков приложения

### Тестирование

1. **Build Electron приложения**:
   ```bash
   npm run electron:build
   ```

2. **Установка приложения** для регистрации protocol handler

3. **Тестирование OAuth**:
   - Запустить приложение
   - Кликнуть "Войти через Telegram"
   - Проверить открытие браузера
   - Авторизоваться в Telegram
   - Проверить возврат в приложение с успешной авторизацией

### Troubleshooting

#### Protocol handler не работает
- Убедитесь что приложение установлено (не запущено из dev)
- На Windows может потребоваться запуск от администратора
- Проверьте регистрацию в реестре: `HKEY_CLASSES_ROOT\mafia-helper`

#### OAuth timeout
- Проверьте настройки брандмауэра
- Убедитесь что Bot ID правильный в `getBotId()`
- Проверьте логи в DevTools: `Ctrl+Shift+I`

#### Бот не отвечает
- Проверьте что бот активен: `/start` в чате с ботом
- Проверьте Bot Token в бэкенде
- Убедитесь что домен зарегистрирован в боте

### Логи отладки

Для отладки включите логи в `electron/main.js`:
```javascript
console.log('Received protocol URL:', url)
console.log('Starting Telegram OAuth with bot:', botUsername)
console.log('Telegram OAuth data:', telegramData)
```

В renderer процессе логи доступны в DevTools (`Ctrl+Shift+I`).