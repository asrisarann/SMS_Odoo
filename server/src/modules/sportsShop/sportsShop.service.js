
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
