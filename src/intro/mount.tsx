import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useStudio } from '../store'
import Intro from './Intro'

// The intro plays once per browser session, in its own root above the app, so the
// app mounts and loads underneath it and nothing in the app tree depends on it.
const SEEN_KEY = 'ms.intro.seen'

function shouldPlay(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.has('intro')) return true // ?intro forces a replay
  if (params.has('test') || params.has('nointro')) return false // keep automated checks deterministic
  if (navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent)) return false // automation never sees it
  try {
    return sessionStorage.getItem(SEEN_KEY) === null
  } catch {
    return true
  }
}

function IntroHost() {
  const [open, setOpen] = useState(true)
  const reducedMotion = useStudio((s) => s.reducedMotion)
  const language = useStudio((s) => s.language)
  if (!open) return null
  return (
    <Intro
      reducedMotion={reducedMotion}
      language={language}
      onDone={() => {
        try {
          sessionStorage.setItem(SEEN_KEY, '1')
        } catch {
          /* storage unavailable: the intro simply replays next load */
        }
        setOpen(false)
        // Unmount the root once the overlay is gone so no listeners or nodes remain.
        queueMicrotask(() => {
          root.unmount()
          host.remove()
        })
      }}
    />
  )
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

if (shouldPlay()) {
  host = document.createElement('div')
  host.id = 'intro-root'
  document.body.appendChild(host)
  root = createRoot(host)
  root.render(
    <StrictMode>
      <IntroHost />
    </StrictMode>,
  )
}
