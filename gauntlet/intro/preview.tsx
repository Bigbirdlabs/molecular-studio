import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import A from '../../src/intro/variantA/Intro'
import B from '../../src/intro/variantB/Intro'

const v = new URLSearchParams(location.search).get('v') ?? 'A'
const Comp = v === 'B' ? B : A
createRoot(document.getElementById('p')!).render(<Comp onDone={() => { document.title = 'done' }} />)
