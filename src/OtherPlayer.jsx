import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

export const OtherPlayer = ({ id, name, position, rotation }) => {
  const meshRef = useRef();
  const targetPosition = new THREE.Vector3();
  const targetQuaternion = new THREE.Quaternion();

  useEffect(() => {
    if (meshRef.current) {
      targetPosition.set(position.x, position.y, position.z);
      targetQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }, [position, rotation]);

  useFrame(() => {
    if (meshRef.current) {
      // Smoothly interpolate position
      meshRef.current.position.lerp(targetPosition, 0.1);
      
      // Smoothly interpolate quaternion
      meshRef.current.quaternion.slerp(targetQuaternion, 0.1);
    }
  });

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <capsuleGeometry args={[1, 2, 4, 8]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      <Html position={[0, 3, 0]} center>
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
      </Html>
    </group>
  );
}; 