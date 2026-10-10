import { FolderOpen, Globe, ImageDown, Save, FileDown, Focus } from 'lucide-react'
import { useStudio, type RenderStyle } from '../store'
import { useT, type TFn } from './i18n'
import { useUI } from './uiStore'
import { exportMolecule, exportPng, pickAndImportFile, saveProjectNow } from './actions'
import { MOD } from './shortcuts'
import type { MenuEntry } from './Menu'

/** File menu entries (shared by the desktop/tablet menu and the phone overflow menu). */
export function useFileItems(): MenuEntry[] {
  const t = useT()
  const empty = useStudio((s) => s.mol.atoms.length === 0)
  const openDialog = useUI((s) => s.openDialog)
  return fileItems(t, empty, openDialog)
}

function fileItems(t: TFn, empty: boolean, openDialog: (d: 'pubchem') => void): MenuEntry[] {
  return [
    { type: 'item', label: t('file.save'), icon: <Save size={15} aria-hidden />, shortcut: `${MOD}+S`, onSelect: saveProjectNow },
    { type: 'item', label: t('file.import'), icon: <FolderOpen size={15} aria-hidden />, onSelect: pickAndImportFile },
    { type: 'item', label: t('file.pubchem'), icon: <Globe size={15} aria-hidden />, onSelect: () => openDialog('pubchem') },
    { type: 'sep' },
    { type: 'item', label: t('file.exportMol'), icon: <FileDown size={15} aria-hidden />, onSelect: () => void exportMolecule('mol'), disabled: empty, reason: t('file.exportEmpty') },
    { type: 'item', label: t('file.exportXyz'), icon: <FileDown size={15} aria-hidden />, onSelect: () => void exportMolecule('xyz'), disabled: empty, reason: t('file.exportEmpty') },
    { type: 'item', label: t('file.exportPng'), icon: <ImageDown size={15} aria-hidden />, onSelect: exportPng, disabled: empty, reason: t('file.exportEmpty') },
  ]
}

const STYLES: RenderStyle[] = ['ballstick', 'spacefill', 'stick', 'wireframe']

/** View menu entries: render style (radio), render toggles (checkbox) and camera reset. */
export function useViewItems(): MenuEntry[] {
  const t = useT()
  const style = useStudio((s) => s.style)
  const setStyle = useStudio((s) => s.setStyle)
  const toggle = useStudio((s) => s.toggle)
  const showHydrogens = useStudio((s) => s.showHydrogens)
  const showLabels = useStudio((s) => s.showLabels)
  const showCharges = useStudio((s) => s.showCharges)
  const autoRotate = useStudio((s) => s.autoRotate)
  const reduced = useStudio((s) => s.reducedMotion)
  const resetCamera = useStudio((s) => s.resetCamera)
  return [
    { type: 'label', label: t('view.style') },
    ...STYLES.map((s): MenuEntry => ({
      type: 'item', role: 'radio', checked: style === s, label: t(`style.${s}`), onSelect: () => setStyle(s),
    })),
    { type: 'sep' },
    { type: 'label', label: t('view.options') },
    { type: 'item', role: 'checkbox', checked: showHydrogens, label: t('view.hydrogens'), onSelect: () => toggle('showHydrogens') },
    { type: 'item', role: 'checkbox', checked: showLabels, label: t('view.labels'), onSelect: () => toggle('showLabels') },
    { type: 'item', role: 'checkbox', checked: showCharges, label: t('view.charges'), onSelect: () => toggle('showCharges') },
    {
      type: 'item', role: 'checkbox', checked: autoRotate && !reduced, label: t('view.autorotate'),
      disabled: reduced, reason: t('view.autorotateReason'), onSelect: () => toggle('autoRotate'),
    },
    { type: 'sep' },
    { type: 'item', label: t('view.resetCamera'), icon: <Focus size={15} aria-hidden />, shortcut: 'F', onSelect: resetCamera },
  ]
}
