import { useState, useEffect } from 'react';
import io from 'socket.io-client'; // Import socket.io client

const socket = io('http://localhost:3001/update'); // Replace with your socket server URL
socket.on('connect', () => {
  console.log('Socket connected with id:', socket.id);
});

function useWishlist(roomCode: string) {
  // Join the room when roomCode becomes available
  useEffect(() => {
    if (roomCode) {
      console.log('Joining room:', roomCode);
      socket.emit('joinRoom', roomCode);
    }
  }, [roomCode]);

  const [wishlist, setWishlist] = useState<number[]>([]);

  // Emit wishlist updates whenever the wishlist or roomCode changes
  // useEffect(() => {
  //   if (roomCode) {
  //     console.log('Emitting wishlist update:', wishlist);
  //     socket.emit('updateWishlist', wishlist);
  //   } else {
  //     console.log('Room code not available. Wishlist update not emitted.');
  //   }
  // }, [wishlist, roomCode]);

  // Listen for wishlist updates from the server only once
  useEffect(() => {
    const handleWishlistUpdated = (updatedWishlist: number[]) => {
      console.log('Received wishlist update:', updatedWishlist);
      setWishlist(updatedWishlist);
    };

    socket.on('wishlistUpdated', handleWishlistUpdated);

    return () => {
      socket.off('wishlistUpdated', handleWishlistUpdated);
    };
  }, []); // Empty dependency array ensures this effect runs only once

  const addItemsToWishlist = (itemIds: number[]) => {
    for (const itemId of itemIds) {
      if (!wishlist.find((wishlistItemId: number) => wishlistItemId === itemId)) {
        const updatedWishlist = [...wishlist, itemId];
        setWishlist(updatedWishlist);
        socket.emit('updateWishlist', updatedWishlist);
      } else {
        console.log('Item already exists in wishlist:', itemId);
      }
    }
  };
  
  const removeItemsFromWishlist = (itemIds: number[]) => {
    console.log('Removing items from wishlist:', itemIds);
    const updatedWishlist = wishlist.filter((wishlistItemId: number) => !itemIds.includes(wishlistItemId));
    setWishlist(updatedWishlist);
    socket.emit('updateWishlist', updatedWishlist);
  };
  
  const clearWishlist = () => {
    console.log('Clearing wishlist');
    setWishlist([]);
    socket.emit('updateWishlist', []);
  };

  return { wishlist, addItemsToWishlist, removeItemsFromWishlist, clearWishlist };
}

export default useWishlist;