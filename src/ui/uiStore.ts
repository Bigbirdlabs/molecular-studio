import { create } from 'zustand'

/**
 * Pure interface state (which dialog is open, which menu is open ...).
 * Molecule/editor state stays in the main store (src/store.ts); nothing here is read by the 3D scene.
 */
export type DialogId = 'library' | 'settings' | 'shortcuts' | 'pubchem' | null
export type MenuId = 'file' | 'view' | 'more' | 'actions' | null
export type SheetSnap = 'peek' | 'half' | 'full'

interface UIState {
  dialog: DialogId
  openDialog: (d: Exclude<DialogId, null>) => void
  closeDialog: () => void
  /** Mobile: snap position of the molecule-info bottom sheet. */
  infoSnap: SheetSnap
  setInfoSnap: (s: SheetSnap) => void
}

export const useUI = create<UIState>((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  infoSnap: 'peek',
  setInfoSnap: (infoSnap) => set({ infoSnap }),
}))
