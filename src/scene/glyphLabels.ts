import * as THREE from 'three'

/**
 * Screen-space text for the 3D scene without DOM nodes and without any remote font: a small canvas glyph atlas and
 * one instanced quad per character, billboarded in the vertex shader at a constant CSS-pixel size. One draw call
 * regardless of the number of labels (atom symbols, measurement values, measurement markers).
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-+:=°Å'
const CELL = 64
const FONT_PX = 40 // em size inside a cell
const COLS = 12
const FLOATS = 16 // iOrigin3 iRect4 iUv4 iTint3 iShift2

interface Glyph { u0: number; v0: number; u1: number; v1: number; adv: number }

export interface LabelOptions {
  /** Font size in CSS pixels. */
  px: number
  /** Linear-space tint (see `tintOf`). */
  tint: [number, number, number]
  /** Anchor: 'center' centres the text on the origin, 'left' starts at it. */
  align?: 'center' | 'left'
  /** Extra screen offset in CSS pixels (+x right, +y up). */
  offsetPx?: [number, number]
  /** Extra offset in view-space world units (e.g. atom radius to sit on a sphere's silhouette). */
  shift?: [number, number]
  /** Draw a dark disc with a light rim behind the text (numbered markers). */
  disc?: boolean
}

const tintCache = new Map<string, [number, number, number]>()
/** Linear RGB triple for a CSS colour (cached). */
export function tintOf(css: string): [number, number, number] {
  let t = tintCache.get(css)
  if (!t) {
    const c = new THREE.Color(css)
    t = [c.r, c.g, c.b]
    tintCache.set(css, t)
  }
  return t
}

