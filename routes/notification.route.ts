import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getNotification,
  updateNotification,
} from "../controllers/notification.controller";

const notificationRouter = express.Router();

notificationRouter.get(
  "/get-all-notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getNotification
);

notificationRouter.put(
  "/get-updated-notification/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification
);

export default notificationRouter;
