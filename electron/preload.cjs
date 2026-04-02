const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddyDesktop', {
  platform: process.platform,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  resizeToFit(width, height) {
    return ipcRenderer.invoke('buddy-resize', width, height)
  },
  /** 仅桌宠：透明区穿透到桌面；overPet 时在精灵舞台内恢复接收 */
  sendSoloPointerState(payload) {
    ipcRenderer.send('buddy-solo-pointer', payload)
  },
  sendChat(payload) {
    return ipcRenderer.invoke('buddy-chat', payload)
  },
  subscribeChatStream(handler) {
    const fn = (_e, payload) => handler(payload)
    ipcRenderer.on('buddy-chat-stream', fn)
    return () => ipcRenderer.removeListener('buddy-chat-stream', fn)
  },
  subscribeWindowMoved(handler) {
    const fn = () => handler()
    ipcRenderer.on('buddy-window-moved', fn)
    return () => ipcRenderer.removeListener('buddy-window-moved', fn)
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
