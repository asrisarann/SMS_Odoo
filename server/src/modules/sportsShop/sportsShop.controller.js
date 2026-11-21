
import {
  getAllProducts,
  getProductById,
} from "./sportsShop.service.js";

// 1. Get all products
export const getProducts = async (req, res) => {
  try {
    const { category } = req.query;

    const products = await getAllProducts(category);

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// 2. Get product by ID
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};
