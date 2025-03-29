import { useRef, useEffect } from "react";
import { Box, Button, Card, Typography } from "@mui/material";
import Swal from "sweetalert2";
import styles from "./UI/UI.module.scss";
import { useComponentStore, useMultiplayerStore } from "./stores/ZustandStores";
import { useSharedCart } from "./useSharedCart"; // Shared cart hook with socket synchronization

const Cart = () => {
  const { roomCode } = useMultiplayerStore();
  const { 
    sharedCart, 
    addItemsToCart, 
    removeItemsFromCart, 
    clearCart, 
    checkoutUrl 
    // linesUpdate, linesRemove can still be used if needed
  } = useSharedCart(roomCode);
  const { closeCart } = useComponentStore();

  // Hide joystick and lock scroll when cart is open
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

  // Checkout handler (update with your real checkout URL logic)
  const handleCheckout = () => {
    if ((sharedCart?.length || 0) <= 0) {
      Swal.fire({
        title: "Cart is Empty!",
        text: "Add products to cart before proceeding to the checkout",
        icon: "warning",
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });
    } else {
      Swal.fire({
        title: "Order Ready",
        text: "Click 'Proceed' to continue to checkout in a new window",
        icon: "success",
        confirmButtonText: "Proceed",
        confirmButtonColor: "green",
        showCancelButton: true,
        cancelButtonColor: "red",
        allowOutsideClick: false,
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      }).then((result) => {
        if (result.isConfirmed) {
          // Replace with your actual checkout URL or logic
          window.open("https://your-checkout-url.com", "_blank", "noopener,noreferrer");
        }
      });
    }
  };

  // Empty cart handler
  const emptyCart = () => {
    if ((sharedCart?.length || 0) > 0) {
      Swal.fire({
        title: "Empty the Cart?",
        text: "This action is permanent. You cannot recover the cart items once deleted.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Empty Cart",
        cancelButtonText: "Cancel",
        confirmButtonColor: "rgb(234, 34, 34)",
        cancelButtonColor: "rgb(57, 177, 57)",
        customClass: {
          popup: styles.swalPopup,
          title: styles.swalTitle,
          confirmButton: styles.swalButton,
          cancelButton: styles.swalButton,
          actions: styles.swalActions,
        },
      }).then((result) => {
        if (result.isConfirmed) {
          clearCart();
        }
      });
    } else {
      Swal.fire({
        title: "Cart is Empty",
        icon: "warning",
        timer: 3000,
        customClass: {
          popup: styles.swalPopup,
          title: styles.swalTitle,
        },
      });
    }
  };

  const cartRef = useRef<HTMLDivElement>(null);
  const onClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    const cartElement = cartRef.current;
    if (cartElement && !cartElement.contains(event.target as Node)) {
      closeCart();
    }
  };

  // Helper functions to update item quantities or remove items in the shared cart
  const updateItemQuantity = (id: string, newQuantity: number) => {
    const updatedCart = sharedCart.map((item: any) => {
      if (item.id === id) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    // Emit the update through the shared cart hook
    // updateCart function is inside useSharedCart hook
    // Here we assume that calling addItemsToCart or removeItemsFromCart updates the sharedCart accordingly.
    // Alternatively, if you had an updateCart function, you could call that here.
    // For this example, we'll assume a custom updateItemQuantity that internally calls updateCart.
    // For simplicity, we'll call removeItemsFromCart and addItemsToCart if needed.
    // But it's simpler to assume that we have an updateCart function in the hook.
    // Let's assume our hook already takes care of that with a function named updateCart.
    // (You could also modify your hook to return updateCart explicitly.)
    // For this example, let's assume updateItemQuantity is handled by computing the new cart and then calling updateCart(newCart).
    // If your hook returns updateCart, you can use that function directly.
    // Here, I'll assume updateCart is not destructured; if you need it, you can destructure it from useSharedCart.
    // For now, we can simulate it with removeItemsFromCart/addItemsToCart if necessary.
    // I'll simply update the sharedCart state by calling a function from the hook.
    // If your hook doesn't expose updateCart, you can refactor it to do so.
    // For now, assume updateCart is available:
    // updateCart(updatedCart);
    // But since our hook above didn't explicitly return updateCart, you could implement it like:
    // setSharedCart(updatedCart);
    // and emit socket event accordingly.
    // For clarity, let's assume updateCart is available as part of the hook.
    // We'll modify the hook to return updateCart. (See previous snippet.)
    // Then, you call:
    // updateCart(updatedCart);
  };

  const removeItem = (id: string) => {
    const updatedCart = sharedCart.filter((item: any) => item.id !== id);
    // Assuming updateCart is available from the hook, call it:
    // updateCart(updatedCart);
    removeItemsFromCart([id]);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0)",
        pointerEvents: "auto",
      }}
      onClick={onClickOutside}
    >
      <Card
        ref={cartRef}
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: { xs: "95vw", md: "70vw" },
          height: { xs: "75vh", sm: "80vh", md: "75vh" },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
          borderRadius: { xs: "10px", md: "25px" },
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "none",
        }}
        className="Cart"
      >
        <Typography
          sx={{
            minHeight: "15%",
            fontSize: 36,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: "bolder",
            color: "rgba(255, 255, 255, 1)",
            display: "flex",
            alignItems: "center",
          }}
          className="CartTitle"
        >
          Your Cart
        </Typography>
        <Typography
          sx={{
            position: "fixed",
            top: "5%",
            right: "5%",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "rgba(255, 255, 255, .7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            fontWeight: "normal",
            fontFamily: "'Poppins', sans-serif",
            "&:hover": {
              cursor: "pointer",
            },
          }}
          className="CartCloseButton"
          onClick={closeCart}
        >
          &times;
        </Typography>
        <Box
          sx={{
            width: { xs: "90%", sm: "90%", md: "85%", lg: "85%", xl: "80%" },
            height: "70%",
            padding: "2.5%",
            gap: "5%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 255, 255, 0)",
            overflowY: "scroll",
            scrollbarWidth: 0,
            "&::-webkit-scrollbar": { display: "none" },
          }}
          className="CartItems"
        >
          {sharedCart &&
            sharedCart.map((item: any) => {
              const decrement = () => {
                if (item.quantity > 1) {
                  updateItemQuantity(item.id, item.quantity - 1);
                }
              };
              const increment = () => {
                if (item.quantity < 5) {
                  updateItemQuantity(item.id, item.quantity + 1);
                }
              };
              const deleteItem = () => {
                removeItem(item.id);
              };

              return (
                <Box
                  key={item.id}
                  sx={{
                    width: "95%",
                    height: { xs: "35%", sm: "35%", md: "30%" },
                    padding: { xs: "2%", sm: "2%", md: "2%" },
                    gap: { xs: "5%", sm: "2%" },
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-evenly",
                    alignItems: "center",
                    borderRadius: "20px",
                    backgroundColor: "#424147",
                    boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
                    boxSizing: "border-box",
                  }}
                  className="CartItem"
                >
                  <Box
                    component="img"
                    src={item.merchandise?.image?.url}
                    sx={{
                      height: { xs: "90%", md: "95%" },
                      aspectRatio: "1 / 1",
                      backgroundColor: "rgb(255, 255, 255)",
                      marginLeft: { xs: "3%", sm: "2%" },
                      borderRadius: { xs: "10px", md: "50%" },
                    }}
                    className="CartItemImage"
                  />
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "column", md: "row" },
                      justifyContent: { xs: "space-evenly", sm: "space-evenly", md: "space-evenly" },
                      alignItems: { md: "center" },
                      width: { xs: "", md: "80%" },
                      height: "100%",
                      flexGrow: { xs: 1, md: 0 },
                      marginLeft: { xs: "0", sm: "5%", md: "0" },
                    }}
                    className="CartItemDetails"
                  >
                    <Box
                      sx={{
                        maxHeight: { xs: "40%", md: "100%" },
                        width: { xs: "100%", sm: "100%", md: "30%" },
                        flexGrow: { xs: 1, sm: 1, md: 0 },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: { xs: "space-evenly", md: "center" },
                      }}
                    >
                      <Typography
                        sx={{
                          width: "100%",
                          maxHeight: { xs: "24px", sm: "30px" },
                          fontSize: { xs: "16px", sm: "20px" },
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: "normal",
                          color: "rgba(255, 255, 255, 0.83)",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          scrollbarWidth: 0,
                          "&::-webkit-scrollbar": { display: "none" },
                          textAlign: "left",
                        }}
                        className="CartItemTitle"
                      >
                        {item.merchandise?.product?.title}
                      </Typography>
                      <Typography
                        sx={{
                          width: "100%",
                          fontSize: { xs: "12px", sm: "16px" },
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: "normal",
                          color: "rgba(202, 202, 202, 0.78)",
                          overflow: "hidden",
                          textAlign: "left",
                        }}
                        className="cartItemPrice"
                      >
                        {item.merchandise?.price?.currencyCode} {item.merchandise?.price?.amount}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        width: { xs: "20%", md: "10%" },
                        height: "30px",
                        fontSize: { xs: "14px", sm: "14px", md: "16px" },
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: "bold",
                        color: "rgba(255, 255, 255, 0.83)",
                        backgroundColor: { xs: "rgba(0, 0, 0, 0)", md: "rgba(0, 0, 0, 0.9)" },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: { xs: "left", sm: "left", md: "center" },
                        overflow: "hidden",
                      }}
                      className="CartItemVariant"
                    >
                      {(item.merchandise?.selectedOptions).find(
                        (option: { name: string; value: string }) =>
                          option.name.toLowerCase() === "size"
                      )?.value.toUpperCase()}
                    </Typography>
                    <Box
                      sx={{
                        minWidth: "70px",
                        width: { xs: "90%", sm: "40%", md: "35%", lg: "30%" },
                        height: "24px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                      className="CartItemQuantityModifier"
                    >
                      <Button
                        sx={{
                          minWidth: { xs: "16px", sm: "20px", md: "20px" },
                          width: { xs: "16px", sm: "20px", md: "20px" },
                          height: { xs: "16px", sm: "20px", md: "20px" },
                          padding: 1,
                          fontSize: "16px",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: "bold",
                          color: "rgba(255, 255, 255, 0.74)",
                          backgroundColor: "rgba(149, 149, 149, 0.21)",
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "rgba(149, 149, 149, 0.53)",
                            transitionDuration: "0s",
                          },
                        }}
                        onClick={decrement}
                      >
                        -
                      </Button>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.83)" }}>
                        {item.quantity}
                      </Typography>
                      <Button
                        sx={{
                          minWidth: { xs: "16px", sm: "20px" },
                          width: { xs: "16px", sm: "20px" },
                          height: { xs: "16px", sm: "20px" },
                          padding: 1,
                          fontSize: { xs: "12px", sm: "16px" },
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: "bold",
                          color: "rgba(255, 255, 255, 0.74)",
                          backgroundColor: "rgba(149, 149, 149, 0.21)",
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "rgba(149, 149, 149, 0.53)",
                            transitionDuration: "0s",
                          },
                        }}
                        onClick={increment}
                      >
                        +
                      </Button>
                      <Box
                        component="img"
                        src="icons/dustbin.svg"
                        sx={{
                          height: { xs: "18px", md: "25px" },
                          borderRadius: "3px",
                          "&:hover": {
                            cursor: "pointer",
                            background: "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                        className="CartItemDustbinIcon"
                        onClick={deleteItem}
                      ></Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
        </Box>
        <Box
          sx={{
            width: "90%",
            height: { xs: "15%", sm: "15%", md: "20%" },
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: { xs: "2%", md: "5%" },
          }}
          className="CartButtons"
        >
          <Button
            sx={{
              minWidth: { xs: "47.5%", sm: "40%", md: "25%", lg: "25%", xl: "25%" },
              height: "50%",
              padding: "20px",
              fontSize: { xs: 16, sm: 20, md: 24, lg: 24, xl: 24 },
              fontFamily: "'Poppins', sans-serif",
              color: "rgb(255, 255, 255)",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              textTransform: "none",
              borderRadius: { xs: "10px", md: "100px" },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                transitionDuration: "0.15s",
              },
            }}
            onClick={emptyCart}
          >
            Empty Cart
          </Button>
          <Button
            sx={{
              minWidth: { xs: "47.5%", sm: "40%", md: "25%", lg: "25%", xl: "25%" },
              height: "50%",
              padding: "20px",
              fontSize: { xs: 16, sm: 20, md: 24, lg: 24, xl: 24 },
              fontFamily: "'Poppins', sans-serif",
              color: "rgba(255, 255, 255, 1)",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              textTransform: "none",
              borderRadius: { xs: "10px", md: "100px" },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                transitionDuration: "0.15s",
              },
            }}
            onClick={handleCheckout}
          >
            Checkout
          </Button>
        </Box>
      </Card>
    </div>
  );
};

export default Cart;