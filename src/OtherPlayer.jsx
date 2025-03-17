import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const OtherPlayer = ({ id, position, rotation }) => {
  const meshRef = useRef();
  const targetPosition = new THREE.Vector3();
  const targetRotation = new THREE.Euler();

  useEffect(() => {
    if (meshRef.current) {
      targetPosition.set(position.x, position.y, position.z);
      targetRotation.set(rotation.x, rotation.y, rotation.z);
    }
  }, [position, rotation]);

  useFrame(() => {
    if (meshRef.current) {
      // Smoothly interpolate position
      meshRef.current.position.lerp(targetPosition, 0.1);
      
      // Smoothly interpolate rotation
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotation.x,
        0.1
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation.y,
        0.1
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        targetRotation.z,
        0.1
      );
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[1, 2, 4, 8]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}; 