import { useEffect } from 'react'
import { useStudio, type Tool } from '../store'
import { PALETTE } from '../chem/elements'
import { useUI } from './uiStore'
import { saveProjectNow } from './actions'
import { t } from './i18n'

/** Single-key tool shortcuts (shown in tooltips and in the shortcuts dialog). */
export const TOOL_KEYS: Record<Tool, string> = {
  select: 'V', rotate: 'R', pan: 'P', zoom: 'Z', atom: 'A', bond: 'B', erase: 'D', measure: 'M',
}
const KEY_TO_TOOL: Record<string, Tool> = {
  v: 'select', r: 'rotate', p: 'pan', z: 'zoom', a: 'atom', b: 'bond', d: 'erase', e: 'erase', m: 'measure',
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'

const BUFFER_MS = 700

/**
 * Global keyboard shortcuts. Ignored while typing in a field or while a dialog is open
 * (dialogs own their own keyboard handling).
 */
export function useShortcuts(): void {
  useEffect(() => {
    let buffer = ''
    let bufferTimer: ReturnType<typeof setTimeout> | null = null
    const setBuffer = (v: string, onExpire?: () => void) => {
      buffer = v
      if (bufferTimer) clearTimeout(bufferTimer)
      bufferTimer = v
        ? setTimeout(() => {
            buffer = ''
            onExpire?.()
          }, BUFFER_MS)
        : null
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input,textarea,select,[contenteditable="true"],[role="menu"]')) return
      if (useUI.getState().dialog) return
      const st = useStudio.getState()
      const key = e.key
      const lower = key.toLowerCase()

      if (e.ctrlKey || e.metaKey) {
        if (e.altKey) return
        if (lower === 'z') { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo() }
        else if (lower === 'y') { e.preventDefault(); st.redo() }
        else if (lower === 'a') { e.preventDefault(); st.selectAll() }
        else if (lower === 's') { e.preventDefault(); saveProjectNow() }
        return
      }
      if (e.altKey) return

      if (key === 'Escape') {
        if (st.tool !== 'select') st.setTool('select')
        else if (st.selection.length || st.selectedBond !== null || st.measure.length) {
          st.setSelection([])
          st.clearMeasure()
        }
        return
      }
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault()
        if (st.selection.length || st.selectedBond !== null) st.deleteSelection()
        else st.notify(t('toast.nothingSelected'), 'info')
        return
      }
      if (key === '?') { useUI.getState().openDialog('shortcuts'); return }
      if (key.length !== 1 || !/[a-z]/i.test(key)) return
      if (e.repeat) return

      // Add Atom active: element letters win over tool letters (Cl, Br, Na, Mg, Si via a short buffer).
      if (st.tool === 'atom') {
        const pair = buffer + lower
        const two = PALETTE.find((s) => s.length === 2 && s.toLowerCase() === pair)
        if (two) { e.preventDefault(); st.setElement(two); setBuffer(''); return }
        if (lower === 'm') {
          e.preventDefault()
          setBuffer('m', () => useStudio.getState().setTool('measure')) // plain "M" still means Measure after a pause
          return
        }
        const one = PALETTE.find((s) => s.length === 1 && s.toLowerCase() === lower)
        if (one) { e.preventDefault(); st.setElement(one); setBuffer(lower); return }
      }
      setBuffer('')

      if (lower === 'f') { e.preventDefault(); st.resetCamera(); return }
      const tool = KEY_TO_TOOL[lower]
      if (tool) { e.preventDefault(); st.setTool(tool) }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (bufferTimer) clearTimeout(bufferTimer)
    }
  }, [])
}
