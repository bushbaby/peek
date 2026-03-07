// Content script: runs on https://peek.bushbaby.dev/auth/extension-callback
// Receives the PEEK_TOKEN postMessage from the page and forwards it to the background worker.

window.addEventListener('message', (event: MessageEvent) => {
  // Only accept messages from the Peek origin
  if (event.origin !== 'https://peek.bushbaby.dev') return

  if (
    event.data &&
    typeof event.data === 'object' &&
    event.data.type === 'PEEK_TOKEN' &&
    typeof event.data.accessToken === 'string' &&
    typeof event.data.refreshToken === 'string'
  ) {
    chrome.runtime.sendMessage({
      type: 'STORE_TOKEN',
      accessToken: event.data.accessToken as string,
      refreshToken: event.data.refreshToken as string,
    })
  }
})
