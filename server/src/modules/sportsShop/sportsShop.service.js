
import prisma from "../../config/prisma.js";

// 1. Get all products
export const getAllProducts = async (category) => {
  const products = await prisma.product.findMany({
    where: category
      ? {
          category: {
            equals: category.trim(),
            mode: "insensitive",
          },
        }
      : undefined,
  });

  return products.map((product) => ({
    ...product,
    isLowStock: product.inStock <= 5,
  }));
};

// 2. Get product by ID
export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    isLowStock: product.inStock <= 5,
  };
};

// 3. Create a product
export const createProduct = async (productData) => {
  const { name, category, buyPrice, rentPrice, size, inStock } = productData;

  if (!name || !category || buyPrice === undefined || buyPrice === null) {
    throw new Error("Name, category, and buyPrice are required");
  }

  if (Number(buyPrice) < 0) {
    throw new Error("buyPrice cannot be negative");
  }

  if (inStock !== undefined && Number(inStock) < 0) {
    throw new Error("inStock cannot be negative");
  }

  const newProduct = await prisma.product.create({
    data: {
      name: name.trim(),
      category: category.trim(),
      buyPrice: Number(buyPrice),
      rentPrice: rentPrice !== undefined && rentPrice !== null ? Number(rentPrice) : null,
      size: size ? size.trim() : null,
      inStock: inStock !== undefined ? parseInt(inStock, 10) : 0,
    },
  });

  return {
    ...newProduct,
    isLowStock: newProduct.inStock <= 5,
  };
};

// 4. Update product stock (for admin inventory management)
export const updateProductStock = async (id, inStock) => {
  if (inStock === undefined || inStock === null || parseInt(inStock, 10) < 0) {
    throw new Error("Valid non-negative inStock quantity is required");
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      inStock: parseInt(inStock, 10),
    },
  });

  return {
    ...updatedProduct,
    isLowStock: updatedProduct.inStock <= 5,
  };
};

// 5. Member Checkout & Purchase
export const processCheckout = async (checkoutData) => {
  const { userID, items, fulfillmentType } = checkoutData;

  if (!userID) {
    throw new Error("User ID is required to process checkout");
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Cart must contain at least one item");
  }

  // A. Fetch member details from User table
  const user = await prisma.user.findUnique({
    where: { id: userID },
  });

  if (!user) {
    throw new Error("Member not found");
  }

  // B. Calculate member discount rate
  const isExpired = user.renewalDate ? new Date(user.renewalDate) < new Date() : false;
  let discountRate = 0;

  if (!isExpired) {
    if (user.membership === "GOLD") {
      discountRate = 0.30;
    } else if (user.membership === "SILVER") {
      discountRate = 0.15;
    }else if (user.membership === "JUNIOR") {
        discountRate = 0.11;
    }
  }

  // C. Fetch all requested products and verify stock
  const productIds = items.map((item) => item.productID);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const validatedLineItems = [];

  for (const item of items) {
    const product = productMap.get(item.productID);

    if (!product) {
      throw new Error(`Product not found with ID: ${item.productID}`);
    }

    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for product "${product.name}"`);
    }

    if (product.inStock < qty) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.inStock}, Requested: ${qty}`
      );
    }

    const unitPrice = Number(product.buyPrice);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    validatedLineItems.push({
      productID: product.id,
      name: product.name,
      quantity: qty,
      unitPrice,
      totalPrice: lineTotal,
    });
  }

  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  // D. Atomic Database Transaction: Deduct stock + create purchase + create line items
  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Decrement stock for every product in the cart
    for (const item of validatedLineItems) {
      await tx.product.update({
        where: { id: item.productID },
        data: {
          inStock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 2. Summary text array for legacy compatibility
    const summaryStrings = validatedLineItems.map(
      (item) => `${item.name} x ${item.quantity}`
    );

    // 3. Create the purchase record and line items
    return await tx.sportShopPurchase.create({
      data: {
        userID: user.id,
        name: user.name,
        phone: user.phone,
        items: summaryStrings,
        status: "PENDING",
        fulfillmentType: fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
        discount: discountAmount,
        totalAmount: finalTotal,
        orderItems: {
          create: validatedLineItems.map((item) => ({
            productID: item.productID,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  return {
    ...purchase,
    subtotal,
    appliedDiscountPercentage: discountRate * 100,
  };
};

// 6. Get member order history
export const getUserPurchases = async (userID) => {
  return await prisma.sportShopPurchase.findMany({
    where: { userID },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      purchaseDate: "desc",
    },
  });
};

// 7. Get all shop orders (Admin Dashboard)
export const getAllPurchases = async () => {
  return await prisma.sportShopPurchase.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membership: true,
        },
      },
      orderItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      purchaseDate: "desc",
    },
  });
};

// 8. Cancel an order (Before READY status) and restore stock
export const cancelPurchase = async (orderID, userID) => {
  const order = await prisma.sportShopPurchase.findUnique({
    where: { id: orderID },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Ensure security: only order owner or admin can cancel
  if (userID && order.userID !== userID) {
    throw new Error("Unauthorized to cancel this order");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Order is already cancelled");
  }

  if (order.status !== "PENDING") {
    throw new Error(`Cannot cancel order once status is "${order.status}". Only PENDING orders can be cancelled.`);
  }

  // Atomic transaction to restore stock and update status
  return await prisma.$transaction(async (tx) => {
    // 1. Restore stock to product table
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productID },
        data: {
          inStock: {
            increment: item.quantity,
          },
        },
      });
    }

    // 2. Mark order as CANCELLED
    return await tx.sportShopPurchase.update({
      where: { id: orderID },
      data: {
        status: "CANCELLED",
      },
      include: {
        orderItems: true,
      },
    });
  });
};
