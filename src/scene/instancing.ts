import * as THREE from 'three'

/** Write a uniformly scaled translation (sphere instance) as a column-major 4x4 at slot i. */
export function writeSphere(arr: Float32Array, i: number, x: number, y: number, z: number, r: number): void {
  const o = i * 16
  arr[o] = r; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0
  arr[o + 4] = 0; arr[o + 5] = r; arr[o + 6] = 0; arr[o + 7] = 0
  arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = r; arr[o + 11] = 0
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1
}

/**
 * Write a unit cylinder (radius 1, height 1, centred, axis Y) stretched between two points with the given radius.
 * Returns false (and writes nothing) for a degenerate segment.
 */
export function writeCylinder(
  arr: Float32Array, i: number,
  ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number,
): boolean {
  const dx = bx - ax, dy = by - ay, dz = bz - az
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-6 || r <= 0) return false
  const ix = dx / len, iy = dy / len, iz = dz / len
  // any unit vector perpendicular to the axis
  let ux: number, uy: number, uz: number
  if (Math.abs(ix) < 0.9) { ux = 0; uy = iz; uz = -iy } else { ux = -iz; uy = 0; uz = ix }
  const ul = Math.hypot(ux, uy, uz)
  ux /= ul; uy /= ul; uz /= ul
  // w = u x i, so that (u, i, w) is right-handed: a mirrored instance matrix would flip the triangle winding
  const wx = uy * iz - uz * iy, wy = uz * ix - ux * iz, wz = ux * iy - uy * ix
  const o = i * 16
  arr[o] = ux * r; arr[o + 1] = uy * r; arr[o + 2] = uz * r; arr[o + 3] = 0
  arr[o + 4] = dx; arr[o + 5] = dy; arr[o + 6] = dz; arr[o + 7] = 0
  arr[o + 8] = wx * r; arr[o + 9] = wy * r; arr[o + 10] = wz * r; arr[o + 11] = 0
  arr[o + 12] = (ax + bx) * 0.5; arr[o + 13] = (ay + by) * 0.5; arr[o + 14] = (az + bz) * 0.5; arr[o + 15] = 1
  return true
}

/**
 * A growable InstancedMesh. Writing goes straight into the typed arrays (no Object3D per instance).
 * Growth replaces the mesh (and frees the old instance buffers), so always address `pool.mesh` after `ensure`.
 */
export class InstancePool {
  mesh: THREE.InstancedMesh
  count = 0
  private capacity: number

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly geometry: THREE.BufferGeometry,
    private readonly material: THREE.Material,
    private readonly colored: boolean,
    private readonly renderOrder = 0,
    capacity = 64,
  ) {
    this.capacity = capacity
    this.mesh = this.create(capacity)
    parent.add(this.mesh)
  }

  private create(cap: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, cap)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    if (this.colored) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3)
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    }
    mesh.frustumCulled = false // bounding sphere would be stale; the molecule is always near the view centre
    mesh.renderOrder = this.renderOrder
    mesh.count = 0
    mesh.visible = false
    return mesh
  }

  ensure(n: number): void {
    if (n <= this.capacity) return
    let cap = this.capacity
    while (cap < n) cap *= 2
    const old = this.mesh
    this.parent.remove(old)
    old.dispose()
    this.capacity = cap
    this.mesh = this.create(cap)
    this.parent.add(this.mesh)
  }

  get matrices(): Float32Array {
    return this.mesh.instanceMatrix.array as Float32Array
  }

  get colors(): Float32Array {
    return this.mesh.instanceColor!.array as Float32Array
  }

  begin(): void {
    this.count = 0
  }

  /** Commit `count` written instances. */
  end(): void {
    const m = this.mesh
    m.count = this.count
    m.visible = this.count > 0
    if (this.count > 0) {
      m.instanceMatrix.clearUpdateRanges()
      m.instanceMatrix.addUpdateRange(0, this.count * 16)
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) {
        m.instanceColor.clearUpdateRanges()
        m.instanceColor.addUpdateRange(0, this.count * 3)
        m.instanceColor.needsUpdate = true
      }
    }
  }

  dispose(): void {
    this.parent.remove(this.mesh)
    this.mesh.dispose()
  }
}

/**
 * Growable THREE.Points with the attribute layout position(3) / aColor(3) / aSize(1), used for wireframe atoms,
 * selection rings and valence badges. Replaces the geometry on growth so no GPU buffer is leaked.
 */
export class PointCloud {
  readonly points: THREE.Points
  count = 0
  private capacity: number
  private geo: THREE.BufferGeometry

  constructor(parent: THREE.Object3D, material: THREE.Material, renderOrder: number, capacity = 64) {
    this.capacity = capacity
    this.geo = this.makeGeometry(capacity)
    this.points = new THREE.Points(this.geo, material)
    this.points.frustumCulled = false
    this.points.renderOrder = renderOrder
    this.points.visible = false
    parent.add(this.points)
  }

  private makeGeometry(cap: number): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    const mk = (n: number) => {
      const a = new THREE.BufferAttribute(new Float32Array(cap * n), n)
      a.setUsage(THREE.DynamicDrawUsage)
      return a
    }
    g.setAttribute('position', mk(3))
    g.setAttribute('aColor', mk(3))
    g.setAttribute('aSize', mk(1))
    return g
  }

  ensure(n: number): void {
    if (n <= this.capacity) return
    let cap = this.capacity
    while (cap < n) cap *= 2
    this.geo.dispose()
    this.capacity = cap
    this.geo = this.makeGeometry(cap)
    this.points.geometry = this.geo
  }

  begin(): void {
    this.count = 0
  }

  push(x: number, y: number, z: number, r: number, g: number, b: number, size: number): void {
    const a = this.geo.attributes
    const i = this.count++
    const pos = a.position.array as Float32Array
    const col = a.aColor.array as Float32Array
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b
    ;(a.aSize.array as Float32Array)[i] = size
  }

  end(): void {
    this.geo.setDrawRange(0, this.count)
    this.points.visible = this.count > 0
    for (const k of ['position', 'aColor', 'aSize'] as const) this.geo.attributes[k].needsUpdate = true
  }

  dispose(): void {
    this.points.parent?.remove(this.points)
    this.geo.dispose()
  }
}
