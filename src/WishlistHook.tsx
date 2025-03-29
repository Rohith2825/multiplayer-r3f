import { useState, useEffect } from 'react';
import io from 'socket.io-client'; // Import socket.io client

const socket = io('http://localhost:3001/'); // Replace with your socket server URL

function useWishlist() {
  const [wishlist, setWishlist] = useState(() => {
    const itemString = localStorage.getItem("wishlist");
    try {
      return itemString ? JSON.parse(itemString) : []; 
    } catch (error) {
      console.error("Error parsing wishlist from localStorage:", error);
      return []; 
    }
  });

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
    socket.emit('updateWishlist', wishlist); // Emit wishlist update to server
  }, [wishlist]);

  useEffect(() => {
    socket.on('wishlistUpdated', (newWishlist) => {
      setWishlist(newWishlist); // Update wishlist when received from server
    });

    return () => {
      socket.off('wishlistUpdated'); // Clean up listener on unmount
    };
  }, []);

  const addItemsToWishlist = (itemIds: (number)[]) => {
    for (const itemId of itemIds) {
      if (!wishlist.find((wishlistItemId: number) => wishlistItemId === itemId)) {
        const updatedWishlist = [...wishlist, itemId];
        setWishlist(updatedWishlist);
        socket.emit('updateWishlist', updatedWishlist); // Emit updated wishlist
      }
    }
  };

  const removeItemsFromWishlist = (itemIds: (number)[]) => {
    const updatedWishlist = wishlist.filter((wishlistItemId: number) => !itemIds.includes(wishlistItemId));
    setWishlist(updatedWishlist);
    socket.emit('updateWishlist', updatedWishlist); // Emit updated wishlist
  };

  const clearWishlist = () => {
    setWishlist([]);
    socket.emit('updateWishlist', []); // Emit empty wishlist
  };

  return { wishlist, addItemsToWishlist, removeItemsFromWishlist, clearWishlist };
}

export default useWishlist;