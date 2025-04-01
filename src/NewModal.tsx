import { Box, Button, Card, Typography, ButtonBase } from "@mui/material";
import { useCart, ModelViewer } from "@shopify/hydrogen-react";
import { useEffect, useRef, useState } from "react";
import { useComponentStore, useMultiplayerStore } from "./stores/ZustandStores";
import Variant from "./Types/Variant";
import DOMPurify from "dompurify";
import useWishlist from "./WishlistHook";
import Swal from "sweetalert2";
import styles from "@/UI/UI.module.scss";

const Modal = () => {
  const client = {
    domain: "htphzk-um.myshopify.com",
    storefrontAccessToken: "446cb8f8327b9074dcc7c158332ca146",
    apiVersion: "2023-10",
  };

  const containerRef = useRef(null);
  const { roomCode } = useMultiplayerStore();
  const modelViewerElement = useRef(null);
  const [arSupported, setArSupported] = useState(false);

  useEffect(() => {
    const observeModelViewer = () => {
      const observer = new MutationObserver(() => {
        const element = containerRef.current?.querySelector("model-viewer");
        if (element) {
          modelViewerElement.current = element; 
          console.log("Found <model-viewer> element:", element);

          if (element.activateAR) {
            setArSupported(true); 
          }
          observer.disconnect(); 
        }
      });

      if (containerRef.current) {
        observer.observe(containerRef.current, { childList: true, subtree: true });
      }

      return () => observer.disconnect();
    };

    observeModelViewer();
  }, []);

  
  const { lines, checkoutUrl, linesAdd } = useCart();
  const { closeModal, selectedProduct } = useComponentStore();


  const [isMobile, setIsMobile] = useState(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|Kindle|Silk|Mobile|Tablet|Touch/i.test(
      navigator.userAgent
    )
  );
  const [isIosChrome, setIsIosChrome] = useState(false);

  const { wishlist, addItemsToWishlist, removeItemsFromWishlist } = useWishlist(roomCode);

  const [selectedVariant, setSelectedVariant] = useState<Variant>();
  useEffect(() => {
    selectedProduct && setSelectedVariant(selectedProduct.variants.find((variant) => variant.availableForSale));
  }, [selectedProduct]);

  const [quantity, setQuantity] = useState<number>(1);
  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant, setQuantity]);


  const handleBuyNow = async () => {
    try {
      
      Swal.fire({
        title: "Starting Checkout",
        text: "Preparing your order...",
        icon: "info",
        showConfirmButton: false,
        allowOutsideClick: false,
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });

      // Step 1: Create Cart
      const createCartResponse = await fetch(
        `https://${client.domain}/api/${client.apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": client.storefrontAccessToken,
          },
          body: JSON.stringify({
            query: `
              mutation cartCreate($input: CartInput!) {
                cartCreate(input: $input) {
                  cart {
                    id
                    checkoutUrl
                  }
                  userErrors {
                    message
                  }
                }
              }
            `,
            variables: {
              input: {
                lines: [
                  {
                    merchandiseId: `gid://shopify/ProductVariant/${selectedVariant?.id}`,
                    quantity: quantity,
                  },
                ],
              },
            },
          }),
        }
      );

      const createCartData = await createCartResponse.json();

      if (createCartData.errors) {
        throw new Error(createCartData.errors[0].message);
      }

      const checkoutUrl = createCartData.data.cartCreate.cart.checkoutUrl;
      const checkoutLink = document.createElement("a");
      checkoutLink.href = checkoutUrl;
      checkoutLink.target = "_blank";
      checkoutLink.rel = "noopener noreferrer";
      checkoutLink.style.display = "none";
      document.body.appendChild(checkoutLink);
  
   
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
         
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          checkoutLink.dispatchEvent(clickEvent);
          
          
          setTimeout(() => {
            document.body.removeChild(checkoutLink);
          }, 100);
        }
      });
  
    } catch(e) {
      console.error('Checkout error:', e);
      Swal.fire({
        title: "Checkout Failed",
        text: "Unable to start checkout. Please try again.",
        icon: "error",
        confirmButtonText: "Okay",
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });
    }
  };


  
  const PHOTOS = "Photos";
  const MODEL = "3D Model";
  const [mediaType, setMediaType] = useState(PHOTOS);

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

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isChrome = /CriOS/.test(userAgent); 
  
    if (isIOS && isChrome) {
      setIsIosChrome(true);
    }
  }, []);
  
  const handleViewInAR = async () => {
  
    if (mediaType !== MODEL) {
      setMediaType(MODEL); 
  

      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const element = containerRef.current?.querySelector("model-viewer");
          if (element) {
            modelViewerElement.current = element; 
            resolve(); 
            observer.disconnect(); 
          }
        });
  
        if (containerRef.current) {
          observer.observe(containerRef.current, { childList: true, subtree: true });
        }
      });
    }
  
    
    if (modelViewerElement.current?.activateAR) {
      modelViewerElement.current.activateAR();
      console.log("AR support exists");
    } else {
      console.error("AR is not supported or activateAR is undefined");
    }
  };
  

    const handleARTryOn = () => {
      if (selectedProduct && selectedProduct.arLensLink) {
   
        const arLink = document.createElement('a');
        arLink.href = selectedProduct.arLensLink;
        arLink.target = '_blank';
        arLink.rel = 'noopener noreferrer';
        arLink.style.display = 'none';
        document.body.appendChild(arLink);
    
       
        Swal.fire({
          title: "Opening AR Try-On",
          text: "Click 'Continue' to open AR experience in a new window",
          icon: "info",
          confirmButtonText: "Continue",
          confirmButtonColor: "green",
          showCancelButton: true,
          cancelButtonColor: "red",
          allowOutsideClick: true,
          customClass: {
            title: styles.swalTitle,
            popup: styles.swalPopup,
          },
        }).then((result) => {
          if (result.isConfirmed) {
            
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            arLink.dispatchEvent(clickEvent);
            
          
            setTimeout(() => {
              document.body.removeChild(arLink);
            }, 100);
          }
        });
      }
    };


  const modalRef = useRef<HTMLDivElement>(null);
  const onClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    const modal = modalRef.current;
    if (modal && !modal.contains(event.target as Node))
      closeModal();
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      Swal.fire({
        title: "Variant Not Found",
        text: "The selected variant does not exist!",
        icon: "error",
        confirmButtonText: "Okay",
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });
      return;
    }

    try {
      await linesAdd([
        {
          merchandiseId: `gid://shopify/ProductVariant/${selectedVariant.id}`,
          quantity: quantity,
        },
      ]);

      Swal.fire({
        title: "Success",
        text: "Product added to cart!",
        icon: "success",
        confirmButtonText: "Okay",
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Cannot add product to cart!",
        icon: "error",
        confirmButtonText: "Okay",
        customClass: {
          title: styles.swalTitle,
          popup: styles.swalPopup,
        },
      });
      console.error(error);
      return;
    }
  };


  const MediaViewer = () => {


    const MediaButtons = () => {
      return (
        <Box
          sx={{
            width: "50%",
            display: "flex", flexDirection: "row", justifyContent: "space-evenly", alignItems: "center",
            backgroundColor: "#424147",
            borderRadius: "100px",
            padding: "5px", gap: "2%",
          }}
          className="MediaButtons"
          id="MediaButtons"
        >
          <Button
            sx={{
              width: "50%",
              backgroundColor: (mediaType === PHOTOS && "#8D8B96") || "rgba(0, 0, 0, 0)",
              borderRadius: "100px",
              color: "white",
              fontSize: { xs: "12px", md: "16px" }, fontFamily: "'Poppins', sans-serif",
              textTransform: "none",
              "&:hover": (mediaType !== PHOTOS && {
                backgroundColor: "rgba(255, 255, 255, 0.1)"
              }) || {},
              whiteSpace: "nowrap",
              overflow: "hidden"
            }}
            onClick={() => setMediaType(PHOTOS)}
            className="MediaViewerPhotosButton"
          >
            Pictures
          </Button>
          <Button
            sx={{
              width: "50%",
              backgroundColor: (mediaType === MODEL && "#8D8B96") || "rgba(0, 0, 0, 0)",
              borderRadius: "100px",
              color: "white",
              fontSize: { xs: "12px", md: "16px" }, fontFamily: "'Poppins', sans-serif",
              textTransform: "none",
              "&:hover": (mediaType !== MODEL && {
                backgroundColor: "rgba(255, 255, 255, 0.1)"
              }) || {},
              whiteSpace: "nowrap",
              overflow: "hidden"
            }}
            onClick={() => setMediaType(MODEL)}
            className="MediaViewerModelButton"
          >
            3D View
          </Button>
        </Box>
      )
    };

    const PhotosCarousel = () => {
      const photosCount: number = selectedProduct?.images.length || 0;
      const [currentPhoto, setCurrentPhoto] = useState(0);

      const nextPhoto = () => {
        if (currentPhoto < photosCount - 1) {
          setCurrentPhoto(currentPhoto + 1);
        }
      };

      const prevPhoto = () => {
        if (currentPhoto > 0) {
          setCurrentPhoto(currentPhoto - 1);
        }
      };

      return (
        <Box
          sx={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center",
            gap: "2%"
          }}
          className="PhotosCarousel"
        >
          <ButtonBase
            sx={{
              width: "32px",
              borderRadius: "50%",
              transform: "rotate(180deg)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.05)"
              }
            }}
            onClick={prevPhoto}
            className="PrevPhotoButton"
          >
            <img src="icons/Arrow.svg" style={{ width: "100%", height: "auto" }}></img>
          </ButtonBase>
          <Box
            sx={{
              width: "70%", 
              display: "block",
              overflow: "hidden"
            }}
            className="PhotosContainer"
          >
            <Box
              sx={{
                left: 0,
                width: String(photosCount * 100) + "%", height: "100%",
                display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                transition: "transform 0.5s ease-in-out",
                transform: `translateX(-${(currentPhoto / photosCount) * 100}%)`,
              }}
              className="PhotoScroller"
            >
              {selectedProduct && (
                selectedProduct.images.map((image) => {
                  return (
                    <Box
                      sx={{
                        width: String(1 / photosCount * 100) + "%",
                      }}
                      component="img"
                      src={image.src}
                      key={image.src}
                    />
                  );
                })
              )}
            </Box>
          </Box>
          <ButtonBase
            sx={{
              width: "32px",
              borderRadius: "50%",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.05)"
              }
            }}
            onClick={nextPhoto}
            className="NextPhotoButton"
          >
            <img src="icons/Arrow.svg" style={{ width: "100%", height: "auto" }}></img>
          </ButtonBase>
        </Box>
      );
    };

    const ModelViewerComponent = () => {
      const model = selectedProduct?.models[0];
      if (!model) return (
        <Typography
          sx={{
            fontSize: "24px", fontFamily: "'Poppins', sans-serif",
            color: "rgba(114, 114, 114, 0.75)"
          }}
        >
          3D Model not available
        </Typography>
      );

      const modelData = {
        id: model.id,
        sources: [model.sources && model.sources[0]],
        alt: "3D Model"
      };
      const iosSrc = model.sources && model.sources[1].url;

      return (
        <Box
          sx={{
            width: "100%", height: "100%", minHeight: "300px",
            "& model-viewer": {
              "--poster-color": "transparent",
              "--ar-button-display": "none !important",
            }
          }}
        >
          <ModelViewer
            style={{
              height: "100%",
              width: "100%",
            }}
            data={modelData}
            ar={true} 
            arModes="scene-viewer webxr quick-look" 
            arScale="auto" 
            iosSrc={iosSrc} 
            cameraControls={true} 
            environmentImage="neutral" 
            poster="" 
            alt="A 3D model of a product"
            onArStatus={(event: unknown) => console.log("AR Status:", event)} 
            onLoad={() => console.log("Model loaded")} 
          />
        </Box>
      );
    };

    return (
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          height: { md: "100%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          gap: { xs: "30px", md: "5%" },
        }}
        className="MediaViewer"
      >
        <MediaButtons />
        <Box
          sx={{
            width: "100%",
            height: "60%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          className="MediaContainer"
        >
          {mediaType === PHOTOS && <PhotosCarousel />}
          {mediaType === MODEL && <ModelViewerComponent />}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <Button
            disabled={!isMobile || isIosChrome}
            onPointerDown={handleViewInAR}
            sx={{
              minWidth: "30%",
              backgroundColor: "#424147",
              borderRadius: "100px",
              color: "white",
              fontWeight: "normal",
              fontSize: { xs: "12px", md: "16px" },
              fontFamily: "'Poppins', sans-serif",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
              },
              padding: "auto 35px auto 35px",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            className="ARViewButton"
          >
            View in AR
          </Button>
          <Button
            onPointerDown={handleARTryOn}
            sx={{
              minWidth: "30%",
              backgroundColor: "#424147",
              borderRadius: "100px",
              color: "white",
              fontWeight: "normal",
              fontSize: { xs: "12px", md: "16px" },
              fontFamily: "'Poppins', sans-serif",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
              },
              padding: "auto 35px auto 35px",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            className="ARViewButton"
          >
            AR Try On
          </Button>
        </Box>
      </Box>
    );
  };

  const ContentViewer = () => {
    const PriceContainer = () => {
      return (
        <Box
          sx={{
            width: "100%",
            height: "auto",
            display: "flex",
            flexDirection: "row",
            justifyContent: "start",
            alignItems: "center",
            gap: "10px",
          }}
          className="PriceContainer"
        >
          <Typography
            sx={{
              color: "rgba(255, 255, 255)",
              fontFamily: "'Poppins', sans-seriff",
              fontSize: "20px",
              fontWeight: 500,
              display: { xs: "block", md: "none" },
            }}
          >
            Price :
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "18px", md: "20px" },
              fontFamily: "'Poppins', sans-serif",
              color: "rgb(194, 194, 194)",
            }}
            className="ProductPrice"
          >
            &#8377; {selectedVariant && selectedVariant.price}
          </Typography>
          {selectedVariant && selectedVariant.compareAtPrice && (
            <Typography
              sx={{
                fontSize: { md: "14px" },
                fontFamily: "'Poppins', sans-serif",
                color: "rgb(255, 0, 0)",
                textDecoration: "line-through",
              }}
              className="Price"
            >
              {selectedVariant.compareAtPrice}
            </Typography>
          )}
        </Box>
      );
    };

    const VariantSelector = () => {
      const handleVariantSelection = (
        optionName: string,
        optionValue: string
      ) => {
        const num =
          selectedProduct?.options
            .map((option) => option.name)
            .indexOf(optionName) || 0;
        if (selectedVariant && selectedProduct) {
          setSelectedVariant(
            selectedProduct.variants.find((variant) => {
              for (let i = 0; i < num; i++) {
                if (
                  variant.selectedOptions[i].value !==
                  selectedVariant.selectedOptions[i].value
                )
                  return false;
              }
              return (
                variant.selectedOptions[num].value === optionValue &&
                variant.availableForSale
              );
            })
          );
        }
      };

      const findIfVariantExists = (optionName: string, optionValue: string) => {
        const num =
          selectedProduct?.options
            .map((option) => option.name)
            .indexOf(optionName) || 0;

        if (selectedVariant && selectedProduct) {
          return selectedProduct.variants.find((variant) => {
            for (let i = 0; i < num; i++) {
              if (
                variant.selectedOptions[i].value !==
                selectedVariant.selectedOptions[i].value
              )
                return false;
            }
            return (
              variant.selectedOptions[num].value === optionValue &&
              variant.availableForSale
            );
          });
        } else {
          return false;
        }
      };

      return (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "start",
            alignItems: "center",
            gap: "25px",
            marginTop: "20px",
          }}
          className="VariantSelector"
        >
          {selectedProduct &&
            selectedProduct.options.map((option) => {
              return (
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "start",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                  className="VariantOption"
                  key={option.name}
                >
                  <Typography
                    sx={{
                      maxWidth: "30%",
                      width: "30%",
                      overflowWrap: "break-word",
                      fontSize: "20px",
                      fontFamily: "'Poppins', sans-serif",
                      color: "rgb(255, 255, 255)",
                    }}
                  >
                    {option.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "start",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                    className="ListofValues"
                  >
                    {option.values.map((value) => {
                      return (
                        <Button
                          id={option.id + value}
                          sx={{
                            padding: "5px",
                            fontSize: "16px",
                            fontFamily: "'Poppins', sans-serif",
                            backgroundColor:
                              selectedVariant?.selectedOptions.find(
                                (op) => op.name === option.name
                              )?.value === value
                                ? "rgb(20, 20, 20)"
                                : "#424147",
                            border:
                              selectedVariant?.selectedOptions.find(
                                (op) => op.name === option.name
                              )?.value === value
                                ? "1px solid white"
                                : "none",
                            color: "rgb(215, 215, 215)",
                            textTransform: "none",
                          }}
                          disabled={
                            findIfVariantExists(option.name, value)
                              ? false
                              : true
                          }
                          onClick={() => {
                            handleVariantSelection(option.name, value);
                          }}
                          key={option.name + value}
                        >
                          {value}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
        </Box>
      );
    };

    const QuantitySelector = () => {
      const decrement = () => {
        if (quantity > 1) {
          setQuantity(quantity - 1);
        }
      };
      const increment = () => {
        if (quantity < 5) {
          setQuantity(quantity + 1);
        }
      };

      return (
        <Box
          sx={{
            width: { xs: "80%", md: "65%" },
            height: "30px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "25px",
          }}
          className="QuantitySelector"
        >
          <Typography
            sx={{
              color: "rgba(255, 255, 255)",
              fontFamily: "'Poppins', sans-seriff",
              fontSize: "20px",
              fontWeight: 500,
            }}
          >
            Quantity :
          </Typography>
          <Button
            sx={{
              minWidth: "24px",
              width: "24px",
              height: "24px",
              padding: 1,
              fontSize: "20px",
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
          <Typography
            sx={{
              color: "rgb(194, 194, 194)",
              fontFamily: "'Poppins', sans-seriff",
              fontSize: "20px",
            }}
          >
            {quantity}
          </Typography>
          <Button
            sx={{
              minWidth: "24px",
              width: "24px",
              height: "24px",
              padding: 1,
              fontSize: { xs: "20px", sm: "16px" },
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
        </Box>
      );
    };

    const sanitizedHtml = DOMPurify.sanitize(
      selectedProduct?.description || ""
    );

    return (
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          height: { xs: "auto", md: "100%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "left",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "calc(100% - 70px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "start",
            alignItems: "left",
            gap: "2%",
            overflowY: { md: "scroll" },
            scrollbarWidth: "0",
            "&::-webkit-scrollbar": { display: "none" },
            padding: { xs: "7%", md: "0" },
            paddingRight: { md: "15%" },
            boxSizing: "border-box",
          }}
          className="ContentScroller"
        >
          <Typography
            sx={{
              fontSize: "24px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              color: "rgb(255, 255, 255)",
              display: { xs: "none", md: "block" },
            }}
            className="ProductTitle"
          >
            {selectedProduct && selectedProduct.title}
          </Typography>
          <PriceContainer />
          <VariantSelector />
          <QuantitySelector />
          <Typography
            sx={{
              fontSize: "24px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              color: "rgb(255, 255, 255)",
              marginTop: "20px",
            }}
            className="DescriptionTitle"
          >
            Description
          </Typography>
          <Box
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            sx={{
              width: { xs: "100%", md: "100%" },
              fontSize: { xs: "16px", md: "18px" },
              fontFamily: "'Poppins', sans-serif",
              fontWeight: { xs: "300", md: "400" },
              color: "rgb(255, 255, 255)",
              textAlign: "justify",
            }}
          ></Box>
        </Box>
        <Box
          sx={{
            display: { xs: "none", md: "block" },
          }}
        >
          <ShopifyButtons />
        </Box>
      </Box>
    );
  };

  const ShopifyButtons = () => {
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "row",
          justifyContent: { xs: "center", md: "start" },
          alignItems: "center",
          gap: { xs: "10px", md: "20px" },
        }}
        className="ShopifyButtonsContainer"
      >
        <Button
          sx={{
            minWidth: { xs: "40%", md: "30%" },
            backgroundColor: "#424147",
            borderRadius: "100px",
            color: "white",
            fontWeight: "normal",
            fontSize: { xs: "12px", md: "16px" },
            fontFamily: "'Poppins', sans-serif",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            },
            padding: { md: "auto 35px auto 35px" },
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
          className="AddToCartButton"
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
        <Button
          sx={{
            minWidth: { xs: "40%", md: "30%" },
            backgroundColor: "#424147",
            borderRadius: "100px",
            color: "white",
            fontWeight: "normal",
            fontSize: { xs: "12px", md: "16px" },
            fontFamily: "'Poppins', sans-serif",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            },
            padding: { md: "auto 35px auto 35px" },
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
          className="BuyNowButton"
          onClick={handleBuyNow}
        >
          Buy Now
        </Button>
        <Button
          disabled={!roomCode}
          sx={{
            minWidth: "35px",
            width: "35px",
            height: "35px",
            padding: "5px",
            backgroundColor: "#424147",
            borderRadius: "50%",
            color: "white",
            fontWeight: "bold",
            fontSize: { xs: "16px", md: "18px" },
            fontFamily: "'Poppins', sans-serif",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            },
          }}
          className="WishlistButton"
          onClick={() => {
            if (
              selectedProduct &&
              wishlist.find(
                (productId: number) => productId === selectedProduct.id
              )
            ) {
              removeItemsFromWishlist([selectedProduct.id]);
            } else if (selectedProduct) {
              addItemsToWishlist([selectedProduct.id]);
            }
          }}
        >
          {!wishlist.find(
            (productId: number) => productId === selectedProduct?.id
          ) && <i className="far fa-heart"></i>}
          {wishlist.find(
            (productId: number) => productId === selectedProduct?.id
          ) && <i className="fas fa-heart"></i>}
        </Button>
      </Box>
    );
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
        ref={modalRef}
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: { xs: "90vw", md: "70vw" },
          height: { xs: "75vh", sm: "80vh", md: "75vh" },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
          borderRadius: { xs: "10px", md: "25px" },
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "none",
          paddingTop: { xs: 0, md: "5%" },
          paddingBottom: { xs: 0, md: "2%" },
          boxSizing: "border-box",
        }}
        className="Modal"
      >
        <Typography
          sx={{
            position: "fixed",
            top: "3%",
            right: "3%",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "rgba(255, 255, 255, .7)",
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            fontSize: "26px",
            fontWeight: "normal",
            fontFamily: "'Poppins', sans-serif",
            "&:hover": {
              cursor: "pointer",
            },
          }}
          className="ModalCloseButton"
          onClick={closeModal}
        >
          &times;
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            height: { xs: "85%", md: "100%" },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: { xs: "space-between", md: "space-evenly" },
            alignItems: { xs: "center", md: "start" },
            gap: "2%",
            boxSizing: "border-box",
            backgroundColor: "rgba(0, 0, 0, 0)",
            overflowY: { xs: "scroll", md: "hidden" },
            scrollbarWidth: 0,
            "&::-webkit-scrollbar": { display: "none" },
          }}
          className="MediaAndDetails"
        >
          <Typography
            sx={{
              fontSize: "22px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              color: "rgb(255, 255, 255)",
              display: { xs: "block", md: "none" },
              marginTop: { xs: "20px" },
              padding: "20px",
              paddingBottom: 0,
              textAlign: "center",
            }}
            className="ProductTitle"
          >
            {selectedProduct && selectedProduct.title}
          </Typography>
          <MediaViewer />
          <ContentViewer />
        </Box>
        <Box
          sx={{
            width: "100%",
            padding: "0 20px 0 20px",
            boxSizing: "border-box",
            display: { xs: "block", md: "none" },
            marginBottom: "30px",
          }}
        >
          <ShopifyButtons />
        </Box>
      </Card>
    </div>
  );
};

export default Modal;
