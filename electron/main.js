const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const { URL } = require('url')

// Отключаем песочницу для Linux (необходимо для разработки и AppImage)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-setuid-sandbox')
}

// Дополнительные флаги для разработки
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-setuid-sandbox')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
}

// Enable live reload for Electron
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  })
}

let mainWindow

function createWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Отключаем CORS для API запросов
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  })

  // Загружаем приложение
  if (process.env.NODE_ENV === 'development') {
    // Пробуем разные порты для dev сервера
    const tryLoadURL = async () => {
      const ports = [5173, 5174, 5175]
      for (const port of ports) {
        try {
          await mainWindow.loadURL(`http://localhost:${port}`)
          console.log(`Loaded dev server on port ${port}`)
          break
        } catch (error) {
          console.log(`Port ${port} not available, trying next...`)
        }
      }
    }
    tryLoadURL()
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Показываем окно когда оно готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Открываем внешние ссылки в браузере по умолчанию
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Создаем меню приложения
  createMenu()
}

function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новое мероприятие',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-event')
          }
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Повторить', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Перезагрузить', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Принудительная перезагрузка', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Инструменты разработчика', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Фактический размер', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Полноэкранный режим', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Окно',
      submenu: [
        { label: 'Свернуть', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Закрыть', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            mainWindow.webContents.send('menu-about')
          }
        },
        {
          label: 'Документация',
          click: () => {
            shell.openExternal('https://github.com/yourusername/mafia-game-helper')
          }
        }
      ]
    }
  ]

  // Для macOS добавляем специальное меню приложения
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'О программе ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Настройки...', accelerator: 'Cmd+,', click: () => mainWindow.webContents.send('menu-preferences') },
        { type: 'separator' },
        { label: 'Сервисы', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Скрыть ' + app.getName(), accelerator: 'Cmd+H', role: 'hide' },
        { label: 'Скрыть остальные', accelerator: 'Cmd+Shift+H', role: 'hideothers' },
        { label: 'Показать все', role: 'unhide' },
        { type: 'separator' },
        { label: 'Выйти из ' + app.getName(), accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC обработчики для взаимодействия с renderer процессом
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// Telegram OAuth обработчики для сайта
ipcMain.handle('telegram-oauth-start', async (event, { loginUrl }) => {
  console.log('Opening login page:', loginUrl)
  
  try {
    // Создаем встроенное окно браузера для авторизации
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: mainWindow.webContents.session // Используем ту же сессию для передачи куки
      },
      parent: mainWindow,
      modal: true,
      show: false,
      autoHideMenuBar: true,
      title: 'Авторизация'
    })

    // URL для авторизации
    console.log('Loading login URL in auth window:', loginUrl)
    
    await authWindow.loadURL(loginUrl)
    authWindow.show()
    
    // Возвращаем промис с обработкой закрытия окна
    return new Promise((resolve) => {
      let authCompleted = false
      
      // Обработчик навигации - отслеживаем все переходы
      authWindow.webContents.on('did-navigate', (event, navigationUrl) => {
        console.log('Auth window navigated to:', navigationUrl)
        checkForSuccessfulAuth(navigationUrl)
      })
      
      // Также отслеживаем did-navigate-in-page для SPA навигации
      authWindow.webContents.on('did-navigate-in-page', (event, navigationUrl) => {
        console.log('Auth window navigated in-page to:', navigationUrl)
        checkForSuccessfulAuth(navigationUrl)
      })
      
      // Функция проверки успешной авторизации
      const checkForSuccessfulAuth = (navigationUrl) => {
        if (authCompleted) return // Предотвращаем множественные вызовы
        
        // Расширенная проверка успешной авторизации
        const isAuthSuccess = navigationUrl.includes('dev.jokermafia.am') && 
          (navigationUrl.includes('/dashboard') || 
           navigationUrl.includes('/events') || 
           navigationUrl.includes('/admin') ||
           navigationUrl.includes('/profile') ||
           navigationUrl.includes('/games') ||
           (navigationUrl === 'https://dev.jokermafia.am/' && !navigationUrl.includes('/login')))
        
        if (isAuthSuccess) {
          authCompleted = true
          console.log('Authentication successful, detected main page:', navigationUrl)
          
          // Получаем куки из сессии (пробуем несколько способов)
          Promise.all([
            // Способ 1: Куки для домена
            authWindow.webContents.session.cookies.get({ domain: 'dev.jokermafia.am' }),
            // Способ 2: Все куки
            authWindow.webContents.session.cookies.get({}),
            // Способ 3: Попробуем из основной сессии тоже
            mainWindow.webContents.session.cookies.get({ domain: 'dev.jokermafia.am' })
          ]).then(([domainCookies, allCookies, mainCookies]) => {
            console.log('Auth window domain cookies:', domainCookies.length)
            console.log('Auth window all cookies:', allCookies.length)
            console.log('Main window cookies:', mainCookies.length)
            
            // Используем куки из любого источника где они есть
            let cookies = domainCookies
            if (cookies.length === 0 && allCookies.length > 0) {
              cookies = allCookies.filter(c => c.domain.includes('jokermafia.am'))
              console.log('Using filtered cookies from all cookies:', cookies.length)
            }
            if (cookies.length === 0 && mainCookies.length > 0) {
              cookies = mainCookies
              console.log('Using main window cookies:', cookies.length)
            }
            
            // Логируем названия куки для отладки
            const cookieNames = cookies.map(c => `${c.name}=${c.value.substring(0,10)}...`)
            console.log('Cookie details:', cookieNames)
            
            // Копируем куки в основную сессию если нужно
            if (domainCookies.length === 0 && cookies.length > 0) {
              console.log('Copying cookies to main session...')
              cookies.forEach(cookie => {
                // Нормализуем домен для Electron
                let domain = cookie.domain
                if (domain.startsWith('.')) {
                  domain = domain.substring(1) // Убираем ведущую точку
                }
                
                // Формируем правильный URL для установки куки
                const cookieUrl = `https://${domain}${cookie.path || '/'}`
                
                const cookieDetails = {
                  url: cookieUrl,
                  name: cookie.name,
                  value: cookie.value,
                  path: cookie.path || '/',
                  secure: cookie.secure !== false, // По умолчанию true для HTTPS
                  httpOnly: cookie.httpOnly !== false
                }
                
                // Добавляем expiration только если он есть
                if (cookie.expirationDate) {
                  cookieDetails.expirationDate = cookie.expirationDate
                }
                
                console.log('Setting cookie:', cookie.name, 'for URL:', cookieUrl)
                
                mainWindow.webContents.session.cookies.set(cookieDetails)
                  .then(() => console.log('Successfully copied cookie:', cookie.name))
                  .catch(err => console.log('Cookie copy error for', cookie.name, ':', err.message))
              })
            }
            
            // Проверяем наличие сессионной куки
            const hasSessionCookie = cookies.some(cookie => 
              cookie.name.includes('session') || 
              cookie.name.includes('auth') ||
              cookie.name.includes('token') ||
              cookie.name === 'sessionid' ||
              cookie.name === 'connect.sid'
            )
            
            console.log('Has session cookie:', hasSessionCookie)
            
            // Отправляем успешный результат
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('auth-success-callback', { 
                success: true, 
                cookies: cookies,
                hasSession: hasSessionCookie
              })
            }
            
            // Небольшая задержка для лучшего UX, затем закрываем
            setTimeout(() => {
              if (!authWindow.isDestroyed()) {
                authWindow.close()
              }
            }, 1000)
            
            resolve({ success: true })
          })
            .catch((error) => {
              console.error('Error getting cookies:', error)
              if (!authWindow.isDestroyed()) {
                authWindow.close()
              }
              resolve({ success: false, error: 'Failed to retrieve session cookies' })
            })
        }
      }
      
      // Альтернативная проверка через DOM - проверяем содержимое страницы
      const checkAuthByContent = () => {
        if (authCompleted) return
        
        authWindow.webContents.executeJavaScript(`
          // Проверяем наличие индикаторов успешной авторизации
          const hasUserInfo = document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"], [id*="user"]')
          const hasAuthElements = document.querySelector('[class*="auth"], [data-auth], [class*="login"]')
          const isLoginPage = window.location.href.includes('/login')
          const hasLogoutButton = document.querySelector('button:contains("Выход"), button:contains("Logout"), a[href*="logout"]')
          
          return {
            hasUserInfo: !!hasUserInfo,
            hasAuthElements: !!hasAuthElements,
            isLoginPage: isLoginPage,
            hasLogoutButton: !!hasLogoutButton,
            currentUrl: window.location.href,
            title: document.title
          }
        `).then((pageInfo) => {
          console.log('Page analysis:', pageInfo)
          
          // Если мы не на странице логина и есть признаки авторизованного пользователя
          if (!pageInfo.isLoginPage && (pageInfo.hasUserInfo || pageInfo.hasLogoutButton)) {
            console.log('Auth detected by page content analysis')
            checkForSuccessfulAuth(pageInfo.currentUrl)
          }
        }).catch(err => {
          console.log('Content check error:', err.message)
        })
      }
      
      // Проверяем содержимое страницы через некоторое время после загрузки
      authWindow.webContents.on('dom-ready', () => {
        setTimeout(() => {
          checkAuthByContent()
          injectAuthHelper()
        }, 2000) // Проверяем через 2 секунды
      })
      
      // Инжектируем помощник авторизации
      const injectAuthHelper = () => {
        if (authCompleted) return
        
        authWindow.webContents.executeJavaScript(`
          // Проверяем, что мы не на странице логина
          if (!window.location.href.includes('/login')) {
            // Создаем кнопку помощника только если её ещё нет
            if (!document.getElementById('electron-auth-helper')) {
              const helper = document.createElement('div')
              helper.id = 'electron-auth-helper'
              helper.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #409EFF;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-family: sans-serif;
                font-size: 14px;
                z-index: 10000;
                cursor: pointer;
                user-select: none;
              \`
              helper.textContent = 'Я авторизовался ✓'
              helper.onclick = () => {
                window.electronAuthSuccess = true
                helper.remove()
              }
              document.body.appendChild(helper)
            }
          }
        `).catch(err => {
          console.log('Helper injection error:', err.message)
        })
      }
      
      // Проверяем флаг авторизации
      const checkElectronAuthFlag = () => {
        if (authCompleted) return
        
        authWindow.webContents.executeJavaScript(`
          return window.electronAuthSuccess === true
        `).then((authFlag) => {
          if (authFlag) {
            console.log('Auth confirmed by user click')
            authWindow.webContents.executeJavaScript(`
              return window.location.href
            `).then((currentUrl) => {
              checkForSuccessfulAuth(currentUrl)
            })
          }
        }).catch(err => {
          console.log('Auth flag check error:', err.message)
        })
      }
      
      // Добавляем периодическую проверку каждые 3 секунды
      const contentCheckInterval = setInterval(() => {
        if (!authCompleted && !authWindow.isDestroyed()) {
          checkAuthByContent()
          checkElectronAuthFlag()
        } else {
          clearInterval(contentCheckInterval)
        }
      }, 3000)
      
      // Обработчик закрытия окна без авторизации
      authWindow.on('closed', () => {
        console.log('Auth window closed')
        clearInterval(contentCheckInterval)
        if (!authCompleted) {
          resolve({ success: false, error: 'Authentication window was closed' })
        }
      })
    })
    
  } catch (error) {
    console.error('Failed to open login window:', error)
    return { success: false, error: error.message }
  }
})

