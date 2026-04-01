const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddyDesktop', {
  platform: process.platform,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  resizeToFit(width, height) {
    return ipcRenderer.invoke('buddy-resize', width, height)
  },
  sendChat(payload) {
    return ipcRenderer.invoke('buddy-chat', payload)
  },
  resetChatSession() {
    return ipcRenderer.invoke('buddy-chat-reset')
  },
  saveOpenclawConfig(payload) {
    return ipcRenderer.invoke('buddy-save-openclaw', payload)
  },
  getOpenclawStatus() {
    return ipcRenderer.invoke('buddy-openclaw-status')
  },
  getProfile() {
    return ipcRenderer.invoke('buddy-get-profile')
  },
  getPaths() {
    return ipcRenderer.invoke('buddy-get-paths')
  },
})
