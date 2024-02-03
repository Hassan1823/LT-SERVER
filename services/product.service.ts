import { Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ProductModel from "../models/product.model";

// ~ create product
export const createProduct = async (data: any) => {
    const product = await ProductModel.create(data);
    return product
  }



// ~ get all products
export const getAllProductsService = async (res: Response) => {
  const products = await ProductModel.find().sort({ createdAt: 1 });
  res.status(201).json({
    success: true,
    products,
  });
};


