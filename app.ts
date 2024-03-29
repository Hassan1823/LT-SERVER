require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();

import cookieParser from "cookie-parser";
import cors from "cors";

// ! local imports
import { ErrorMiddleware } from "./middleware/error";
import notificationRouter from "./routes/notification.route";
import orderRouter from "./routes/order.route";
import productRoute from "./routes/product.route";
import userRouter from "./routes/user.route";

// ! body parser
app.use(express.json({ limit: "50mb" }));

// ! cookies parser
app.use(cookieParser());

// ! cors
app.use(
  cors({
    // origin: process.env.ORIGIN,
    origin:["http://localhost:3000", "https://looniatraders.com"],
    credentials: true,
  })
);

// ! routes
app.use("/api/v1", userRouter, productRoute, orderRouter, notificationRouter);

// app.use("/api/v1", );

// app.use("/api/v1", );

// ! for testing API route
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  console.log(`😁 API is Working At ${req.originalUrl}`);
  res.status(200).json({
    success: true,
    message: "😁 API is Working",
  });
});

// ! for unknown API routre
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`🥲 Route ${req.originalUrl} Not Found`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
