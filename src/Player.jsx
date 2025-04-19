import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { usePersonControls } from "@/hooks.js";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import nipplejs from "nipplejs";
import gsap from "gsap";
import {
  useComponentStore,
  useTouchStore,
  useMultiplayerStore,
} from "./stores/ZustandStores";
import { CameraController } from "./CameraController";
import { ProductGSAPUtil } from "./ProductGSAPUtil";
import io from "socket.io-client";

const MOVE_SPEED = 12;

const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();

const RESPAWN_HEIGHT = -5;
const FOV_PADDING = 0.2;
const CAMERA_MIN_DISTANCE = 3;
const CAMERA_MAX_DISTANCE = 10;
const START_POSITION = new THREE.Vector3(0, 7, -5);
const cameraCollisionRaycaster = new THREE.Raycaster();

// Simple player model for third-person view
// In the PlayerModel component
const PlayerModel = ({ isMoving }) => {
  const { scene: model, animations } = useGLTF(
    "/models/asian_female_animated.glb"
  );

  useEffect(() => {
    if (model) {
      // Ensure the model is visible
      model.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
          child.frustumCulled = false; // Prevent disappearing due to frustum culling
        }
      });

      model.scale.set(1.2, 1.2, 1.2);

      // Calculate the bounding box to adjust position
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;

      // Adjust model position to align with collider
      model.position.y = -height / 1.2;
    }
  }, [model]);
  const mixer = useRef();
  const animationState = useRef("idle");
  const idleAction = useRef();
  const runningAction = useRef();

  // Add debounce timer for animation state changes
  const lastStateChangeTime = useRef(0);
  const IDLE_DEBOUNCE_TIME = 1000; // Increased to 1 second

  useEffect(() => {
    if (animations && animations.length) {
      mixer.current = new THREE.AnimationMixer(model);

      // Find and store animations
      const idleAnimation = animations.find((anim) => anim.name === "Idle");
      const runningAnimation = animations.find(
        (anim) => anim.name === "Running"
      );

      if (idleAnimation) {
        idleAction.current = mixer.current.clipAction(idleAnimation);
        idleAction.current.play();
      }
      if (runningAnimation) {
        runningAction.current = mixer.current.clipAction(runningAnimation);
        // Initially just prepare the running animation but don't play it
        runningAction.current.stop();
      }

      // Log available animations for debugging
      console.log(
        "Available animations:",
        animations.map((a) => a.name)
      );
    }

    // Scale and adjust the model
    if (model) {
      model.scale.set(1.2, 1.2, 1.2);

      // Calculate the bounding box to adjust position
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;

      // Adjust model position to align with collider
      model.position.y = -height / 1.2;
    }
  }, [animations, model]);

  // Update animation based on movement state with improved debounce
  useEffect(() => {
    if (!mixer.current || !idleAction.current || !runningAction.current) return;

    const currentTime = Date.now();

    if (isMoving && animationState.current !== "running") {
      // Switch to running immediately
      idleAction.current.fadeOut(0.3);
      runningAction.current.reset().fadeIn(0.3).play();
      animationState.current = "running";
      lastStateChangeTime.current = currentTime;
      console.log("Switching to running animation");
    } else if (!isMoving && animationState.current === "running") {
      // Only switch to idle if we've been stationary for the debounce time
      runningAction.current.fadeOut(0.3);
      idleAction.current.reset().fadeIn(0.3).play();
      animationState.current = "idle";
      lastStateChangeTime.current = currentTime;
      console.log("Switching to idle animation");
    }
  }, [isMoving]);

  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }
  });

  return <primitive object={model} castShadow />;
};

