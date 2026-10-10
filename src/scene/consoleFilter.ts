/**
 * @react-three/fiber 9.x still builds its render clock with THREE.Clock, which three r183+ flags as deprecated with a
 * console warning on every canvas creation. It is a third-party notice we cannot act on (the app never touches the
 * clock), and the console must stay clean, so exactly that one message is dropped. Everything else passes through.
 */
const PATTERN = /THREE\.Clock: This module has been deprecated/
/**
 * Windows ANGLE/D3D shader compiler emits "warning X4122: sum of ... cannot be represented accurately in double
 * precision" while compiling three's own stock shaders. It is a driver-side precision notice, not actionable. Only a
 * program info log made up exclusively of such X4122 lines is dropped; any other shader log still surfaces.
 */
const ANGLE_X4122 = /^THREE\.WebGLProgram: Program Info Log:/ // three passes the log as a separate argument; callers join all string args
const isOnlyX4122 = (text: string): boolean => {
  if (!ANGLE_X4122.test(text)) return false
  const lines = text
    .replace(/^THREE\.WebGLProgram: Program Info Log:\s*/, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\0/g, '').trim())
    .filter(Boolean)
  return lines.length > 0 && lines.every((l) => /warning X4122:/.test(l))
}

declare global {
  interface Console {
    __sceneFiltered?: boolean
  }
}

if (typeof console !== 'undefined' && !console.__sceneFiltered) {
  const original = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && (PATTERN.test(args[0]) || isOnlyX4122(args.filter((a) => typeof a === 'string').join('\n')))) return
    original(...args)
  }
  console.__sceneFiltered = true
}

export {}
