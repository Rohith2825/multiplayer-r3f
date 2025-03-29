import Product from "@/Types/Product";
import { create } from "zustand";

interface ComponentStore {
  // Crosshair handling
  crosshairVisible: boolean;
  showCrosshair: () => void;
  hideCrosshair: () => void;

  // Product handling
  products: Product[];
  selectedProduct: Product | undefined;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (productId: number) => void;

  // Search Handling 
  searchResult: { x: number; y: number; z: number } | null; 
  initiateSearchGSAP: boolean; 
  setSearchResult: (position: { x: number; y: number; z: number }) => void;
  startSearchGSAP: () => void;
  resetSearchGSAP: () => void;

  // Modal Handling
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Cart Handling
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  // Wishlist Handling
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;

  // Info Handling
  isInfoModalOpen: boolean;
  openInfoModal: () => void;
  closeInfoModal: () => void;

  // Terms Handling
  isTermsModalOpen: boolean;
  openTermsModal: () => void;
  closeTermsModal: () => void;

  // Contact Handling
  isContactModalOpen: boolean;
  openContactModal: () => void;
  closeContactModal: () => void;

  // Settings Handling
  isSettingsModalOpen: boolean;
  isAudioPlaying: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  setAudioPlaying: (play: boolean) => void;

  // Discount Handling
  discountCode: string;
  isDiscountModalOpen: boolean;
  openDiscountModal: () => void;
  closeDiscountModal: () => void;
  setDiscountCode: (code: string) => void;

  // Search Handling
  isProductSearcherOpen: boolean;
  openProductSearcher: () => void;
  closeProductSearcher: () => void;
}

const useComponentStore = create<ComponentStore>((set) => ({
  // Crosshair
  crosshairVisible: true,
  showCrosshair: () => set({ crosshairVisible: true }),
  hideCrosshair: () => set({ crosshairVisible: false }),

  // Product Handling
  products: [],
  selectedProduct: undefined,
  setProducts: (products: Product[]) => set({ products }),
  setSelectedProduct: (productId: number) =>
    set((state: { products: Product[] }) => {
      const finalProduct = state.products.find(
        (product: Product) => product.id === productId
      );
      return { ...state, selectedProduct: finalProduct };
    }),

  // Search Handling 
  searchResult: null,
  initiateSearchGSAP: false,
  setSearchResult: (position: { x: number; y: number; z: number }) =>
    set({ searchResult: position }),
  startSearchGSAP: () => set({ initiateSearchGSAP: true }),
  resetSearchGSAP: () =>
    set({
      searchResult: null,
      initiateSearchGSAP: false,
    }),

  // Modal Handling
  isModalOpen: false,
  openModal: () => {
    set({ crosshairVisible: false });
    set({ isModalOpen: true });
  },
  closeModal: () => {
    set({ crosshairVisible: true });
    set({ isModalOpen: false });
  },

  // Cart Handling
  isCartOpen: false,
  openCart: () => {
    set({ crosshairVisible: false });
    set({ isCartOpen: true });
  },
  closeCart: () => {
    set({ crosshairVisible: true });
    set({ isCartOpen: false });
  },

  // Wishlist Handling
  isWishlistOpen: false,
  openWishlist: () => {
    set({ crosshairVisible: false });
    set({ isWishlistOpen: true });
  },
  closeWishlist: () => {
    set({ crosshairVisible: true });
    set({ isWishlistOpen: false });
  },

  // Info Handling
  isInfoModalOpen: false,
  openInfoModal: () => {
    set({ crosshairVisible: false });
    set({ isInfoModalOpen: true });
  },
  closeInfoModal: () => {
    set({ crosshairVisible: false });
    set({ isInfoModalOpen: false });
  },

  // Terms Handling
  isTermsModalOpen: false,
  openTermsModal: () => {
    set({ crosshairVisible: false });
    set({ isTermsModalOpen: true });
  },
  closeTermsModal: () => {
    set({ crosshairVisible: false });
    set({ isTermsModalOpen: false });
  },

  // Contact Handling
  isContactModalOpen: false,
  openContactModal: () => {
    set({ crosshairVisible: false });
    set({ isContactModalOpen: true });
  },
  closeContactModal: () => {
    set({ crosshairVisible: false });
    set({ isContactModalOpen: false });
  },

  // Settings Handling
  isSettingsModalOpen: false,
  isAudioPlaying: false,
  openSettingsModal: () => {
    set({ crosshairVisible: false });
    set({ isSettingsModalOpen: true });
  },
  closeSettingsModal: () => {
    set({ crosshairVisible: true });
    set({ isSettingsModalOpen: false });
  },
  setAudioPlaying: (play: boolean) => set({ isAudioPlaying: play }),

  // Discount Handling
  discountCode: "",
  isDiscountModalOpen: false,
  openDiscountModal: () => {
    set({ crosshairVisible: false });
    set({ isDiscountModalOpen: true });
  },
  closeDiscountModal: () => {
    set({ crosshairVisible: true });
    set({ isDiscountModalOpen: false });
  },
  setDiscountCode: (code: string) => set({ discountCode: code }),

  // Search Handling
  isProductSearcherOpen: false,
  openProductSearcher: () => set({ isProductSearcherOpen: true }),
  closeProductSearcher: () => set({ isProductSearcherOpen: false }),
}));

