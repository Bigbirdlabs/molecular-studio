import * as THREE from 'three'

/** What a point sprite draws. */
export type PointMode = 'disc' | 'ring' | 'badge'

const MODE_VALUE: Record<PointMode, number> = { disc: 0, ring: 1, badge: 2 }

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
uniform float uK;     // device pixels per (world unit / depth)
uniform float uDpr;
uniform float uMode;  // 0 disc (aSize = world diameter), 1 ring (aSize = CSS px), 2 badge (aSize = sphere radius)
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  if (uMode > 1.5) mv.xy += vec2(aSize * 0.78); // sits on the upper-right silhouette of the atom
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 1e-3);
  if (uMode < 0.5) gl_PointSize = max(aSize * uK / depth, 3.0 * uDpr);
  else if (uMode < 1.5) gl_PointSize = aSize * uDpr;
  else gl_PointSize = 18.0 * uDpr;
}`

const FRAG = /* glsl */ `
uniform float uMode;
varying vec3 vColor;
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
    // valence badge: coloured disc, light rim, exclamation mark (colour is never the only carrier)
    vec2 q = vec2(p.x, -p.y);
    float bar = step(abs(q.x), 0.13) * step(-0.12, q.y) * step(q.y, 0.58);
    float period = step(length(q - vec2(0.0, -0.46)), 0.16);
    col = mix(col, vec3(1.0), max(bar, period));
    col = mix(col, vec3(0.96, 0.97, 0.98), smoothstep(0.78, 0.86, d));
    a = 1.0 - smoothstep(0.9, 1.0, d);
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