const VERT = /* glsl */ `
attribute vec3 iOrigin;
attribute vec4 iRect;
attribute vec4 iUv;
attribute vec3 iTint;
attribute vec2 iShift;
uniform float uHeight;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(iOrigin, 1.0);
  mv.xy += iShift;
  float wpp = (-mv.z) * 2.0 / (projectionMatrix[1][1] * uHeight); // world units per CSS pixel at this depth
  mv.xy += (position.xy * iRect.zw + iRect.xy) * wpp;
  gl_Position = projectionMatrix * mv;
  vUv = mix(iUv.xy, iUv.zw, position.xy + 0.5);
  vTint = iTint;
}`

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.02) discard;
  gl_FragColor = vec4(vTint * t.rgb, t.a);
  #include <colorspace_fragment>
}`

export class GlyphLabels {
  readonly mesh: THREE.Mesh
  private readonly texture: THREE.CanvasTexture
  private readonly material: THREE.ShaderMaterial
  private readonly quad: THREE.PlaneGeometry
  private geo: THREE.InstancedBufferGeometry
  private data: Float32Array
  private capacity: number
  private count = 0
  private readonly glyphs = new Map<string, Glyph>()
  private disc!: Glyph
  private readonly size = new THREE.Vector2()

  constructor(parent: THREE.Object3D, renderOrder: number) {
    const rows = Math.ceil((CHARS.length + 1) / COLS)
    const canvas = document.createElement('canvas')
    canvas.width = COLS * CELL
    canvas.height = rows * CELL
    const ctx = canvas.getContext('2d')!
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${FONT_PX}px Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`
    ctx.lineJoin = 'round'
    const W = canvas.width, H = canvas.height
    const cellUv = (col: number, row: number) => ({
      u0: (col * CELL) / W, u1: ((col + 1) * CELL) / W, v1: 1 - (row * CELL) / H, v0: 1 - ((row + 1) * CELL) / H,
    })
    for (let i = 0; i < CHARS.length; i++) {
      const ch = CHARS[i]
      const col = i % COLS, row = Math.floor(i / COLS)
      const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2 + 1
      ctx.lineWidth = 7
      ctx.strokeStyle = 'rgba(8,9,11,0.92)' // dark halo keeps text legible on any atom colour
      ctx.strokeText(ch, cx, cy)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(ch, cx, cy)
      this.glyphs.set(ch, { ...cellUv(col, row), adv: ctx.measureText(ch).width / FONT_PX })
    }
    {
      const i = CHARS.length
      const col = i % COLS, row = Math.floor(i / COLS)
      const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2
      ctx.beginPath()
      ctx.arc(cx, cy, 25, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(10,11,13,0.94)'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      this.disc = { ...cellUv(col, row), adv: 0 }
    }

    this.texture = new THREE.CanvasTexture(canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 4
    this.texture.generateMipmaps = true
    this.texture.minFilter = THREE.LinearMipmapLinearFilter
    this.texture.magFilter = THREE.LinearFilter

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: this.texture }, uHeight: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })

    this.quad = new THREE.PlaneGeometry(1, 1)
    this.capacity = 128
    this.data = new Float32Array(this.capacity * FLOATS)
    this.geo = this.makeGeometry()
    this.mesh = new THREE.Mesh(this.geo, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = renderOrder
    this.mesh.visible = false
    this.mesh.onBeforeRender = (renderer) => {
      renderer.getSize(this.size)
      this.material.uniforms.uHeight.value = Math.max(1, this.size.y)
    }
    parent.add(this.mesh)
  }

  private makeGeometry(): THREE.InstancedBufferGeometry {
    const g = new THREE.InstancedBufferGeometry()
    g.index = this.quad.index
    g.setAttribute('position', this.quad.getAttribute('position'))
    const buf = new THREE.InstancedInterleavedBuffer(this.data, FLOATS, 1)
    buf.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('iOrigin', new THREE.InterleavedBufferAttribute(buf, 3, 0))
    g.setAttribute('iRect', new THREE.InterleavedBufferAttribute(buf, 4, 3))
    g.setAttribute('iUv', new THREE.InterleavedBufferAttribute(buf, 4, 7))
    g.setAttribute('iTint', new THREE.InterleavedBufferAttribute(buf, 3, 11))
    g.setAttribute('iShift', new THREE.InterleavedBufferAttribute(buf, 2, 14))
    g.instanceCount = 0
    return g
  }

  begin(): void {
    this.count = 0
  }

  private push(
    x: number, y: number, z: number, rx: number, ry: number, rw: number, rh: number, g: Glyph,
    tint: [number, number, number], shift: [number, number] | undefined,
  ): void {
    if (this.count >= this.capacity) {
      this.capacity *= 2
      const next = new Float32Array(this.capacity * FLOATS)
      next.set(this.data)
      this.data = next
      this.geo.dispose()
      this.geo = this.makeGeometry()
      this.mesh.geometry = this.geo
    }
    const d = this.data, o = this.count++ * FLOATS
    d[o] = x; d[o + 1] = y; d[o + 2] = z
    d[o + 3] = rx; d[o + 4] = ry; d[o + 5] = rw; d[o + 6] = rh
    d[o + 7] = g.u0; d[o + 8] = g.v0; d[o + 9] = g.u1; d[o + 10] = g.v1
    d[o + 11] = tint[0]; d[o + 12] = tint[1]; d[o + 13] = tint[2]
    d[o + 14] = shift ? shift[0] : 0; d[o + 15] = shift ? shift[1] : 0
  }

  /** Queue a label anchored at a world position. Unknown characters are skipped. */
  add(text: string, x: number, y: number, z: number, o: LabelOptions): void {
    const px = o.px
    const ox = o.offsetPx?.[0] ?? 0, oy = o.offsetPx?.[1] ?? 0
    const quad = (px * CELL) / FONT_PX
    if (o.disc) this.push(x, y, z, ox, oy, px * 1.7, px * 1.7, this.disc, o.tint, o.shift)
    let width = 0
    const gl: Glyph[] = []
    for (const ch of text) {
      const g = this.glyphs.get(ch)
      if (g) { gl.push(g); width += g.adv * px }
    }
    let pen = o.align === 'left' ? 0 : -width / 2
    for (const g of gl) {
      const w = g.adv * px
      this.push(x, y, z, ox + pen + w / 2, oy, quad, quad, g, o.tint, o.shift)
      pen += w
    }
  }

  end(): void {
    const buf = (this.geo.getAttribute('iOrigin') as THREE.InterleavedBufferAttribute).data
    buf.needsUpdate = true
    this.geo.instanceCount = this.count
    this.mesh.visible = this.count > 0
  }

  dispose(): void {
    this.mesh.parent?.remove(this.mesh)
    this.geo.dispose()
    this.quad.dispose()
    this.material.dispose()
    this.texture.dispose()
  }
}
