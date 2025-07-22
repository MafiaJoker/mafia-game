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

### 🎯 Результат тестирования

**✅ РАБОТАЕТ ПОЛНОСТЬЮ:**
- Electron приложение успешно запускается
- Модальное окно авторизации открывается с `https://dev.jokermafia.am/login`
- После Telegram авторизации обнаруживается переход на главную страницу
- Сессионные куки (`session=...`) успешно извлекаются
- Куки автоматически копируются в основную сессию Electron
- Окно авторизации автоматически закрывается
- Пользователь может продолжить работу с авторизованной сессией

### 🚀 Готово к использованию

1. **Запустите разработку**: `npm run electron:serve`
2. **Кликните "Войти через Telegram"** в приложении
3. **Авторизуйтесь** в модальном окне на сайте
4. **Окно автоматически закроется** после успешной авторизации
5. **Приложение получит доступ к API** с сессионными куками

**Дополнительно:** Если автоматическое обнаружение не сработает, в окне авторизации появится кнопка **"Я авторизовался ✓"** для ручного подтверждения.

### Build для продакшена

```bash
npm run electron:build
```

### Troubleshooting

#### Protocol handler не работает
- Убедитесь что приложение установлено (не запущено из dev)
- На Windows может потребоваться запуск от администратора
- Проверьте регистрацию в реестре: `HKEY_CLASSES_ROOT\mafia-helper`

#### CORS ошибки (XMLHttpRequest blocked)
**Проблема:** `Access to XMLHttpRequest at 'http://localhost:8000/api/v1/auth/token' from origin 'http://localhost:5174' has been blocked by CORS policy`

**Решение реализовано автоматически:**
1. **webSecurity: false** в main.js отключает CORS проверки
2. **Динамический API URL**: Electron автоматически использует `https://dev.jokermafia.am/api/v1`
3. **Веб-версия** продолжает использовать локальный API для разработки

**Логи для проверки:**
```bash
API Base URL: https://dev.jokermafia.am/api/v1
Is Electron: true
```

#### OAuth timeout
- Проверьте настройки брандмауэра
- Убедитесь что Bot ID правильный в `getBotId()`
- Проверьте логи в DevTools: `Ctrl+Shift+I`

#### API возвращает HTML вместо JSON
**Проблема:** `API returned unexpected event types structure: <!DOCTYPE html>`

**Причины:**
1. **API сервер недоступен** или не запущен на указанном URL
2. **Неправильный API endpoint** - сервер отвечает HTML страницей вместо API данных
3. **CORS редирект** - сервер перенаправляет на страницу авторизации

**Решения:**
1. **Для разработки**: используйте локальный API
   ```bash
   npm run electron:serve  # использует http://localhost:8000/api/v1
   ```

2. **Для продакшена**: убедитесь что API доступен
   ```bash
   npm run electron:serve:prod  # использует https://dev.jokermafia.am/api/v1
   ```

3. **Проверьте API сервер**: убедитесь что бэкенд запущен и доступен

**Логи для диагностики:**
```bash
API Base URL: http://localhost:8000/api/v1
API returned HTML page instead of JSON data
This usually means the API server is not running or misconfigured
```

#### Бесконечное обновление страницы в веб-версии
**Проблема:** Страница постоянно перезагружается в веб-браузере

**Причины:**
1. **Бесконечные редиректы** между главной страницей и /login
2. **Множественные запросы авторизации** в роутере
3. **API недоступен** и роутер постоянно пытается проверить пользователя

**Решение реализовано автоматически:**
1. **Кеш авторизации** - проверка пользователя кешируется на 5 секунд
2. **Mutex блокировка** - предотвращает одновременные запросы к API
3. **Умная обработка ошибок** - различает 401 (не авторизован) и 503 (API недоступен)
4. **Graceful degradation** - позволяет навигацию когда API недоступен

**Логи для диагностики:**
```bash
Router: navigating from / to /
Router: user not authenticated, checking with API...
User check cached, returning current state
Router: API unavailable (503), allowing navigation without auth
```

#### Ошибки загрузки модулей в Vite (веб-версия)
**Проблема:** `Loading failed for the module with source "http://localhost:5173/node_modules/.vite/deps/..."`

**Причины:**
1. **Кеш Vite поврежден** или устарел
2. **Конфликт портов** - несколько dev серверов запущены одновременно
3. **Прерванная оптимизация зависимостей** Vite

**Решения:**
1. **Очистить кеш и перезапустить:**
   ```bash
   npm run dev:clean  # Очищает кеш и запускает dev сервер
   ```

2. **Вручную очистить кеш:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Остановить все процессы на портах:**
   ```bash
   # Найти процессы на портах 5173-5175
   lsof -i :5173
   kill -9 <PID>
   ```

**Логи указывающие на проблему:**
```bash
Loading failed for the module with source "http://localhost:5173/node_modules/.vite/deps/..."
[Vue Router warn]: Unexpected error when starting the router
[vite] ✨ new dependencies optimized... reloading
```

### 💡 Как это работает технически

1. **Встроенное окно браузера** использует общую сессию с основным приложением
2. **Множественные методы обнаружения**: URL навигация, DOM анализ, пользовательское подтверждение  
3. **Автоматическое копирование куки** между сессиями при необходимости
4. **Периодические проверки** каждые 3 секунды для надёжности
5. **Таймаут 5 минут** для предотвращения зависания

### Логи отладки

Логи автоматически выводятся в консоль:
```bash
Auth window navigated in-page to: https://dev.jokermafia.am/
Authentication successful, detected main page: https://dev.jokermafia.am/
Auth window domain cookies: 0
Auth window all cookies: 4  
Using filtered cookies from all cookies: 1
Cookie details: [ 'session=437b8fec8d...' ]
Has session cookie: true
```

В renderer процессе логи доступны в DevTools (`Ctrl+Shift+I`).