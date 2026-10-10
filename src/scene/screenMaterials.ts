import * as THREE from 'three'

/**
 * Materials whose widths are constant on screen, whatever the zoom (SPEC C3 SHOULD, E20): selection / hover shells
 * and measurement lines. They read the per-instance matrix written by `writeSphere` / `writeCylinder` and inflate (shell)
 * or build (line) the geometry in the vertex shader, converting CSS pixels to world units at the instance's depth.
 */

const size = new THREE.Vector2()

function trackHeight(material: THREE.ShaderMaterial): void {
  material.onBeforeRender = (renderer) => {
    renderer.getSize(size)
    material.uniforms.uHeight.value = Math.max(1, size.y)
  }
}

const SHELL_VERT = /* glsl */ `
uniform float uPx;      // inflation in CSS pixels
uniform float uHeight;  // canvas height in CSS pixels
uniform float uMode;    // 0 sphere instance, 1 cylinder instance
void main() {
  mat4 im = instanceMatrix;
  vec3 c = im[3].xyz;
  vec3 col0 = im[0].xyz;
  float r = length(col0);
  vec4 mvc = modelViewMatrix * vec4(c, 1.0);
  float wpp = max(-mvc.z, 1e-3) * 2.0 / (projectionMatrix[1][1] * uHeight); // world units per CSS pixel
  float off = uPx * wpp;
  vec3 local;
  if (uMode < 0.5) {
    local = position * (r + off);
  } else {
    vec3 u = col0 / max(r, 1e-6);
    vec3 axis = im[1].xyz;
    float L = length(axis);
    vec3 ay = axis / max(L, 1e-6);
    vec3 w = im[2].xyz / max(length(im[2].xyz), 1e-6);
    local = (u * position.x + w * position.z) * (r + off) + ay * (position.y * L + sign(position.y) * off);
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(c + local, 1.0);
}`

const SHELL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
}`

export type ShellKind = 'sphere' | 'cylinder'

/** Back-face shell around an instanced sphere / cylinder, `px` CSS pixels wider than the object. */
export function createShellMaterial(kind: ShellKind, color: THREE.ColorRepresentation, px: number, opacity = 1): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    uniforms: {
      uPx: { value: px },
      uHeight: { value: 1 },
      uMode: { value: kind === 'sphere' ? 0 : 1 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    side: THREE.BackSide,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    toneMapped: false,
  })
  trackHeight(m)
  return m
}

const LINE_VERT = /* glsl */ `
uniform float uPx;
uniform float uHeight;
varying vec3 vColor;
void main() {
  vec3 u = instanceMatrix[0].xyz;      // unit vectors (radius 1 was written)
  vec3 axis = instanceMatrix[1].xyz;   // segment vector
  vec3 w = instanceMatrix[2].xyz;
  vec3 c = instanceMatrix[3].xyz;
  vec4 mvc = modelViewMatrix * vec4(c, 1.0);
  float wpp = max(-mvc.z, 1e-3) * 2.0 / (projectionMatrix[1][1] * uHeight);
  float rad = 0.5 * uPx * wpp;
  vec3 local = (u * position.x + w * position.z) * rad + axis * position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(c + local, 1.0);
  #ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
  #else
  vColor = vec3(1.0);
  #endif
}`

const LINE_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}`

/** Unit-radius cylinder instances drawn as lines `px` CSS pixels wide, on top of everything (depth test off). */
export function createLineMaterial(px: number): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: { uPx: { value: px }, uHeight: { value: 1 } },
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  trackHeight(m)
  return m
}
