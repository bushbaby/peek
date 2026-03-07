// Popup script: renders logged-in or logged-out state and handles user actions.

const PEEK_URL = 'https://peek.bushbaby.dev'

interface AuthStorage {
  accessToken?: string
  refreshToken?: string
}

function decodeEmail(jwt: string): string | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]!)) as Record<string, unknown>
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

function renderSignedOut(root: HTMLElement) {
  root.innerHTML = `
    <button id="btn-signin">Sign in to Peek</button>
    <p class="notice">You'll be redirected to Peek to authenticate.</p>
  `
  document.getElementById('btn-signin')!.addEventListener('click', () => {
    void chrome.tabs.create({ url: `${PEEK_URL}/auth/extension-callback` })
    window.close()
  })
}

function renderSignedIn(root: HTMLElement, email: string) {
  root.innerHTML = `
    <p class="email">${email}</p>
    <button id="btn-pick">Pick element</button>
    <button id="btn-dashboard">Open dashboard</button>
    <button id="btn-signout">Sign out</button>
  `

  document.getElementById('btn-pick')!.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.startsWith('http')) {
      document.getElementById('btn-pick')!.setAttribute('disabled', 'true')
      return
    }
    await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER' })
    window.close()
  })

  document.getElementById('btn-dashboard')!.addEventListener('click', () => {
    void chrome.tabs.create({ url: `${PEEK_URL}/dashboard` })
    window.close()
  })

  document.getElementById('btn-signout')!.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' })
    renderSignedOut(root)
  })

  // Disable pick button if the active tab is not a web page
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab?.url?.startsWith('http')) {
      const btn = document.getElementById('btn-pick') as HTMLButtonElement
      btn.disabled = true
      btn.title = 'Cannot pick elements on this page'
    }
  })
}

async function init() {
  const root = document.getElementById('root')!
  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' }) as AuthStorage

  if (auth.accessToken) {
    const email = decodeEmail(auth.accessToken) ?? 'Signed in'
    renderSignedIn(root, email)
  } else {
    renderSignedOut(root)
  }
}

void init()
