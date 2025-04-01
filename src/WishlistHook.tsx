import { useState, useEffect } from "react";
import io from "socket.io-client"; // Import socket.io client

const socket = io("https://multiplayer-backend-8iex.onrender.com/update"); // Replace with your socket server URL
socket.on("connect", () => {
  console.log("Socket connected with id:", socket.id);
});

function useWishlist(roomCode: string) {
  // Join the room when roomCode becomes available
  useEffect(() => {
    if (roomCode) {
      console.log("Joining room:", roomCode);
      socket.emit("joinRoom", roomCode);
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
      console.log("Received wishlist update:", updatedWishlist);
      setWishlist(updatedWishlist);
    };

    socket.on("wishlistUpdated", handleWishlistUpdated);

    return () => {
      socket.off("wishlistUpdated", handleWishlistUpdated);
    };
  }, []); // Empty dependency array ensures this effect runs only once

  const addItemsToWishlist = (itemIds: number[]) => {
    setWishlist((prevWishlist) => {
      const newWishlist = [...prevWishlist];
      for (const itemId of itemIds) {
        if (!newWishlist.includes(itemId)) {
          newWishlist.push(itemId);
        } else {
          console.log("Item already exists in wishlist:", itemId);
        }
      }
      socket.emit("updateWishlist", newWishlist);
      return newWishlist;
    });
  };

  const removeItemsFromWishlist = (itemIds: number[]) => {
    setWishlist((prevWishlist) => {
      const newWishlist = prevWishlist.filter((id) => !itemIds.includes(id));
      socket.emit("updateWishlist", newWishlist);
      return newWishlist;
    });
  };

  const clearWishlist = () => {
    setWishlist(() => {
      socket.emit("updateWishlist", []);
      return [];
    });
  };

  return {
    wishlist,
    addItemsToWishlist,
    removeItemsFromWishlist,
    clearWishlist,
  };
}

export default useWishlist;
