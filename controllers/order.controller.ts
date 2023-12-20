import ejs from "ejs";
import { NextFunction, Request, Response } from "express";
import path from "path";

// ~local imports
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import ProductModel from "../models/product.model";
import CourseModel from "../models/course.model";
import sendMail from "../utils/sendMails";
import NotificationModel from "../models/notification.model";
import { getAllOrdersService, newOrder } from "../services/order.service";

// ~create order
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, payment_info } = req.body as IOrder;
      const user = await userModel.findById(req.user?._id);

      const productExistInUser = user?.products.some(
        (product: any) => product._id.toString() === productId
      );

      if (productExistInUser) {
        return next(new ErrorHandler(`🚀 Course Is Already Purchased`, 400));
      }

      const product = await ProductModel.findById(productId);

      if (!product) {
        return next(new ErrorHandler(`🥲 Course Not Found`, 400));
      }

      const data: any = {
        productId: product._id,
        userId: user?._id,
        payment_info,
      };

      const mailData = {
        order: {
          _id: product._id.toString().slice(0, 6),
          name: product.ParentTitle,
          price: product.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        {
          order: mailData,
        }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(
          new ErrorHandler(`⚠️ Error In Sending Order Confirmation Email`, 400)
        );
      }

      user?.products.push(product?._id);

      await user?.save();

      await NotificationModel.create({
        user: user?._id,
        title: "New Order",
        message: `You Have A New Order from ${product?.ParentTitle}`,
      });

      if (product.purchased) {
        product.purchased += 1;
      } else {
        product.purchased = 1;
      }

      await product.save();

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get all orders --- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
