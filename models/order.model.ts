import mongoose, { Model, Schema, Document } from "mongoose";

// ~ interface for orders

export interface IOrder extends Document {
  productId: string;
  userId: string;
  payment_info: string;
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
    payment_info: {
      type: String,
      //   required: true,
    },
  },
  { timestamps: true }
);

const OrderModel: Model<IOrder> = mongoose.model("Order", orderSchema);

export default OrderModel;
