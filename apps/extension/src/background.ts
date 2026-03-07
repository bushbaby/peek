// Background service worker
// Handles token storage and retrieval for the popup and content scripts.

interface StoreTokenMessage {
  type: 'STORE_TOKEN'
  accessToken: string
  refreshToken: string
}

interface GetAuthMessage {
  type: 'GET_AUTH'
}

interface ClearAuthMessage {
  type: 'CLEAR_AUTH'
}

type Message = StoreTokenMessage | GetAuthMessage | ClearAuthMessage

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: unknown) => void) => {
    if (message.type === 'STORE_TOKEN') {
      chrome.storage.local
        .set({ accessToken: message.accessToken, refreshToken: message.refreshToken })
        .then(() => sendResponse({ ok: true }))
        .catch((err: unknown) => sendResponse({ ok: false, error: String(err) }))
      return true // keep channel open for async response
    }

    if (message.type === 'GET_AUTH') {
      chrome.storage.local
        .get(['accessToken', 'refreshToken'])
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({}))
      return true
    }

    if (message.type === 'CLEAR_AUTH') {
      chrome.storage.local
        .remove(['accessToken', 'refreshToken'])
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true
    }
  },
)