// Обработчик для получения куки после авторизации
ipcMain.handle('get-session-cookies', async (event, { domain }) => {
  try {
    // В реальном приложении нужно будет получить куки из браузера
    // Это сложная задача, потому что Electron не имеет доступа к кукам внешнего браузера
    console.log('Attempting to get session cookies for domain:', domain)
    
    // Временное решение - возвращаем mock данные
    // В продакшене нужно будет реализовать один из подходов:
    // 1. Использовать встроенный BrowserWindow
    // 2. Использовать локальный сервер для перехвата
    // 3. Использовать файловый обмен данными
    
    return { success: false, error: 'Cookie extraction not implemented yet' }
  } catch (error) {
    console.error('Failed to get session cookies:', error)
    return { success: false, error: error.message }
  }
})

// Функция для извлечения bot ID из username (упрощенная версия)
function getBotId(botUsername) {
  // В реальной реализации вам нужно будет получить bot ID через Telegram Bot API
  // Для примера используем простое соотношение
  const botMappings = {
    'dev_mafia_joker_widget_bot': '7839081063', // Пример bot ID
    // Добавьте другие боты по необходимости
  }
  
  return botMappings[botUsername] || botUsername
}


// Регистрируем протокол для OAuth callbacks
app.setAsDefaultProtocolClient('mafia-helper')

