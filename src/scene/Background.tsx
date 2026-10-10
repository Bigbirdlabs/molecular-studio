import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BG_CENTER, BG_EDGE } from './theme'

/**
 * Near-black backdrop with a barely-there vignette, drawn inside WebGL (so PNG export includes it) from a tiny
 * generated gradient texture. No image asset, no DOM overlay.
 */
export function Background() {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 182)
    g.addColorStop(0, BG_CENTER)
    g.addColorStop(1, BG_EDGE)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const previous = scene.background
    scene.background = tex
    invalidate()
    return () => {
      scene.background = previous
      tex.dispose()
    }
  }, [scene, invalidate])

  return null
}
