import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { usePersonControls } from "@/hooks.js";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import nipplejs from "nipplejs";
import gsap from "gsap";
import { useComponentStore, useTouchStore, useMultiplayerStore } from "./stores/ZustandStores";
import { CameraController } from "./CameraController";
import { ProductGSAPUtil } from "./ProductGSAPUtil";
import io from "socket.io-client";
import { OtherPlayer } from "./OtherPlayer";

const MOVE_SPEED = 12;
const TOUCH_SENSITIVITY = {
  PORTRAIT: {
    x: 0.004, 
    y: 0.004, 
  },
  LANDSCAPE: {
    x: 0.004, 
    y: 0.004, 
  },
};

const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();

const RESPAWN_HEIGHT = -5;
const START_POSITION = new THREE.Vector3(0, 7, -5);

export const Player = () => {
  const playerRef = useRef();
  const touchRef = useRef({
    cameraTouch: null,
    previousCameraTouch: null,
  });
  const { forward, backward, left, right, jump } = usePersonControls();
  const [canJump, setCanJump] = useState(true);
  const [isAnimating, setAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|Kindle|Silk|Mobile|Tablet|Touch/i.test(
      navigator.userAgent
    )
  );
  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth
  );
  const { camera } = useThree();

  const rapier = useRapier();

  const socketRef = useRef();
  const { 
    roomCode, setRoomCode,
    socketId, setSocketId,
    otherPlayers, setOtherPlayers
  } = useMultiplayerStore();
  const [showRoomUI, setShowRoomUI] = useState(true);
  const [inputRoomCode, setInputRoomCode] = useState('');

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener("resize", handleOrientationChange);
    handleOrientationChange();

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const joystickZone = document.createElement("div");
    joystickZone.id = "joystickZone";
    joystickZone.style.position = "absolute";
    joystickZone.style.bottom = "15vh"; 
    joystickZone.style.left = "13vw"; 
    joystickZone.style.width = "150px";
    joystickZone.style.height = "150px";
    joystickZone.style.zIndex = "3"; 
    joystickZone.style.pointerEvents = "all"; 
    document.body.appendChild(joystickZone);

    const JOYSTICK_SIZE = 130; 
    const PORTRAIT_MARGIN = {
      bottom: 70, 
      left: 80,
    };
    const LANDSCAPE_MARGIN = {
      bottom: 80, 
      left: 120, 
    };

    const calculatePosition = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const isLandscape = viewportWidth > viewportHeight;

      const margins = isLandscape ? LANDSCAPE_MARGIN : PORTRAIT_MARGIN;


      const bottom = isLandscape
        ? Math.min(margins.bottom, viewportHeight * 0.45) 
        : Math.min(margins.bottom, viewportHeight * 0.01); 

      const left = isLandscape
        ? Math.min(margins.left, viewportWidth * 0.08) 
        : Math.min(margins.left, viewportWidth * 0.12); 

      return {
        bottom: `${bottom}px`,
        left: `${left}px`,
      };
    };

    const manager = nipplejs.create({
      zone: joystickZone,
      size: JOYSTICK_SIZE,
      mode: "static",
      position: calculatePosition(),
      color: "black",
      dynamicPage: true,
    });

    const handleMove = (evt, data) => {
      if (!data) return;

      const { angle, distance } = data;
      const radian = angle.radian; 
      const speed = (distance / 100) * MOVE_SPEED;

      direction.set(Math.cos(radian) * speed, 0, -Math.sin(radian) * speed * 2);
    };

    const handleEnd = () => {
      direction.set(0, 0, 0);
    };

    manager.on("move", handleMove);
    manager.on("end", handleEnd);

    return () => {
      manager.destroy();
      document.body.removeChild(joystickZone);
    };
  }, [isMobile]);

  const initialTourComplete = useRef(false);
  const { 
    isModalOpen, isCartOpen, isWishlistOpen, crosshairVisible ,
    isInfoModalOpen , isDiscountModalOpen , isSettingsModalOpen , isTermsModalOpen , isContactModalOpen , isProductSearcherOpen,
  } = useComponentStore();

  const { isTouchEnabled, enableTouch} = useTouchStore();

  useEffect(() => {
    if (!playerRef.current || initialTourComplete.current) return;
  
    const startPosition = new THREE.Vector3(-3, 55, 80);
    playerRef.current.setTranslation(startPosition);
    camera.position.copy(startPosition);
  
    const timeline = gsap.timeline({
      onComplete: () => {
        initialTourComplete.current = true;
        enableTouch();
  
        playerRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        playerRef.current.setAngvel({ x: 0, y: 0, z: 0 });
      },
    });
  
    timeline.to(camera.position, {
      duration: 3,
      x: START_POSITION.x,
      y: START_POSITION.y,
      z: START_POSITION.z,
      ease: "power2.inOut",
    });
  
    const updatePhysicsBody = () => {
      if (!playerRef.current || initialTourComplete.current) return;
      
      playerRef.current.wakeUp();
      playerRef.current.setTranslation(camera.position);
      playerRef.current.setLinvel({ x: 0, y: 0, z: 0 });
    };
  
    const animationFrameId = setInterval(updatePhysicsBody, 1000 / 60);
  
    return () => {
      timeline.kill();
      clearInterval(animationFrameId);
    };
  }, [camera]);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if(!isTouchEnabled) return; 
      if(isModalOpen || isCartOpen || isWishlistOpen || isInfoModalOpen || isDiscountModalOpen || isSettingsModalOpen || isTermsModalOpen || isContactModalOpen || isProductSearcherOpen || !crosshairVisible) return; 

      if (e.target.closest("#joystickZone")) return;

      const touches = Array.from(e.touches);
      const rightmostTouch = touches.reduce((rightmost, touch) => {
        return !rightmost || touch.clientX > rightmost.clientX
          ? touch
          : rightmost;
      }, null);

      if (rightmostTouch) {
        touchRef.current.cameraTouch = rightmostTouch.identifier;
        touchRef.current.previousCameraTouch = {
          x: rightmostTouch.clientX,
          y: rightmostTouch.clientY,
        };
      }
    };

    const handleTouchMove = (e) => {
      if(!isTouchEnabled) return; 
      if(isModalOpen || isCartOpen || isWishlistOpen || isInfoModalOpen || isDiscountModalOpen || isSettingsModalOpen || isTermsModalOpen || isContactModalOpen || isProductSearcherOpen || !crosshairVisible) return; 

      const touch = Array.from(e.touches).find(
        (t) => t.identifier === touchRef.current.cameraTouch
      );

      if (!touch) return;

      const deltaX = touch.clientX - touchRef.current.previousCameraTouch.x;
      const deltaY = touch.clientY - touchRef.current.previousCameraTouch.y;

      const sensitivity = TOUCH_SENSITIVITY.PORTRAIT;

      camera.rotation.order = "YXZ";
      camera.rotation.y -= deltaX * sensitivity.x;
      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x - deltaY * sensitivity.y)
      );

      touchRef.current.previousCameraTouch = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const handleTouchEnd = (e) => {
      if(!isTouchEnabled) return; 
      if(isModalOpen || isCartOpen || isWishlistOpen || isInfoModalOpen || isDiscountModalOpen || isSettingsModalOpen || isTermsModalOpen || isContactModalOpen|| isProductSearcherOpen || !crosshairVisible) return; 

      const remainingTouches = Array.from(e.touches);
      if (
        !remainingTouches.some(
          (t) => t.identifier === touchRef.current.cameraTouch
        )
      ) {
        touchRef.current.cameraTouch = null;
        touchRef.current.previousCameraTouch = null;
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [camera, isPortrait, isTouchEnabled, isModalOpen, isCartOpen, isWishlistOpen, isInfoModalOpen,isDiscountModalOpen,isSettingsModalOpen,isTermsModalOpen,isContactModalOpen,crosshairVisible,isProductSearcherOpen]);

  const combinedInput = new THREE.Vector3();
  const movementDirection = new THREE.Vector3();

  useEffect(() => {
    // Initialize Socket.IO connection with configuration
    socketRef.current = io('http://localhost:3001/update', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to update namespace with ID:', socketRef.current.id);
      setSocketId(socketRef.current.id);
      // Request initial player data
      socketRef.current.emit('setID');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from update namespace. Reason:', reason);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to update namespace after', attemptNumber, 'attempts');
    });

    socketRef.current.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketRef.current.on('generateCode', (newRoomCode) => {
      console.log('=== ROOM CODE GENERATED ===');
      console.log('Room Code:', newRoomCode);
      console.log('===========================');
      setRoomCode(newRoomCode);
      setShowRoomUI(false);
    });

    socketRef.current.on('invalidRoomCode', (message) => {
      console.log('Invalid Room Code:', message);
      alert('Invalid room code. Please try again.');
    });

    socketRef.current.on('playerData', (players) => {
      //console.log('Received player data:', players);
      const playersMap = {};
      players.forEach((player) => {
        if (player.id !== socketRef.current.id) {
          playersMap[player.id] = {
            id: player.id,
            name: player.name,
            position: {
              x: player.position_x,
              y: player.position_y,
              z: player.position_z,
            },
            rotation: {
              x: player.quaternion_x,
              y: player.quaternion_y,
              z: player.quaternion_z,
              w: player.quaternion_w,
            },
          };
        }
      });
      setOtherPlayers(playersMap);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleCreateRoom = () => {
    if (socketRef.current) {
      console.log('Creating new room...');
      socketRef.current.emit('createRoom');
    } else {
      console.error('Socket not connected');
    }
  };

  const handleJoinRoom = () => {
    if (socketRef.current && inputRoomCode.trim()) {
      console.log('Joining room:', inputRoomCode.trim());
      socketRef.current.emit('joinRoom', inputRoomCode.trim());
    }
  };

  useFrame((state) => {
    if (!playerRef.current || isAnimating) return;

    const { y: playerY } = playerRef.current.translation();
    if (playerY < RESPAWN_HEIGHT) {
      respawnPlayer();
    }

    if (!isModalOpen && !isInfoModalOpen && !isCartOpen && !isWishlistOpen && !isDiscountModalOpen && !isSettingsModalOpen && !isTermsModalOpen && !isContactModalOpen && !isProductSearcherOpen && crosshairVisible) {
      const velocity = playerRef.current.linvel();

      frontVector.set(0, 0, backward - forward);
      sideVector.set(right - left, 0, 0);

      combinedInput
        .copy(frontVector)
        .add(sideVector)
        .add(direction)
        .normalize();

      movementDirection
        .copy(combinedInput)
        .applyQuaternion(state.camera.quaternion)
        .normalize()
        .multiplyScalar(MOVE_SPEED);

      playerRef.current.wakeUp();
      playerRef.current.setLinvel({
        x: movementDirection.x,
        y: velocity.y,
        z: movementDirection.z,
      });

      // Emit position update
      if (socketRef.current) {
        const position = playerRef.current.translation();
        const quaternion = state.camera.quaternion;
        socketRef.current.emit('updatePlayer', {
          position: {
            x: position.x,
            y: position.y,
            z: position.z,
          },
          quaternion: [
            quaternion.x,
            quaternion.y,
            quaternion.z,
            quaternion.w,
          ],
        });
      }

      if (jump && canJump) {
        doJump();
        setCanJump(false);
        setTimeout(() => setCanJump(true), 500);
      }
    }

    const { x, y, z } = playerRef.current.translation();
    const lerpFactor = 0.05;
    state.camera.position.lerp({ x, y, z }, lerpFactor);
  });

  const doJump = () => {
    playerRef.current.setLinvel({ x: 0, y: 5, z: 0 });
  };


  const respawnPlayer = () => {
    if (!initialTourComplete.current) return;

    playerRef.current.setTranslation(START_POSITION);
    playerRef.current.setLinvel({ x: 0, y: 0, z: 0 });
    playerRef.current.setAngvel({ x: 0, y: 0, z: 0 });
  };

  return (
    <>
      <Html position={camera.rotation}  zIndexRange={[0, 0]}>
        {showRoomUI && (
          <div 
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '8px',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              zIndex: 0,
            }}
          >
            <h2 style={{ fontSize: '0.8em', margin: '0' }}>JOIN OR CREATE</h2>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value)}
                placeholder="Enter room code"
                style={{
                  padding: '4px',
                  marginBottom: '6px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.8em',
                  width: '100%',
                  maxWidth: '180px',
                  fontFamily: 'Poppins, sans-serif',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  onClick={handleJoinRoom}
                  style={{
                    padding: '4px 10px',
                    marginRight: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Join Room
                </button>
                <button
                  onClick={handleCreateRoom}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}
        {roomCode && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '10px 20px',
            borderRadius: '5px',
            color: 'white',
            fontFamily: 'Poppins, sans-serif',
            textAlign: 'center',
            zIndex: 0,
          }}>
            <div style={{ fontSize: '1em', marginBottom: '5px' }}>ROOM CODE</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{roomCode}</div>
          </div>
        )}
      </Html>
      <RigidBody
        colliders={false}
        mass={1}
        ref={playerRef}
        lockRotations
        canSleep={false}
      >
        <ProductGSAPUtil setAnimating={setAnimating} playerRef={playerRef} />
        <CameraController setAnimating={setAnimating} playerRef={playerRef} />
        <CapsuleCollider args={[1.2, 1]} />
      </RigidBody>
      {Object.entries(otherPlayers).map(([id, player]) => (
        <OtherPlayer
          key={id}
          id={id}
          name={player.name}
          position={player.position}
          rotation={player.rotation}
        />
      ))}
    </>
  );
};


