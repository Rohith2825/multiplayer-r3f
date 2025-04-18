import Variant from '@/Types/Variant';
import Product from '../Types/Product';

const BASE_URL = "https://function-2-864197837687.asia-south1.run.app";

async function fetchData<T>(method: "GET", endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}

interface ProductResponse {
  data: {
    products: {
      edges: {
        node: {
          id: string,
          title: string,
          media: {
            edges: {
              node: {
                mediaContentType: string,
                image?: {
                  url: string,
                  altText: string
                },
                id?: string,
                sources?: {
                  url: string,
                  format: string,
                  mimeType: string
                }[]
              }
            }[]
          }
          options: {
            id: string,
            name: string,
            position: number,
            values: string[]
          }[],
          variants: {
            edges: {
              node: {
                id: string,
                title: string,
                price: string,
                compareAtPrice?: string,
                availableForSale: boolean,
                selectedOptions: {
                  name: string,
                  value: string
                }[],
              }
            }[]
          },
          tags:string[],
          metafields:{
            edges:{
              node:{
                namespace: string,
                key: string,
                value: string,
                type: string,
                description: string,
              }
            }[]
          },
          bodyHtml: string,
          descriptionHtml: string 
        }
      }[]
    }
  }
}

export const ProductService = {
  async getAllProducts(): Promise<Product[]> {
    const response = await fetchData<ProductResponse>("GET", "");

    
    const products: Product[] = response.data.products.edges.map((product) => {
      
      const productImages: { src: string }[] = product.node.media.edges.filter((edge) =>
        edge.node.mediaContentType.toUpperCase() === "IMAGE" 
        && edge.node.image 
      ).map((edge) => {
        return { src: edge.node.image?.url || "" };
      });


      const models: {
        id: string|undefined,
        sources: {
          url: string,
          format: string,
          mimeType: string
        }[] | undefined
      }[] = product.node.media.edges.filter((edge) => 
        edge.node.mediaContentType.toUpperCase() === "MODEL_3D"
        && edge.node.sources
      ).map((edge) => {
        return { 
          id: edge.node.id,
          sources: edge.node.sources
        };
      });

      
      const productVariants: Variant[] = product.node.variants.edges.map((variant) => {
        return {
          id: Number(variant.node.id.split("/").pop()),
          price: variant.node.price,
          compareAtPrice: variant.node.compareAtPrice,
          productId: Number(product.node.id.split("/").pop()),
          selectedOptions: variant.node.selectedOptions,
          availableForSale: variant.node.availableForSale
        };
      });

    
      const arLensLink = product.node.metafields.edges.find((metafield) => 
        metafield.node.namespace === "custom" && metafield.node.key === "snapchat_lens_link"
      )?.node.value;

      const parsedProduct: Product = {
        id: Number(product.node.id.split("/").pop()),
        title: product.node.title,
        description: product.node.descriptionHtml,
        images: productImages,
        options: product.node.options,
        variants: productVariants,
        models: models,
        arLensLink: arLensLink,
        tags: product.node.tags.join(" "),
      };

      return parsedProduct;
    });

    return products;
  },

  // async getProductById(id: number | string): Promise<Product> {
  //   const response = await fetchData<{ product: Product }>("GET", `/products/${id}`);
  //   return response.product;
  // },

  // async getProductModel(id: number | string): Promise<Product> {
  //   return fetchData<Product>("GET", `/products/${id}/model`);
  // },
};
