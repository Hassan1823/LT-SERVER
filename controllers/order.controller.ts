import ejs from "ejs";
import { NextFunction, Request, Response } from "express";
import path from "path";

// ~local imports
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import NotificationModel from "../models/notification.model";
import { IOrder } from "../models/order.model";
import ProductModel from "../models/product.model";
import userModel from "../models/user.model";
import { getAllOrdersService, newOrder } from "../services/order.service";
import ErrorHandler from "../utils/ErrorHandler";
import sendMail from "../utils/sendMails";

// ~create order
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        productId,
        payment_info,
        card_id,
        hrefNumbers,
        hrefNames,
        hrefPrices,
        
      } = req.body as IOrder;
      const user = await userModel.findById(req.user?._id);

      // const productExistInUser = user?.products.map(
      //   (product: any) => product._id.toString() === productId
      //   // product.ListOfHrefs._id === payment_info
      // );

      // if (productExistInUser) {
      //   return next(new ErrorHandler(`🚀 Product Is Already Purchased`, 400));
      // }

      const product = await ProductModel.findById(productId);

      if (!product) {
        return next(new ErrorHandler(`🥲 Product Not Found`, 400));
      }

      const ListOfHref = product.ListOfHrefs;

      const result = ListOfHref?.find((item: any) => {
        const resultItem =
          item.H1Tag.trim().toUpperCase() === payment_info.trim().toUpperCase();
        console.log(`Item : ${resultItem}`);
        return resultItem;
      });

      const data: any = {
        productId: product._id,
        userId: user?._id,
        payment_info: payment_info,
        hrefNumbers: hrefNumbers,
        hrefNames: hrefNames,
        hrefPrices: hrefPrices,
      };
      console.log(data);

      const mailData = {
        order: {
          _id: product._id.toString().slice(0, 6),
          name: hrefNames,
          price: hrefPrices,
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

      user?.products.push({
        productId: product?._id,
        cardObjectId: payment_info,
        hrefNames,
        hrefNumbers,
        hrefPrices,
        orderConfirmed: false,
      });

      await user?.save();

      await NotificationModel.create({
        user: user?._id,
        title: "New Order",
        message: `You Have A New Order from ${product?.ParentTitle}`,
      });

      // if (user?.products?.orderConfirmed) {
      //   if (product.purchased) {
      //     product.purchased += 1;
      //   } else {
      //     product.purchased = 1;
      //   }
      // }

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
