import express from "express";

// ~ local imports
import {
  deleteProduct,
  editProduct,
  getAllProducts,
  getAllUsers,
  getProductByUser,
  getProductCard,
  getProductsByFamily,
  getProductsByFrames,
  getProductsByHrefNumber,
  getProductsBySubCategory,
  getProductsByTypes,
  getSingleProduct,
  uploadProduct
} from "../controllers/product.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const productRoute = express.Router();

productRoute.post(
  "/add-product",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadProduct
);

productRoute.put(
  "/edit-product/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editProduct
);
productRoute.get("/get-product/:id", getSingleProduct);

productRoute.get("/get-products", getAllProducts);

productRoute.get("/get-product-user/:id", isAuthenticated, getProductByUser);

productRoute.get(
  "/get-all-products",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

productRoute.delete(
  "/delete-product/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteProduct
);

productRoute.get(
  "/products-by-type",
  getProductsByTypes
);


productRoute.get(
  "/products-by-frames",
  getProductsByFrames
);

productRoute.get(
  "/products-by-family",
  getProductsByFamily
);

productRoute.get(
  "/products-by-hrefNumber",
  getProductsByHrefNumber
);

productRoute.get(
  "/products-by-sub/:id",
  getProductsBySubCategory
);

productRoute.get(
  "/product-card",
  getProductCard
);

export default productRoute;
