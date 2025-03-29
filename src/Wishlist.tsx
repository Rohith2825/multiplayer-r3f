import { useRef, useEffect } from 'react';
import {
  Card,
  Box,
  Typography,
  Button
} from '@mui/material';
import useWishlist from './WishlistHook';
import Swal from 'sweetalert2';
import styles from '@/UI/UI.module.scss';
import { useComponentStore, useMultiplayerStore } from '@/stores/ZustandStores';

const Wishlist = () => {
  const { roomCode } = useMultiplayerStore();
  const { wishlist, removeItemsFromWishlist, clearWishlist } = useWishlist(roomCode);
  const { closeWishlist, products,openModal,setSelectedProduct } = useComponentStore();

  const wishlistRef = useRef<HTMLDivElement>(null);
  const onClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    const wishlistElement = wishlistRef.current;
    if (wishlistElement && !wishlistElement.contains(event.target as Node)) {
      closeWishlist();
    }
  };
  
  useEffect(() => {
    const scrollY = window.scrollY;
    const joystickZone = document.getElementById("joystickZone");

    if (joystickZone) {
      joystickZone.style.display = "none";
    }

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      if (joystickZone) {
        joystickZone.style.display = "block";
      }

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const deleteWishlist = () => {
    if (wishlist.length > 0) { 
      Swal.fire({
        title: `Clear your Wishlist?`,
        text: "This action is permanent. You cannot recover the wishlist items once deleted.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Clear Wishlist",
        cancelButtonText: "Cancel",
        confirmButtonColor: "rgb(234, 34, 34)",
        cancelButtonColor: "rgb(57, 177, 57)",
        customClass: {
          popup: styles.swalPopup,
          title: styles.swalTitle,
          confirmButton: styles.swalButton,
          cancelButton: styles.swalButton,
          actions: styles.swalActions
        }
      }).then((result) => {
        if (result.isConfirmed) {
          clearWishlist();
        }
      });
    }
  }
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointerEvents: "auto",
      }}
      onClick={onClickOutside}
    >
      <Card
        ref={wishlistRef}
        sx={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", 
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", 
          width: { xs: "95vw", md: "60vw" }, height: { xs: "75vh", sm: "80vh", md: "75vh" }, 
          backgroundColor: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(10px)", boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)", 
          borderRadius: { xs: "10px", md: "25px" }, border: "1px solid rgba(255, 255, 255, 0.2)", 
          overflow: "none"
        }}
        className="Wishlist"
      >
        <Typography
          sx={{
            minHeight: "15%",
            fontSize: 36, fontFamily: "'Poppins', sans-serif", fontWeight: "bolder",
            color: "rgba(255, 255, 255, 1)",
            display: "flex", alignItems: "center"
          }}
          className="WishlistTitle"
        >
          Wishlist
        </Typography>
        <Typography
          sx={{
            position: "fixed",
            top: "5%", right: "5%",
            width: "30px", height: "30px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.05)", color: "rgba(255, 255, 255, .7)",
            alignItems: "center", justifyContent: "center", display: "flex",
            fontSize: "26px", fontWeight: "normal", fontFamily: "'Poppins', sans-serif",
            "&:hover": {
              cursor: "pointer"
            }
          }}
          className="WishlistCloseButton"
          onClick={closeWishlist}
        >
          &times;
        </Typography>
        <Box
          sx={{
            width: { xs: "90%", sm: "90%", md: "85%", lg: "85%", xl: "80%" }, height: "70%",
            padding: "2.5%", gap: "5%",
            display: "flex", flexDirection: "column", alignItems: "center",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 255, 255, 0)",
            overflowY: "scroll", scrollbarWidth: 0, "&::-webkit-scrollbar": { display: "none" }
          }}
          className="WishlistItems"
        >
          {
            wishlist && wishlist.map((productId:number) => {
              const product = products.find((product) => product.id === productId);
              if (!product) return null;

              const deleteItem = () => {
                removeItemsFromWishlist([product.id]);
              };

              return (
                <Box
                  sx={{
                    width: "95%", height: { xs: "25%", sm: "30%", md: "30%" },
                    padding: { xs: "2%", sm: "2%", md: "2%" }, gap: { xs: "5%", sm: "2%" },
                    display: "flex", flexDirection: "row", justifyContent: "space-evenly", alignItems: "center",
                    borderRadius: { xs: "10px", md: "20px" },
                    backgroundColor: "#424147", boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
                    boxSizing: "border-box"
                  }}
                  className="WishlistItem"
                  onClick={() => {
                    setSelectedProduct(product.id);
                    closeWishlist();
                    openModal();
                  }}
                  key={product.id}
                >
                  <Box
                    component="img"
                    src={product.images[0].src}
                    sx={{
                      height: { xs: "90%", md: "75%" }, aspectRatio: "1 / 1",
                      backgroundColor: "rgb(255, 255, 255)",
                      marginLeft: { xs: "3%", sm: "2%" },
                      borderRadius: { xs: "10px", md: "50%" }
                    }}
                    className="WishlistItemImage"
                  />
                  <Box
                    sx={{
                      display: "flex", flexDirection: "row",
                      justifyContent: "space-evenly", alignItems: "center",
                      width: "80%", height: "100%",
                    }}
                    className="WishlistItemDetails"
                  >
                    <Box
                      sx={{
                        height: "100%", width: "70%",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: { xs: "space-evenly", md: "center" },
                      }}
                    >
                      <Typography
                        sx={{
                          width: "100%", maxHeight: "60%",
                          fontSize: { xs: "16px", sm: "20px" },
                          fontFamily: "'Poppins', sans-serif", fontWeight: "normal",
                          color: "rgba(255, 255, 255, 0.83)",
                          overflowY: { xs: "hidden", sm: "hidden", md: "scroll" },
                          scrollbarWidth: 0,
                          "&::-webkit-scrollbar": {
                            display: "none"
                          },
                          textAlign: "left",
                          "&:hover": {
                            cursor: "pointer",
                            textDecoration: "underline"
                          },
                        }}
                        className="WishlistItemTitle"
                      >
                        {product.title}
                      </Typography>
                      <Typography
                        sx={{
                          width: "100%",
                          fontSize: { xs: "12px", sm: "16px" },
                          fontFamily: "'Poppins', sans-serif", fontWeight: "normal",
                          color: "rgba(202, 202, 202, 0.78)",
                          overflow: "hidden",
                          textAlign: "left"
                        }}
                        className="WishlistItemPrice"
                      >
                        INR {product.variants[0].price}
                      </Typography>
                    </Box>
                    <Box
                      component="img"
                      src="icons/dustbin.svg"
                      sx={{
                        height: { xs: "18px", md: "25px" },
                        borderRadius: "3px",
                        "&:hover": {
                          cursor: "pointer",
                          background: "rgba(255, 255, 255, 0.1)"
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteItem();}}
                      className="WishlistItemDustbinIcon"
                    ></Box>
                  </Box>
                </Box>
              );
            })
          }
        </Box>
        <Box
          sx={{
            width: "90%", height: { xs: "15%", sm: "15%", md: "20%" },
            display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center",
            gap: { xs: "2%", md: "5%" }
          }}
          className="WishlistButtons"
        >
          <Button
            sx={{
              width: { xs: "60%", sm: "60%", md: "40%"}, height: "50%",
              padding: "20px",
              fontSize: { xs: 16, sm: 20, md: 22, lg: 24, xl: 24 }, fontFamily: "'Poppins', sans-serif",
              color: "rgb(255, 255, 255)", backgroundColor: "rgba(255, 255, 255, 0.15)",
              textTransform: "none",
              borderRadius: { xs: "10px", md: "100px" },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                transitionDuration: "0.15s"
              }
            }}
            onClick={deleteWishlist}
          >
            Clear Wishlist
          </Button>

        </Box>
      </Card>
    </div>
  );
};

export default Wishlist;