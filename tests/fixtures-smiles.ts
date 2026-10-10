/**
 * Test-only helper: a tiny SMILES reader (Kekule form only) that builds molecules with explicit
 * hydrogens. Coordinates are a deterministic spiral: good enough for graph-based properties,
 * NOT a real 3D geometry.
 */
import { type Atom, type BondOrder, type Molecule, type Vec3, allowedValences, emptyMolecule, valenceUsed } from '../src/chem/molecule'

const ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I']

export function fromSmiles(smiles: string, name = 'test'): Molecule {
  const m = emptyMolecule(name)
  const explicitH = new Map<number, number>()
  const rings = new Map<number, { atom: number; order: BondOrder }>()
  const stack: number[] = []
  let prev = -1
  let order: BondOrder = 1
  let k = 0

  const addAtom = (symbol: string, charge = 0, hs: number | null = null): number => {
    const id = m.nextId++
    const pos: Vec3 = [1.5 * Math.cos(k * 0.9) + 0.37 * k, 1.5 * Math.sin(k * 0.9), 0.3 * k]
    k++
    m.atoms.push({ id, symbol, pos, charge })
    if (hs !== null) explicitH.set(id, hs)
    if (prev >= 0) m.bonds.push({ id: m.nextId++, a: prev, b: id, order })
    prev = id
    order = 1
    return id
  }

  for (let i = 0; i < smiles.length; i++) {
    const c = smiles[i]
    if (c === '(') stack.push(prev)
    else if (c === ')') prev = stack.pop()!
    else if (c === '-') order = 1
    else if (c === '=') order = 2
    else if (c === '#') order = 3
    else if (c === '.') prev = -1
    else if (/[0-9]/.test(c)) {
      const n = Number(c)
      const open = rings.get(n)
      if (open) {
        m.bonds.push({ id: m.nextId++, a: open.atom, b: prev, order: order > open.order ? order : open.order })
        rings.delete(n)
        order = 1
      } else rings.set(n, { atom: prev, order })
      if (!open) order = 1
    } else if (c === '[') {
      const end = smiles.indexOf(']', i)
      const body = smiles.slice(i + 1, end)
      const mm = /^([A-Z][a-z]?)(?:H(\d*))?([+-]\d*|\+\+|--)?$/.exec(body)
      if (!mm) throw new Error(`bad bracket atom ${body}`)
      let charge = 0
      if (mm[3]) charge = mm[3] === '++' ? 2 : mm[3] === '--' ? -2 : mm[3].length === 1 ? (mm[3] === '+' ? 1 : -1) : Number(mm[3][0] + mm[3].slice(1))
      const hs = mm[2] === undefined ? 0 : mm[2] === '' ? 1 : Number(mm[2])
      addAtom(mm[1], charge, body.includes('H') ? hs : 0)
      i = end
    } else {
      const two = smiles.slice(i, i + 2)
      const sym = ORGANIC.includes(two) ? two : c
      if (!ORGANIC.includes(sym)) throw new Error(`unsupported SMILES token ${c}`)
      addAtom(sym)
      i += sym.length - 1
    }
  }

  // implicit hydrogens
  const heavy: Atom[] = [...m.atoms]
  let j = 0
  for (const a of heavy) {
    let nH: number
    if (explicitH.has(a.id)) nH = explicitH.get(a.id)!
    else {
      const used = valenceUsed(m, a.id)
      const list = allowedValences(a)
      const target = list.find((v) => v >= used) ?? list[list.length - 1] ?? used
      nH = Math.max(0, target - used)
    }
    for (let h = 0; h < nH; h++) {
      const id = m.nextId++
      const ang = (j++ + 1) * 1.7
      m.atoms.push({ id, symbol: 'H', pos: [a.pos[0] + Math.cos(ang), a.pos[1] + Math.sin(ang), a.pos[2] + 0.5 * (h - 1)], charge: 0 })
      m.bonds.push({ id: m.nextId++, a: a.id, b: id, order: 1 })
    }
  }
  return m
}

/** Build a molecule directly from atoms and bonds (symbols, [a,b,order] with 0-based indices). */
export function build(symbols: string[], bonds: [number, number, BondOrder][], charges: Record<number, number> = {}): Molecule {
  const m = emptyMolecule('built')
  symbols.forEach((s, i) => m.atoms.push({ id: m.nextId++, symbol: s, pos: [i * 1.2, 0, 0], charge: charges[i] ?? 0 }))
  for (const [a, b, o] of bonds) m.bonds.push({ id: m.nextId++, a: m.atoms[a].id, b: m.atoms[b].id, order: o })
  return m
}
