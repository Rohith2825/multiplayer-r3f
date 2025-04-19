import * as TWEEN from "@tweenjs/tween.js";
import { PointerLockControls } from "@react-three/drei";
import { Ground } from "@/Ground.jsx";
import { Physics } from "@react-three/rapier";
import { Player } from "@/Player.jsx";
import { useFrame } from "@react-three/fiber";
import Television from "./Television";
import BrandPoster from "./BrandPoster";
import Products from "./Products";
import ChestBox from "./Chestbox";
import { Suspense, useState, useEffect } from "react";
import Skybox from "./Skybox";
import {
  useComponentStore,
  usePointerLockStore,
  useDriverStore,
} from "./stores/ZustandStores";
import { useTouchStore } from "./stores/ZustandStores";


const shadowOffset = 50;

export const App = () => {
  const [isMobile, setIsMobile] = useState(false);
  const {
    crosshairVisible,
    isModalOpen,
    isWishlistOpen,
    isCartOpen,
    isInfoModalOpen,
    isDiscountModalOpen,
    isSettingsModalOpen,
    isTermsModalOpen,
    isContactModalOpen,
    isProductSearcherOpen,
  } = useComponentStore();
  const { lockPointer, unlockPointer } = usePointerLockStore();
  const { driverActive } = useDriverStore();
  const { isTouchEnabled } = useTouchStore();


  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useFrame(() => {
    TWEEN.update();
  });


  const pointerLockControlsLockHandler = () => {
    if (
      isTouchEnabled &&
      crosshairVisible &&
      !driverActive &&
      !isModalOpen &&
      !isCartOpen &&
      !isWishlistOpen &&
      !isInfoModalOpen &&
      !isDiscountModalOpen &&
      !isSettingsModalOpen &&
      !isTermsModalOpen &&
      !isContactModalOpen &&
      !isProductSearcherOpen
    ) {
      lockPointer();
    } else {
      document.exitPointerLock?.();
    }
  };

  const pointerLockControlsUnlockHandler = () => {
    unlockPointer();
  };

  return (
    <>
      {!isMobile && (
        <PointerLockControls
          onLock={pointerLockControlsLockHandler}
          onUnlock={pointerLockControlsUnlockHandler}
        />
      )}
      <Skybox />
      <ambientLight intensity={3.5} />
      <directionalLight
        castShadow
        intensity={1.5}
        shadow-mapSize={4096}
        shadow-camera-top={shadowOffset}
        shadow-camera-bottom={-shadowOffset}
        shadow-camera-left={shadowOffset}
        shadow-camera-right={-shadowOffset}
        position={[100, 100, 0]}
      />

      <Physics gravity={[0, -20, 0]}>
        <Ground />
        <Suspense fallback={null}>
          <Player />
        </Suspense>
        <Products />
        <ChestBox />
        <Television
          videoPath="/media/backhome.mp4"
          scale={[0.9, 0.9, 0.9]}
          position={[-4.5, 11, -91]}
          rotation={[0, -82.79, 0]}
        />

        <BrandPoster
          imageUrl="https://th.bing.com/th/id/OIP.SNik-SOwvsExn4HNF47l2gHaEK?rs=1&pid=ImgDetMain"
          width={192 * 4}
          height={108 * 4}
          position={[-2.2, 3.2, -55.35]}
          rotation={[0, 90, 1]}
        />
      </Physics>
    </>
  );
};

export default App;
