import { useStudio, DEFAULT_PROJECT_NAME } from '../store'
import { methane, type Molecule } from '../chem/molecule'
import { t, type TrKey } from './i18n'

/**
 * UI-level actions that are not pure store operations: file import / export, screenshot, PubChem.
 * Heavy modules (chem/io) are imported on demand so the first paint stays light.
 */

const MAX_IMPORT_BYTES = 5 * 1024 * 1024

const notify = (text: string, kind: 'info' | 'success' | 'warn' | 'error' = 'info') => useStudio.getState().notify(text, kind)

function fileStem(): string {
  const { mol, projectName } = useStudio.getState()
  const raw = (mol.name && mol.name.trim()) || projectName || 'molecule'
  return raw.normalize('NFKD').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'molecule'
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function exportMolecule(format: 'mol' | 'xyz'): Promise<void> {
  const { mol } = useStudio.getState()
  if (!mol.atoms.length) return notify(t('file.exportEmpty'), 'warn')
  try {
    const io = await import('../chem/io')
    const text = format === 'mol' ? io.toMolfile(mol) : io.toXYZ(mol)
    const file = `${fileStem()}.${format}`
    downloadBlob(new Blob([text], { type: 'chemical/x-' + (format === 'mol' ? 'mdl-molfile' : 'xyz') }), file)
    notify(t('toast.exported', { file }), 'success')
  } catch {
    notify(t('toast.exportFailed'), 'error')
  }
}

export function saveProjectNow(): void {
  useStudio.getState().saveNow()
  if (useStudio.getState().saveStatus === 'saved') notify(t('toast.saved'), 'success')
}

// ---------- import ----------
export async function importFile(file: File): Promise<void> {
  if (file.size > MAX_IMPORT_BYTES) return notify(t('toast.importTooBig'), 'error')
  try {
    const text = await file.text()
    const io = await import('../chem/io')
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const looksXyz = /^\s*\d+\s*\r?\n/.test(text) && !/V[23]000/.test(text)
    const parsed = ext === 'xyz' || (ext !== 'mol' && ext !== 'sdf' && looksXyz) ? io.parseXYZ(text) : io.parseMolfile(text)
    if (!parsed.atoms.length) return notify(t('toast.importEmpty'), 'warn')
    const stem = file.name.replace(/\.[^.]+$/, '')
    const named = { ...parsed, name: parsed.name?.trim() ? parsed.name : stem }
    const st = useStudio.getState()
    st.loadMolecule(named)
    if (st.projectName === DEFAULT_PROJECT_NAME) st.setProjectName(named.name)
    notify(t('toast.imported', { name: named.name }), 'success')
  } catch (e) {
    const code = (e as { code?: string; params?: Record<string, string | number> } | null)?.code
    const params = (e as { params?: Record<string, string | number> } | null)?.params
    if (code === 'v3000Unsupported') notify(t('toast.importV3000'), 'error')
    else if (code === 'unsupportedElement') notify(t('toast.importElement', { symbol: String(params?.symbol ?? '?') }), 'error')
    else if (code === 'tooLarge') notify(t('toast.importAtoms'), 'error')
    else if (code === 'noAtoms') notify(t('toast.importEmpty'), 'warn')
    else notify(t('toast.importFailed'), 'error')
  }
}

export function pickAndImportFile(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.mol,.sdf,.xyz,chemical/x-mdl-molfile,chemical/x-xyz'
  input.style.display = 'none'
  input.addEventListener('change', () => {
    const f = input.files?.[0]
    input.remove()
    if (f) void importFile(f)
  })
  input.addEventListener('cancel', () => input.remove())
  document.body.appendChild(input)
  input.click()
}

// ---------- PNG screenshot ----------
function drawViewport(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#0d0e11'
  ctx.fillRect(0, 0, out.width, out.height)
  try {
    ctx.drawImage(canvas, 0, 0)
  } catch {
    return null
  }
  // A cleared WebGL back buffer composites to the plain background: detect that on a small sample.
  const probe = document.createElement('canvas')
  probe.width = probe.height = 32
  const pc = probe.getContext('2d', { willReadFrequently: true })
  if (!pc) return out
  pc.drawImage(out, 0, 0, 32, 32)
  const px = pc.getImageData(0, 0, 32, 32).data
  const r0 = px[0], g0 = px[1], b0 = px[2]
  for (let i = 4; i < px.length; i += 4) {
    if (Math.abs(px[i] - r0) + Math.abs(px[i + 1] - g0) + Math.abs(px[i + 2] - b0) > 6) return out
  }
  return null
}

export function exportPng(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#viewport canvas')
  if (!canvas || !canvas.width || !useStudio.getState().mol.atoms.length) {
    notify(useStudio.getState().mol.atoms.length ? t('toast.pngFailed') : t('file.exportEmpty'), 'warn')
    return
  }
  let attempts = 0
  const attempt = () => {
    const out = drawViewport(canvas)
    if (out) {
      out.toBlob((blob) => {
        if (!blob) return notify(t('toast.pngFailed'), 'error')
        const file = `${fileStem()}.png`
        downloadBlob(blob, file)
        notify(t('toast.exported', { file }), 'success')
      }, 'image/png')
      return
    }
    // The back buffer may have been cleared since the last render: retry on the next frames.
    if (++attempts < 4) requestAnimationFrame(attempt)
    else notify(t('toast.pngFailed'), 'error')
  }
  attempt()
}

// ---------- PubChem ----------
export function pubchemErrorKey(e: unknown): TrKey {
  switch ((e as { code?: string } | null)?.code) {
    case 'emptyInput': return 'pc.err.empty'
    case 'pubchemNotFound': return 'pc.err.notFound'
    case 'pubchemNo3D': return 'pc.err.no3d'
    case 'pubchemNetwork': return 'pc.err.network'
    case 'pubchemTimeout': return 'pc.err.timeout'
    case 'pubchemBusy': return 'pc.err.busy'
    default: return 'pc.err.generic'
  }
}

export type PubChemResult = { ok: true; mol: Molecule } | { ok: false; error: TrKey }

/** Fetches a 3D structure; the caller decides whether to load it (the user may have closed the dialog meanwhile). */
export async function searchPubChem(query: string): Promise<PubChemResult> {
  const q = query.trim()
  if (!q) return { ok: false, error: 'pc.err.empty' }
  try {
    const io = await import('../chem/io')
    const mol = await io.fetchPubChem(q)
    if (!mol.atoms.length) return { ok: false, error: 'pc.err.notFound' }
    return { ok: true, mol: { ...mol, name: mol.name?.trim() ? mol.name : q } }
  } catch (e) {
    return { ok: false, error: pubchemErrorKey(e) }
  }
}

// ---------- startup ----------
/** ?m=<library id> deep link. Unknown ids are ignored silently (the default molecule stays). */
export async function loadFromUrl(): Promise<void> {
  const id = new URLSearchParams(window.location.search).get('m')
  if (!id) return
  try {
    const lib = await import('../chem/library')
    const entry = lib.getEntry(id.trim().toLowerCase()) ?? lib.getEntry(id.trim())
    if (entry) useStudio.getState().replaceMolecule(entry.molecule)
    else if (id.trim().toLowerCase() === 'metan') useStudio.getState().replaceMolecule(methane())
  } catch {
    /* library unavailable: keep the default molecule */
  }
}
