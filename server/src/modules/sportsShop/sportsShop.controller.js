
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductStock,
  processCheckout,
  getUserPurchases,
  getAllPurchases,
  cancelPurchase,
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

// 3. Create product
export const addProduct = async (req, res) => {
  try {
    const product = await createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
};

// 4. Update stock quantity
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { inStock } = req.body;

    const updatedProduct = await updateProductStock(id, inStock);

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating stock:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update stock",
    });
  }
};

// 5. Checkout / Place order
export const checkout = async (req, res) => {
  try {
    const order = await processCheckout(req.body);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process checkout",
    });
  }
};

// 6. Get order history for a member
export const getMemberOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await getUserPurchases(userId);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order history",
    });
  }
};

// 7. Get all orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await getAllPurchases();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// 8. Cancel an order
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const cancelledOrder = await cancelPurchase(id, userId);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully and stock restored",
      data: cancelledOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  }
};