// Pointer lock handling
interface PointerLockStore {
  isPointerLocked: boolean;
  lockPointer: () => void;
  unlockPointer: () => void;
}

const usePointerLockStore = create<PointerLockStore>((set) => ({
  isPointerLocked: false,
  lockPointer: () => set({ isPointerLocked: true }),
  unlockPointer: () => set({ isPointerLocked: false }),
}));

// Touch handling
interface TouchStore {
  isTouchEnabled: boolean;
  enableTouch: () => void;
  disableTouch: () => void;
}

const useTouchStore = create<TouchStore>((set) => ({
  isTouchEnabled: false,
  enableTouch: () => set({ isTouchEnabled: true }),
  disableTouch: () => set({ isTouchEnabled: false }),
}));

// Driver handling
interface DriverStore {
  driverActive: boolean;
  activateDriver: () => void;
  deactivateDriver: () => void;
}

const useDriverStore = create<DriverStore>((set) => ({
  driverActive: false,
  activateDriver: () => set({ driverActive: true }),
  deactivateDriver: () => set({ driverActive: false }),
}));

// Tour handling
interface TourStore {
  tourComplete: boolean;
  setTourComplete: (value: boolean) => void;
}

const useTourStore = create<TourStore>((set) => ({
  tourComplete: false,
  setTourComplete: (value) => set({ tourComplete: value }),
}));

interface MultiplayerStore {
  roomCode: string;
  socketId: string | null;
  playerPosition: { x: number; y: number; z: number };
  otherPlayers: Record<string, any>; // Adjust type as needed
  setRoomCode: (code: string) => void; // Specify type for code
  setSocketId: (id: string | null) => void; // Specify type for id
  setPlayerPosition: (position: { x: number; y: number; z: number }) => void; // Specify type for position
  setOtherPlayers: (players: Record<string, any>) => void; // Specify type for players
  updateOtherPlayers: (players: Record<string, any>) => void; // Specify type for players
}

const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  roomCode: '',
  socketId: null,
  playerPosition: { x: 0, y: 0, z: 0 },
  otherPlayers: {},
  setRoomCode: (code: string) => set({ roomCode: code }),
  setSocketId: (id: string | null) => set({ socketId: id }),
  setPlayerPosition: (position: { x: number; y: number; z: number }) => set({ playerPosition: position }),
  setOtherPlayers: (players: Record<string, any>) => set({ otherPlayers: players }),
  updateOtherPlayers: (players: Record<string, any>) => set((state) => ({ 
    otherPlayers: { ...state.otherPlayers, ...players } 
  })),
}));

export {
  useComponentStore,
  usePointerLockStore,
  useTouchStore,
  useDriverStore,
  useTourStore,
  useMultiplayerStore,
};
