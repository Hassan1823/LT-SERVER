import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
// import { redis } from "../utils/redis";
import userModel from "../models/user.model";

// ! for authenticated user
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
      return next(new ErrorHandler(`🚀 Please Login To Access`, 400));
    }

    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) {
      return next(new ErrorHandler(`🥲 Access Token Is Not Valid`, 400));
    }

    // const user = await redis.get(decoded.id);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return next(new ErrorHandler(`🥲 User Not Found`, 400));
    }

    req.user = user;
    next();
  }
);

// ! vaidate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `🚀 Role ${req.user?.role} Is Not Allowed To Access Resources`,
          403
        )
      );
    }
    next();
  };
};
