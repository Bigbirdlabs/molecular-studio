import * as THREE from 'three'

/** What a point sprite draws. */
export type PointMode = 'disc' | 'ring' | 'valence'

const MODE_VALUE: Record<PointMode, number> = { disc: 0, ring: 1, valence: 2 }

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
uniform float uK;     // device pixels per (world unit / depth)
uniform float uDpr;
uniform float uMode;  // 0 disc (aSize = world diameter), 1 ring (aSize = CSS px), 2 valence ring (|aSize| = sphere radius, < 0 dashed)
varying vec3 vColor;
varying float vSize;
varying float vDash;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 1e-3);
  vDash = aSize < 0.0 ? 1.0 : 0.0;
  if (uMode < 0.5) gl_PointSize = max(aSize * uK / depth, 3.0 * uDpr);
  else if (uMode < 1.5) gl_PointSize = aSize * uDpr;
  else gl_PointSize = 2.0 * abs(aSize) * uK / depth + 11.0 * uDpr; // the atom's silhouette plus a margin
  vSize = gl_PointSize;
}`

const FRAG = /* glsl */ `
uniform float uMode;
uniform float uDpr;
varying vec3 vColor;
varying float vSize;
varying float vDash;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  vec3 col = vColor;
  float a = 1.0;
  if (uMode < 0.5) {
    a = 1.0 - smoothstep(0.78, 1.0, d);
  } else if (uMode < 1.5) {
    a = smoothstep(0.66, 0.76, d) * (1.0 - smoothstep(0.9, 1.0, d));
    if (a < 0.02) discard;
  } else {
    // valence ring: thin (about 1.5 px) circle just outside the atom; dashed when the atom is merely under-valent
    float px = d * vSize * 0.5;
    float centre = vSize * 0.5 - 2.5 * uDpr;
    float hw = 0.75 * uDpr;
    a = 1.0 - smoothstep(hw - 0.6, hw + 0.6, abs(px - centre));
    if (vDash > 0.5) {
      float t = fract(atan(p.y, p.x) / 6.2831853 * 16.0);
      a *= step(t, 0.55);
    }
    if (a < 0.02) discard;
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`

/** One shader material per mode. Uniforms are refreshed from the renderer right before each draw. */
export function createPointMaterial(mode: PointMode): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uK: { value: 1 }, uDpr: { value: 1 }, uMode: { value: MODE_VALUE[mode] } },
    transparent: true,
    depthWrite: false, // small markers always read on top of the tubes they sit on
    depthTest: false,
    toneMapped: false,
  })
}

const size = new THREE.Vector2()
/** Keep point-size uniforms in sync with the drawing buffer and projection of whichever camera renders the points. */
export function bindPointUniforms(points: THREE.Points, material: THREE.ShaderMaterial): void {
  points.onBeforeRender = (renderer, _scene, camera) => {
    renderer.getDrawingBufferSize(size)
    const p11 = (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5]
    material.uniforms.uK.value = (size.y * p11) / 2
    material.uniforms.uDpr.value = renderer.getPixelRatio()
  }
}
