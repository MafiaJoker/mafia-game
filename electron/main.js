const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const { URL } = require('url')

// Отключаем песочницу для Linux (необходимо для AppImage)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
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
      preload: path.join(__dirname, 'preload.js')
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

// Telegram OAuth обработчики
ipcMain.handle('telegram-oauth-start', async (event, { botUsername, authUrl }) => {
  console.log('Starting Telegram OAuth with bot:', botUsername)
  
  try {
    // Используем протокольный URL для callback
    const callbackUrl = 'mafia-helper://telegram-oauth'
    
    // Создаем URL для Telegram OAuth
    const telegramOAuthUrl = `https://oauth.telegram.org/auth?bot_id=${getBotId(botUsername)}&origin=${encodeURIComponent(authUrl)}&return_to=${encodeURIComponent(callbackUrl)}`
    
    console.log('Opening Telegram OAuth URL:', telegramOAuthUrl)
    
    // Открываем OAuth URL во внешнем браузере
    await shell.openExternal(telegramOAuthUrl)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to start Telegram OAuth:', error)
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
    
    // Проверяем, что это Telegram OAuth callback
    if (parsedUrl.pathname === '/telegram-oauth') {
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