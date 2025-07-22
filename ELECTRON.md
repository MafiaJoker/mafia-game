# Electron App Documentation

## Telegram OAuth для Electron

### Проблема

В Electron приложении стандартный Telegram Widget не работает, потому что:
1. Telegram OAuth может работать только с зарегистрированным доменом в боте
2. `localhost` нельзя регистрировать в Telegram боте по соображениям безопасности
3. Electron приложение работает с `file://` протоколом

### Решение

Реализован OAuth flow через встроенное окно браузера с разделением сессии:

1. **Пользователь кликает "Войти через Telegram"** в Electron приложении
2. **Открывается встроенное окно** с сайтом авторизации `https://dev.jokermafia.am/login`
3. **Пользователь авторизуется** через Telegram виджет на сайте
4. **Бэкенд устанавливает сессионную куку** в браузере
5. **Electron отслеживает навигацию** и определяет успешную авторизацию
6. **Куки автоматически передаются** в основную сессию Electron (общая сессия)
7. **Встроенное окно закрывается** и пользователь авторизован в приложении

### Компоненты реализации

#### 1. Protocol Registration (`electron-builder.yml`)
```yaml
protocols:
  - name: Mafia Helper
    schemes:
      - mafia-helper
```

#### 2. Main Process (`electron/main.js`)
- **Auth window creation**: Создание встроенного `BrowserWindow` для авторизации
- **Session sharing**: Использование общей сессии между основным и auth окнами
- **Navigation tracking**: Отслеживание навигации для определения успешной авторизации
- **Cookie extraction**: Получение куки из сессии и передача в основное приложение

#### 3. Preload Script (`electron/preload.js`)
```javascript
// API для renderer процесса
electronAPI: {
  openTelegramOAuth: (loginUrl) => // Открыть окно авторизации
  onAuthSuccessCallback: (callback) => // Получить результат с куками
}
```

#### 4. Auth Store (`src/stores/auth.js`)
```javascript
// Метод авторизации через сайт в Electron
telegramLoginElectron(loginUrl = 'https://dev.jokermafia.am/login') {
  // 1. Открытие встроенного окна с сайтом авторизации
  // 2. Ожидание успешной авторизации и передачи куки
  // 3. Загрузка данных пользователя через API с переданными куками
  // 4. Возврат результата авторизации
}
```

#### 5. UI Component (`src/components/auth/TelegramLoginWidget.vue`)
- **Автоматическое определение** окружения Electron
- **Кнопка авторизации** для открытия встроенного окна
- **Fallback** к веб виджету в браузере

### Настройка сайта авторизации

Убедитесь что:

1. **Сайт доступен**: `https://dev.jokermafia.am/login` отвечает корректно
2. **CORS настроен**: Разрешены запросы из Electron
3. **После авторизации**: Происходит redirect на главную страницу (`/`, `/dashboard`, `/events`)
4. **Куки устанавливаются**: Сессионные куки сохраняются в браузере

### Безопасность

1. **OAuth происходит во встроенном окне** - изолированная среда с общей сессией
2. **Timeout защита** - OAuth автоматически отменяется через 5 минут
3. **Модальное окно** - блокирует основное приложение до завершения авторизации
4. **Автоматическое закрытие** - окно авторизации закрывается после успеха
5. **Session sharing** - безопасная передача куки через встроенную сессию

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