import cloudinary from "cloudinary";
import { NextFunction, Request, Response } from "express";

// ~ local imports
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ProductModel from "../models/product.model";
import {
  createProduct,
  getAllProductsService,
} from "../services/product.service";
import ErrorHandler from "../utils/ErrorHandler";
import { redis } from "../utils/redis";

// ! ----------- functions

//~ upload products
export const uploadProduct = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "products",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      createProduct(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ edit product
export const editProduct = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "products",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.url,
        };
      }

      const productId = req.params.id;
      const product = await ProductModel.findByIdAndUpdate(
        productId,
        {
          $set: data,
        },
        {
          new: true,
        }
      );

      res.status(201).json({
        success: true,
        product,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get single products
export const getSingleProduct = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id;

      const isCachedExist = await redis.get(productId);

      if (isCachedExist) {
        const product = JSON.parse(isCachedExist);
        res.status(200).json({
          success: true,
          product,
        });
      } else {
        const product = await ProductModel.findById(req.params.id);
        await redis.set(productId, JSON.stringify(product));
        await redis.del("allProducts");

        res.status(200).json({
          success: true,
          product,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get all products
export const getAllProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCatcheExist = await redis.get("allProducts");

      if (isCatcheExist) {
        const products = JSON.parse(isCatcheExist);
        //   console.log(`🚀 Hitting Redis`)

        res.status(200).json({
          success: true,
          products,
        });
      } else {
        let products = await ProductModel.find().sort({ createdAt: -1 });
        products = products.slice(0, 15);

        await redis.set("allProducts", JSON.stringify(products));

        // console.log(`🚀 Hitting MongoDB`)
        res.status(200).json({
          success: true,
          products,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get products according to the user
// ! to access the cart
export const getProductByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userProductList = req.user?.products;
      const productId = req.params.id;

      const productExist = userProductList?.find(
        (product: any) => product._id.toString() === productId
      );

      if (!productExist) {
        return next(
          new ErrorHandler(
            `⚠️ You Are Not Eligible To Access This Product`,
            400
          )
        );
      }

      const product = await ProductModel.findById(productId);

      if (product) {
        //   console.log(`Produts : ${product}`);
        res.status(200).json({
          success: true,
          product,
        });
      } else {
        console.log(`No Products Found`);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get all products --- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllProductsService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ delete product ---only for admin
export const deleteProduct = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const product = await ProductModel.findById(id);

      if (!product) {
        return next(new ErrorHandler(`⚠️ Product Not Found`, 404));
      } else {
        await product.deleteOne({ id });

        await redis.del(id);

        res.status(200).json({
          success: true,
          message: `✅ ${product.ParentTitle} Deleted Successfully`,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ find products by Main Category like Toyota
// Define interface for ProductModel
interface Product extends Document {
  ParentTitle: string;
  _doc: any;
  type: string;
}

export const getProductsByTypes = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { type } = req.body as Product;
    const typeTrim = type.trim().toUpperCase();

    try {
      let productNames: Product[] = [];
      let product: any = [];
      const isCacheExist = await redis.get(typeTrim);
      if (isCacheExist) {
        product = JSON.parse(isCacheExist);
        // console.log("🚀 Hitting Redis");
      } else {
        product = await ProductModel.find();
        // console.log("🚀 Hitting MongoDB");
      }

      productNames = product;

      if (type !== "") {
        productNames = productNames.filter((product: Product) =>
          product.ParentTitle.toUpperCase().trimStart().startsWith(typeTrim)
        );
      } else {
        return next(new ErrorHandler("🚀 No Type Selected", 404));
      }

      if (productNames.length === 0) {
        return next(new ErrorHandler("🚀 No Product Found", 404));
      }

      // productNames = productNames.slice(0, 15);
      await redis.set(typeTrim, JSON.stringify(productNames));

      res.status(200).json({
        success: true,
        productNames: productNames,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ get the product by search of Frames
interface ISearchFrames {
  frames: string;
}

export const getProductsByFrames = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { frames } = req.body as ISearchFrames;
      const productFrames = frames?.trim().toUpperCase();

      const products = await ProductModel.find();

      if (products) {
        const resultProduct = products.filter((product) => {
          const productFrame = product.Frames?.trim();
          const splitFrame = productFrame?.split(",");
          // console.log(`Split Frames : ${splitFrame}`);
          const result = splitFrame?.find((item) => {
            return item.trim() === productFrames;
            // console.log(`Item is : ${item}`);
          });

          // console.log(`Result : ${result}`);
          return result;
        });

        if (resultProduct.length !== 0) {
          res.status(200).json({
            success: true,
            resultProduct,
          });
        } else {
          return next(new ErrorHandler(`⚠️ No Match Found`, 404));
        }
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ get the product by search of Frames Family and hrefNumbers
interface ISearchFamily {
  family: string;
}

export const getProductsByFamily = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { family } = req.body as ISearchFamily;

      const products = await ProductModel.find();
      const productFamily = `(` + family.trim() + `)`;

      if (products) {
        const resultProduct = products.filter((item) => {
          // console.log(`Item : ${item.Family?.trim()}`);
          return item.Family?.trim() === productFamily.toUpperCase();
        });
        if (resultProduct.length !== 0) {
          res.status(200).json({
            success: true,
            resultProduct,
          });
        } else {
          return next(new ErrorHandler(`⚠️ No Match Found`, 404));
        }
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ search products by hrefNumbers

interface ISearchHrefNames {
  href_number: any;
}
export const getProductsByHrefNumber = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { href_number } = req.body as ISearchHrefNames;

      const products = await ProductModel.find();

      if (products) {
        const resultProducts = products.filter((product) => {
          const listOfHref = product.ListOfHrefs;

          const cards = listOfHref?.filter((listOfHref) => {
            const cardsList = listOfHref.cards;

            const hrefNumberList = cardsList?.filter((href) => {
              const hrefNumbers = href.hrefNumbers;

              // Corrected filter function to return a boolean
              const productHrefList = hrefNumbers?.filter(
                (item) => item === href_number.trim()
              );
              if (productHrefList?.length !== 0) {
                return productHrefList; // Return true if the item is found
              }
            });
            if (hrefNumberList?.length !== 0) {
              return hrefNumberList; // Return true if the item is found
            }
          });
          if (cards?.length !== 0) {
            return cards; // Return true if the item is found
          }
        });

        if (resultProducts.length !== 0) {
          res.status(200).json({
            success: true,
            resultProducts,
          });
        } else {
          return next(new ErrorHandler(`⚠️ No Products Available`, 400));
        }
      } else {
        return next(new ErrorHandler(`⚠️ No Products Available`, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//~ get products by sub category like 4Runner
interface Product extends Document {
  ParentTitle: string;
  _doc: any;
  sub_category: string;
  type: string;
}

export const getProductsBySubCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sub_category, type } = req.body as Product;
      const mainCategory = type.trim().toUpperCase();
      let products: any = [];
      let productNames: any = [];
      const isCacheExist = await redis.get(mainCategory);
      if (isCacheExist) {
        products = JSON.parse(isCacheExist);
        console.log(`🚀 Hitting Redis`);
      } else {
        products = await ProductModel.find();
        products = products.filter((product: Product) =>
          product.ParentTitle.toUpperCase().trimStart().startsWith(mainCategory)
        );
        await redis.set(mainCategory, JSON.stringify(products));
        console.log(`🚀 Hitting MONGODB`);
      }
      productNames = products;

      if (sub_category !== "") {
        productNames = productNames.filter((product: Product) => {
          const title = product.ParentTitle;
          const trim = title.trim();
          const splitTitle = trim.split(" ");
          const splitItem = splitTitle[1];
          // console.log(`Sub Category is : ${splitItem}`);
          return splitItem.toUpperCase() === sub_category.trim().toUpperCase();
        });
      } else {
        return next(new ErrorHandler("🚀 No Type Selected", 404));
      }

      if (productNames.length === 0) {
        return next(new ErrorHandler("🚀 No Product Found", 404));
      }

      res.status(200).json({
        success: true,
        productNames: productNames,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