export const Player = () => {
  const playerRef = useRef();
  const playerMovementState = useRef({
    isMoving: false,
    previousPosition: new THREE.Vector3(),
  });
  const orbitControlsRef = useRef();
  const touchRef = useRef({
    cameraTouch: null,
    previousCameraTouch: null,
  });
  const { forward, backward, left, right, jump } = usePersonControls();
  const [canJump, setCanJump] = useState(true);
  const [isAnimating, setAnimating] = useState(false);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
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
    socketId, setSocketId
  } = useMultiplayerStore();
  const [showRoomUI, setShowRoomUI] = useState(true);
  const [inputRoomCode, setInputRoomCode] = useState("");

  // Setup orbit controls
  useEffect(() => {
    if (orbitControlsRef.current) {
      // Configure orbit controls for third person view
      orbitControlsRef.current.minDistance = 3;
      orbitControlsRef.current.maxDistance = 10;
      orbitControlsRef.current.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
      orbitControlsRef.current.minPolarAngle = 0.1; // Prevent going too high
      orbitControlsRef.current.enableDamping = true;
      orbitControlsRef.current.dampingFactor = 0.1;
    }
  }, [orbitControlsRef]);

  // Rest of your useEffect hooks remain largely the same
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

  // Mobile joystick controls
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

    // Modified joystick handler to fix inverted controls
    const handleMove = (evt, data) => {
      if (!data) return;

      const { angle, distance } = data;
      const radian = angle.radian;
      const speed = (distance / 100) * MOVE_SPEED;

      // Fix: Invert the z-axis to match forward/backward movement
      direction.set(
        Math.cos(radian) * speed,
        0,
        -Math.sin(radian) * speed * 2 // Add negative sign back for z-axis
      );
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
    isModalOpen,
    isCartOpen,
    isWishlistOpen,
    crosshairVisible,
    isInfoModalOpen,
    isDiscountModalOpen,
    isSettingsModalOpen,
    isTermsModalOpen,
    isContactModalOpen,
    isProductSearcherOpen,
  } = useComponentStore();

  const { isTouchEnabled, enableTouch } = useTouchStore();

  // Initial camera tour
  useEffect(() => {
    if (!playerRef.current || initialTourComplete.current) return;

    const startPosition = new THREE.Vector3(-3, 5, -5);
    playerRef.current.setTranslation(startPosition);
    // Set initial rotation to face forward (negative Z direction)
    const forwardRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI
    );
    playerRef.current.setRotation(forwardRotation);
    camera.position.copy(
      startPosition.clone().add(new THREE.Vector3(0, 5, 10))
    );

    const timeline = gsap.timeline({
      onComplete: () => {
        initialTourComplete.current = true;
        enableTouch();

        playerRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        playerRef.current.setAngvel({ x: 0, y: 0, z: 0 });
        // Maintain forward rotation after tour
        playerRef.current.setRotation(forwardRotation);
      },
    });

    const updatePhysicsBody = () => {
      if (!playerRef.current || initialTourComplete.current) return;

      playerRef.current.wakeUp();
      playerRef.current.setTranslation(
        new THREE.Vector3(
          camera.position.x,
          camera.position.y - 5, // Adjust for camera height
          camera.position.z - 10 // Adjust for camera distance
        )
      );
      playerRef.current.setLinvel({ x: 0, y: 0, z: 0 });
    };

    const animationFrameId = setInterval(updatePhysicsBody, 1000 / 60);

    return () => {
      timeline.kill();
      clearInterval(animationFrameId);
    };
  }, [camera]);

  // Touch controls - modified for orbit controls
  useEffect(() => {
    // We don't need to handle touch events manually since OrbitControls will handle them
    // This section can be simplified or removed if OrbitControls handles all touch interactions

    // Keep minimal touch handling for mobile UI interactions
    const handleTouchStart = (e) => {
      if (!isTouchEnabled) return;
      if (
        isModalOpen ||
        isCartOpen ||
        isWishlistOpen ||
        isInfoModalOpen ||
        isDiscountModalOpen ||
        isSettingsModalOpen ||
        isTermsModalOpen ||
        isContactModalOpen ||
        isProductSearcherOpen ||
        !crosshairVisible
      )
        return;

      if (e.target.closest("#joystickZone")) return;
    };

    document.addEventListener("touchstart", handleTouchStart);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, [
    isTouchEnabled,
    isModalOpen,
    isCartOpen,
    isWishlistOpen,
    isInfoModalOpen,
    isDiscountModalOpen,
    isSettingsModalOpen,
    isTermsModalOpen,
    isContactModalOpen,
    crosshairVisible,
    isProductSearcherOpen,
  ]);

  // Socket.io setup - simplified to only handle room and wishlist functionality
  useEffect(() => {
    // Initialize Socket.IO connection with configuration
    socketRef.current = io('https://multiplayer-backend-8iex.onrender.com/update', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
      autoConnect: true,
      timeout: 20000,
    });

    // Socket event handlers for room management and wishlist
    socketRef.current.on('connect', () => {
      console.log('Connected to update namespace with ID:', socketRef.current.id);
      setSocketId(socketRef.current.id);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected from update namespace. Reason:", reason);
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log(
        "Reconnected to update namespace after",
        attemptNumber,
        "attempts"
      );
    });

    socketRef.current.on("reconnect_error", (error) => {
      console.error("Reconnection error:", error);
    });

    socketRef.current.on("reconnect_failed", () => {
      console.error("Failed to reconnect to server");
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socketRef.current.on("generateCode", (newRoomCode) => {
      console.log("=== ROOM CODE GENERATED ===");
      console.log("Room Code:", newRoomCode);
      console.log("===========================");
      setRoomCode(newRoomCode);
      setShowRoomUI(false);
    });

    socketRef.current.on("invalidRoomCode", (message) => {
      console.log("Invalid Room Code:", message);
      alert("Invalid room code. Please try again.");
    });

    socketRef.current.on('wishlistUpdated', (wishlist) => {
      console.log('Received updated wishlist:', wishlist);
      // Handle the updated wishlist (you'll need to implement this based on your app's state management)
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleCreateRoom = () => {
    if (socketRef.current) {
      console.log("Creating new room...");
      socketRef.current.emit("createRoom");
    } else {
      console.error("Socket not connected");
    }
  };

  const handleJoinRoom = () => {
    if (socketRef.current && inputRoomCode.trim()) {
      const upperCaseCode = inputRoomCode.trim().toUpperCase();
      console.log("Joining room:", upperCaseCode);
      socketRef.current.emit("joinRoom", upperCaseCode);
    }
  };

  const combinedInput = new THREE.Vector3();
  const movementDirection = new THREE.Vector3();
  const playerRotation = new THREE.Quaternion();
  const dir = new THREE.Vector3();

  // Modified useFrame for third-person movement with improved movement detection
  useFrame((state, delta) => {
    if (!playerRef.current || isAnimating) return;

    const { y: playerY } = playerRef.current.translation();
    if (playerY < RESPAWN_HEIGHT) {
      respawnPlayer();
    }

    // Add camera collision detection
    if (orbitControlsRef.current && playerRef.current) {
      const playerPosition = playerRef.current.translation();
      const targetPosition = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + 1,
        playerPosition.z
      );
      orbitControlsRef.current.target.copy(targetPosition);

      // Calculate direction and set up raycaster
      dir.subVectors(camera.position, targetPosition).normalize();
      cameraCollisionRaycaster.set(targetPosition, dir);

      const collisionObjects = state.scene.children.filter(
        (child) => child.isMesh && !child.userData.isPlayer
      );

      const intersects = cameraCollisionRaycaster.intersectObjects(
        collisionObjects,
        false
      );

      if (intersects.length > 0) {
        const currentCameraDistance = targetPosition.distanceTo(
          camera.position
        );
        if (intersects[0].distance < currentCameraDistance) {
          // Add FOV-based padding to prevent edge clipping
          const paddedPoint = intersects[0].point
            .clone()
            .sub(dir.multiplyScalar(FOV_PADDING * camera.fov));
          camera.position.copy(paddedPoint);
        }
      }
    }

    if (
      !isModalOpen &&
      !isInfoModalOpen &&
      !isCartOpen &&
      !isWishlistOpen &&
      !isDiscountModalOpen &&
      !isSettingsModalOpen &&
      !isTermsModalOpen &&
      !isContactModalOpen &&
      !isProductSearcherOpen &&
      crosshairVisible
    ) {
      const velocity = playerRef.current.linvel();

      // Get current position
      const currentPosition = playerRef.current.translation();
      const currentPos = new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z);

      // Improved movement detection logic
      if (playerMovementState.current.previousPosition.lengthSq() > 0) {
        // Check if any movement input is active
        const hasMovementInput = forward || backward || left || right || 
                            (direction.x !== 0 || direction.z !== 0);
        
        // Calculate velocity magnitude in XZ plane only
        const velocityMagnitude = new THREE.Vector2(velocity.x, velocity.z).length();
        
        // More strict conditions for movement state
        const isMoving = hasMovementInput || velocityMagnitude > 0.5;
        
        // Force idle state when no input and velocity is very low
        if (!hasMovementInput && velocityMagnitude < 0.1) {
          setIsPlayerMoving(false);
        } else if (isMoving !== isPlayerMoving) {
          setIsPlayerMoving(isMoving);
        }
      }

      // Update previous position
      playerMovementState.current.previousPosition.copy(currentPos);

      // Get input direction
      frontVector.set(0, 0, backward - forward);
      sideVector.set(right - left, 0, 0);

      combinedInput
        .copy(frontVector)
        .add(sideVector)
        .add(direction)
        .normalize();

      // Get camera direction for movement
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      // Calculate right vector from camera
      const cameraRight = new THREE.Vector3();
      cameraRight
        .crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection)
        .normalize();

      // Apply movement relative to camera direction
      movementDirection.set(0, 0, 0);
      if (combinedInput.z !== 0) {
        // Fix: Correct the forward/backward movement direction
        movementDirection.addScaledVector(cameraDirection, -combinedInput.z);
      }
      if (combinedInput.x !== 0) {
        // Keep the left/right movement as is since it's working correctly
        movementDirection.addScaledVector(cameraRight, -combinedInput.x);
      }

      // Normalize and scale movement
      if (movementDirection.lengthSq() > 0) {
        movementDirection.normalize().multiplyScalar(MOVE_SPEED);

        // Rotate player model to face movement direction
        const targetRotation = Math.atan2(
          movementDirection.x,
          movementDirection.z
        );
        playerRotation.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          targetRotation
        );
        playerRef.current.setRotation(playerRotation);
      }

      // Apply movement
      playerRef.current.wakeUp();
      playerRef.current.setLinvel({
        x: movementDirection.x,
        y: velocity.y,
        z: movementDirection.z,
      });

      // Fix: Lock rotation to prevent capsule from falling over
      playerRef.current.lockRotations(true);

      if (jump && canJump) {
        doJump();
        setCanJump(false);
        setTimeout(() => setCanJump(true), 500);
      }
    }

    // Update orbit controls target to follow player
    if (orbitControlsRef.current && playerRef.current) {
      const playerPosition = playerRef.current.translation();
      orbitControlsRef.current.target.set(
        playerPosition.x,
        playerPosition.y + 1,
        playerPosition.z
      );
    }
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

  useGLTF.preload("/models/asian_female_animated.glb");

  return (
    <>
      <OrbitControls 
        ref={orbitControlsRef}
        enableDamping={true}
        dampingFactor={0.1}
        maxDistance={CAMERA_MAX_DISTANCE}
        minDistance={CAMERA_MIN_DISTANCE}
        enablePan={false}
      />

      <Html position={camera.rotation} zIndexRange={[0, 0]}>
        {showRoomUI && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: "8px",
              borderRadius: "8px",
              color: "white",
              fontFamily: "Poppins, sans-serif",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              zIndex: 0,
            }}
          >
            <h2 style={{ fontSize: "0.8em", margin: "0" }}>JOIN OR CREATE</h2>
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                style={{
                  padding: "4px",
                  marginBottom: "6px",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "0.8em",
                  width: "100%",
                  maxWidth: "180px",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <button
                  onClick={handleCreateRoom}
                  style={{
                    padding: "4px 10px",
                    marginRight: "6px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "#E2441E",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.8em",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Create Room
                </button>
                <button
                  onClick={handleJoinRoom}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "white",
                    color: "black",
                    cursor: "pointer",
                    fontSize: "0.8em",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        )}
        {roomCode && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: "10px 20px",
              borderRadius: "5px",
              color: "white",
              fontFamily: "Poppins, sans-serif",
              textAlign: "center",
              zIndex: 0,
              cursor: "pointer",
            }}
            onClick={() => {
              navigator.clipboard
                .writeText(roomCode)
                .then(() => {
                  // Optional: Show a brief notification that it was copied
                  const notification = document.createElement("div");
                  notification.textContent = "Copied to clipboard!";
                  notification.style.position = "fixed";
                  notification.style.top = "15%";
                  notification.style.left = "50%";
                  notification.style.transform = "translateX(-50%)";
                  notification.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                  notification.style.padding = "5px 10px";
                  notification.style.borderRadius = "5px";
                  notification.style.color = "white";
                  notification.style.fontFamily = "Poppins, sans-serif";
                  document.body.appendChild(notification);
                  setTimeout(() => {
                    document.body.removeChild(notification);
                  }, 2000);
                })
                .catch((err) => {
                  console.error("Failed to copy room code: ", err);
                });
            }}
          >
            <div style={{ fontSize: "1em", marginBottom: "5px" }}>
              ROOM CODE
            </div>
            <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
              {roomCode}
            </div>
          </div>
        )}
      </Html>

      <RigidBody
        colliders={false}
        mass={1}
        ref={playerRef}
        lockRotations={true}
        canSleep={false}
      >
        <ProductGSAPUtil setAnimating={setAnimating} playerRef={playerRef} />
        <CameraController setAnimating={setAnimating} playerRef={playerRef} />
        <PlayerModel isMoving={isPlayerMoving} />
        <CapsuleCollider args={[1.2, 1]} />
      </RigidBody>
    </>
  );
};
