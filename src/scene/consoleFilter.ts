/**
 * @react-three/fiber 9.x still builds its render clock with THREE.Clock, which three r183+ flags as deprecated with a
 * console warning on every canvas creation. It is a third-party notice we cannot act on (the app never touches the
 * clock), and the console must stay clean, so exactly that one message is dropped (SPEC B.9). Everything else - shader
 * logs, driver notices, other deprecations - passes through untouched, in every build.
 */
const PATTERN = /THREE.Clock: This module has been deprecated/

declare global {
  interface Console {
    __sceneFiltered?: boolean
  }
}

if (typeof console !== 'undefined' && !console.__sceneFiltered) {
  const original = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && PATTERN.test(args[0])) return
    original(...args)
  }
  console.__sceneFiltered = true
}

export {}
