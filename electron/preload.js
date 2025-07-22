const { contextBridge, ipcRenderer } = require('electron')

// Экспонируем безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Информация о приложении
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Обработка меню
  onMenuAction: (callback) => {
    const events = ['menu-new-event', 'menu-about', 'menu-preferences']
    events.forEach(event => {
      ipcRenderer.on(event, (_, data) => callback(event, data))
    })
  },
  
  // Автообновления
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Утилиты
  isElectron: () => true,
  
  // Удаление слушателей
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Добавляем индикатор что приложение запущено в Electron
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-app')
})