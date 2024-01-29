import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createOrder,
  createProductOrder,
} from "../controllers/order.controller";
import { getAllUsers } from "../controllers/order.controller";

const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);

orderRouter.get(
  "/get-all-orders",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

orderRouter.post("/product-order", isAuthenticated, createProductOrder);

export default orderRouter;
