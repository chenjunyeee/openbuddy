const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('buddyDesktop', {
  platform: process.platform,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  resizeToFit(width, height) {
    return ipcRenderer.invoke('buddy-resize', width, height)
  },
  /**
   * 透明窗穿透：forward 跟踪指针。
   * solo：仅 .pet-sprite-stage 接收；非 solo：.shell 内接收（#root 衬底透明区穿透）。
   */
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
  saveProfile(payload) {
    return ipcRenderer.invoke('buddy-save-profile', payload)
  },
  getPaths() {
    return ipcRenderer.invoke('buddy-get-paths')
  },
})
