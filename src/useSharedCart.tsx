// useSharedCart.tsx
import { useState, useEffect } from 'react';
import { useCart } from '@shopify/hydrogen-react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001/update'); // Replace with your socket server URL
socket.on('connect', () => {
  console.log('Socket connected with id:', socket.id);
});

export function useSharedCart(roomCode: string) {
  // Get Hydrogen cart data
  const { lines, linesUpdate, checkoutUrl, linesRemove } = useCart();
  // Maintain our own shared cart state (initially set to Hydrogen cart lines)
  const [sharedCart, setSharedCart] = useState<any[]>(lines || []);

  // Whenever Hydrogen's cart lines change, update our shared cart
  useEffect(() => {
    setSharedCart(lines || []);
  }, [lines]);

  // Join the room when roomCode is available
  useEffect(() => {
    if (roomCode) {
      console.log('Joining room for cart:', roomCode);
      socket.emit('joinRoom', roomCode);
    }
  }, [roomCode]);

  // Emit shared cart updates to the server whenever our cart state changes
  useEffect(() => {
    if (roomCode) {
      console.log('Emitting cart update:', sharedCart);
      socket.emit('updateCart', sharedCart);
    } else {
      console.log('Room code not available. Cart update not emitted.');
    }
  }, [sharedCart, roomCode]);

  // Listen for cart updates from the server (only once)
  useEffect(() => {
    const handleCartUpdated = (updatedCart: any[]) => {
      console.log('Received cart update:', updatedCart);
      setSharedCart(updatedCart);
    };

    socket.on('cartUpdated', handleCartUpdated);
    return () => {
      socket.off('cartUpdated', handleCartUpdated);
    };
  }, []);

  // Optional helper functions to update the cart:
  const addItemsToCart = (newItems: any[]) => {
    // Merge new items with existing sharedCart; adjust merge logic as needed
    const updatedCart = [...sharedCart];
    newItems.forEach((newItem) => {
      // Check if the item already exists (by id); if not, add it
      if (!updatedCart.find((item) => item.id === newItem.id)) {
        updatedCart.push(newItem);
      }
    });
    setSharedCart(updatedCart);
    socket.emit('updateCart', updatedCart);
  };

  const removeItemsFromCart = (itemIds: string[]) => {
    const updatedCart = sharedCart.filter((item) => !itemIds.includes(item.id));
    setSharedCart(updatedCart);
    socket.emit('updateCart', updatedCart);
  };

  const clearCart = () => {
    setSharedCart([]);
    socket.emit('updateCart', []);
  };

  return { 
    sharedCart, 
    addItemsToCart, 
    removeItemsFromCart, 
    clearCart, 
    checkoutUrl, 
    linesUpdate, 
    linesRemove 
  };
}