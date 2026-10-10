import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import C from '../../src/intro/variantC/Intro'
import D from '../../src/intro/variantD/Intro'

const q = new URLSearchParams(location.search)
const Comp = q.get('v') === 'D' ? D : C
const language = q.get('lang') === 'en' ? 'en' : 'tr'
const t = q.get('t')
const freezeAt = t === null ? undefined : Number(t)
createRoot(document.getElementById('p')!).render(
  <Comp reducedMotion={false} language={language} freezeAt={freezeAt} onDone={() => { document.title = 'done' }} />,
)
