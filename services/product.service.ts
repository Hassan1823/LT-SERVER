import { Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ProductModel from "../models/product.model";

// ~ create product
export const createProduct = CatchAsyncError(
  async (data: any, res: Response) => {
    const product = await ProductModel.create(data);
    res.status(200).json({
      success: true,
      product,
    });
  }
);



// ~ get all products
export const getAllProductsService = async (res: Response) => {
  const products = await ProductModel.find().sort({ createdAt: 1 });
  res.status(201).json({
    success: true,
    products,
  });
};