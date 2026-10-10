import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import type { Group } from 'three'

/**
 * Restrained studio lighting. The key / fill / rim lights ride along with the camera, so the molecule keeps a
 * readable, consistent shading however it is rotated; the image-based light is built from local Lightformers
 * (no remote HDRI), rendered once.
 */
export function Lighting() {
  const rig = useRef<Group>(null)

  useFrame(({ camera }) => {
    const g = rig.current
    if (g) g.quaternion.copy(camera.quaternion)
  }, -1)

  return (
    <>
      <ambientLight intensity={0.12} />
      <group ref={rig}>
        {/* key: upper left, slightly warm */}
        <directionalLight position={[-4, 6, 7]} intensity={2.3} color="#fff4e8" />
        {/* fill: lower right, cool and soft */}
        <directionalLight position={[6, -2, 4]} intensity={0.55} color="#c4d4ff" />
        {/* rim: from behind to separate the silhouette from the background */}
        <directionalLight position={[2, 3, -7]} intensity={1.1} color="#ffffff" />
      </group>
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <color attach="background" args={['#15171b']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[7, 6, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[6, -1, 3]} rotation-y={-Math.PI / 2} scale={[7, 4, 1]} />
        <Lightformer form="ring" intensity={0.9} position={[0, 1, -7]} scale={5} />
      </Environment>
    </>
  )
}