// События приложения
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Обработка протокольных URL (для OAuth callbacks)
app.on('open-url', (event, url) => {
  console.log('Received protocol URL:', url)
  handleProtocolUrl(url)
})

// Для Windows и Linux - обработка командной строки
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Ищем протокольный URL в аргументах командной строки
  const url = commandLine.find(arg => arg.startsWith('mafia-helper://'))
  if (url) {
    console.log('Received protocol URL via second instance:', url)
    handleProtocolUrl(url)
  }
  
  // Фокусируем основное окно
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Предотвращаем создание нескольких экземпляров приложения
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

function handleProtocolUrl(url) {
  try {
    const parsedUrl = new URL(url)
    
    console.log('Handling protocol URL:', url)
    console.log('Pathname:', parsedUrl.pathname)
    
    // Проверяем, что это успешная авторизация
    if (parsedUrl.pathname === '/auth-success') {
      console.log('Auth success callback received')
      
      // Отправляем сигнал об успешной авторизации в renderer процесс
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auth-success-callback', { success: true })
      }
    }
    // Fallback для старого Telegram OAuth (если понадобится)
    else if (parsedUrl.pathname === '/telegram-oauth') {
      const searchParams = parsedUrl.searchParams
      const telegramData = {}
      
      // Извлекаем параметры Telegram
      for (const [key, value] of searchParams.entries()) {
        telegramData[key] = value
      }
      
      console.log('Telegram OAuth data:', telegramData)
      
      // Отправляем данные в renderer процесс
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('telegram-oauth-callback', telegramData)
      }
    }
  } catch (error) {
    console.error('Error handling protocol URL:', error)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Безопасность: предотвращаем создание новых окон
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

// Дополнительные настройки безопасности
app.on('ready', () => {
  // Remote module отключен для безопасности
})