
import { Router } from "express";
import {getProducts,getProduct} from "./sportsShop.controller.js";


const router = Router();



// Get all products
router.get("/products", getProducts);

// Get product by ID
router.get("/products/:id", getProduct);

export default router;
