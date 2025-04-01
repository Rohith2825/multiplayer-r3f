import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html, useGLTF } from '@react-three/drei';

export const OtherPlayer = ({ id, name, position, rotation }) => {
  const meshRef = useRef();
  const targetPosition = new THREE.Vector3();
  const targetQuaternion = new THREE.Quaternion();
  
  // Load the GLB model directly
  const { scene: model, animations } = useGLTF('/models/asian_female_animated.glb'); // Ensure this path is correct

  // Access the Three.js scene and camera
  const { scene, camera } = useThree();
  const mixer = useRef();

  // Log all available animations
  useEffect(() => {
    console.log('Available animations:', animations);
    if (animations && animations.length) {
      mixer.current = new THREE.AnimationMixer(model); // Create a mixer for the model

      // Store references to the running and idle animations
      const runningAnimation = animations.find(anim => anim.name === 'Running');
      const idleAnimation = animations.find(anim => anim.name === 'Idle');

      if (runningAnimation) {
        mixer.current.clipAction(runningAnimation).play(); // Play running animation
      }
      if (idleAnimation) {
        mixer.current.clipAction(idleAnimation).play(); // Play idle animation
      }
    }
  }, [animations, model]);

  useEffect(() => {
    if (meshRef.current && model) {
      // Calculate the bounding box of the model
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y; // Get the height of the model

      // Set the model's position based on the position prop and adjust for height
      model.position.set(position.x, position.y - height / 1.2, position.z); // Adjust Y position to sit on the ground
      model.rotation.set(rotation.x, rotation.y - Math.PI, rotation.z); // Set rotation if needed
      model.scale.set(1.2, 1.2, 1.2); // Scale the model
      scene.add(model); // Add the model to the scene
    }
  }, [position, rotation, model, scene]);

  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta); // Update the mixer on each frame
    }
    if (meshRef.current) {
      // Smoothly interpolate position
      targetPosition.set(position.x, position.y, position.z);
      meshRef.current.position.lerp(targetPosition, 0.1);
      
      // Smoothly interpolate quaternion
      targetQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      meshRef.current.quaternion.slerp(targetQuaternion, 0.1);

      // Directly synchronize character's rotation with camera's rotation
      meshRef.current.rotation.set(camera.rotation.x, camera.rotation.y, camera.rotation.z); // Set character's rotation to camera's rotation

      // Check if the model is moving
      const distance = meshRef.current.position.distanceTo(targetPosition);
      const isMoving = distance > 0.5; // Check if moved more than 0.5 units
      if (isMoving) {
        // Play running animation
        mixer.current.clipAction(animations.find(anim => anim.name === 'Running')).play();
        mixer.current.clipAction(animations.find(anim => anim.name === 'Idle')).stop(); // Stop idle animation
      } else {
        // Play idle animation
        mixer.current.clipAction(animations.find(anim => anim.name === 'Idle')).play();
        mixer.current.clipAction(animations.find(anim => anim.name === 'Running')).stop(); // Stop running animation
      }
    }
  });

  return (
    <group ref={meshRef}>
      <Html position={[0, 1, 0]} center zIndexRange={[0, 0]}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: -1,
        }}>
          {name}
        </div>
      </Html>
    </group>
  );
};

// Preload the GLB model
useGLTF.preload('/models/asian_female_animated.glb'); // Ensure this path is correct 