import mongoose, { Model, Schema, Document } from "mongoose";

// ~ interface for orders

export interface IOrder extends Document {
  productId: string;
  userId: string;
  // payment_info: string;
  // card_id: string;
  hrefNumbers: string;
  hrefNames: string;
  hrefPrices: string;
}

// ~schema for orders
const orderSchema = new Schema<IOrder>(
  {
    productId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    // payment_info: {
    //   type: String,
    //   //   required: true,
    //   // listofHref id
    // },
    // card_id: {
    //   types: String,
    // },
    hrefNumbers: {
      types: String,
    },
    hrefNames: {
      types: String,
    },
    hrefPrices: {
      types: String,
    },
  },
  { timestamps: true }
);

const OrderModel: Model<IOrder> = mongoose.model("Order", orderSchema);

export default OrderModel;
