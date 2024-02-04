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
import * as fs from "fs";
// import { redis } from "../utils/redis";

// ! ----------- functions

//~ upload products
export const uploadProduct = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filePath = "./honda.json";
      const product_data = await fs.promises.readFile(filePath, "utf8");
      const dataArray = JSON.parse(product_data);
      if (dataArray && dataArray.length) {
        dataArray.forEach((product: any) => {
          let productName = product.BreadcrumbsH1.trim().split(",");
          let productTittle = product.BreadcrumbsH1.trim();
          let productTitleArray = productTittle.split(" ");
          let category = productTitleArray[0];
          let subCategory = productTitleArray[1];
          productName = productName[0];

          product["category"] = category.toString();
          product["subcategory"] = subCategory.toString();
          product["product_name"] = productName.toString();
          createProduct(product);
        });
      } else {
        res.send("file not found");
      }
      // const product = await ProductModel.create(data);
      res.status(200).json({
        success: true,
        length: dataArray.length,
      });
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

      const product = await ProductModel.findById(productId);

      res.status(200).json({
        success: true,
        product,
      });
      // }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ~ get all products
export const getAllProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let products = await ProductModel.find().sort({ createdAt: -1 });

      // await redis.set("allProducts", JSON.stringify(products));

      // console.log(`🚀 Hitting MongoDB`)
      res.status(200).json({
        success: true,
        products,
      });
      // }
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

        // await redis.del(id);

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

// ! products by main types starts here

export const productsMainType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let { type, limit, page } = req.params as {
        type?: any;
        limit?: any;
        page?: any;
      };

      limit = Number(limit) || 10 ;
      page= Number(page) || 1

      let query: any = {};
      const skip = (Number(page) - 1) * Number(limit);

      if (type) {
        query["category"] = type;
      }

      const totalCount: number = await ProductModel.countDocuments(query);
      let product: any = await ProductModel.find(query)
        .limit(Number(limit))
        .skip(skip)
        .select(
          "BreadcrumbsH1 Frames ImageLink Years subcategory product_name category"
        );

      if (product.length === 0) {
        return next(new ErrorHandler("🚀 No Product Found", 404));
      }

      res.status(200).json({
        success: true,
        products: product,
        limit: Number(limit),
        page: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalLength: totalCount,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
// ! products by main types ends here

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
    const typeTrim = (type || "").trim().toUpperCase();

    try {
      let productNames: Product[] = [];
      let product: any = [];

      product = await ProductModel.find();

      productNames = product;

      if (type !== "") {
        productNames = productNames.filter((product: Product) => {
          const parentTitle = product.ParentTitle;
          if (parentTitle) {
            return parentTitle.trim().toUpperCase().startsWith(typeTrim);
          }
          return false;
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

// ~ get the product by search of Frames
interface ISearchFrames {
  frames: string;
}

export const getProductsByFrames = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { frames } = req.params;
      let { limit, page } = req.params as {
        type?: any;
        limit?: any;
        page?: any;
      };
      limit = Number(limit) || 10 ;
      page= Number(page) || 1

      let query: any = {};
      const skip = (Number(page) - 1) * Number(limit);

      if (frames) {
        query["Frames"] = {
          $regex: ".*" + frames + ".*",
          $options: "i",
        };
      }

      const totalCount = await ProductModel.countDocuments(query);
      let product: any = await ProductModel.find(query)
        .limit(Number(limit))
        .skip(skip)
        .select(
          "BreadcrumbsH1 Frames ImageLink Years subcategory product_name category"
        );

      if (product.length === 0) {
        return next(new ErrorHandler("🚀 No Product Found", 404));
      }

      res.status(200).json({
        success: true,
        products: product,
        limit: Number(limit),
        page: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
      });
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

// ! search products by hrefNumbers

export const getProductsByHrefNumber = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { href_number } = req.params;

      if (href_number !== "") {
        let { limit, page } = req.params as {
          limit?: any;
          page?: any;
        };

        limit = Number(limit) || 10
        page = Number(page) || 1
        let query: any = {};
        const skip = (Number(page) - 1) * Number(limit);

        if (href_number) {
          query["ListOfHrefs.cards.hrefNumbers"] = href_number
        }
        // const result = await ProductModel.aggregate([
        //   {
        //     $unwind: "$ListOfHrefs",
        //   },
        //   {
        //     $unwind: "$ListOfHrefs.cards",
        //   },
        //   {
        //     $unwind: "$ListOfHrefs.cards.hrefNumbers",
        //   },
        //   {
        //     $match: query
        //   },
        //   {
        //     $project: {
        //       partNumber: "$ListOfHrefs.cards.hrefNumbers",
        //       partName: "$ListOfHrefs.cards.hrefNames",
        //       partPrice: "$ListOfHrefs.cards.hrefPrices",
        //       productId: "$_id",
        //       title: "$ListOfHrefs.cards.Alt",
        //       car: {
        //         $ifNull: ["$ParentTitle", "$BreadcrumbsH1.0"],
        //       },
        //       productImage: "$ListOfHrefs.cards.Href",
        //       mainTitle: "$ListOfHrefs.cards.hrefH1",
        //       frame: "$Frames",
        //     },
        //   },
        //   {
        //     $skip: skip
        //   },
        //   {
        //     $limit: limit,
        //   },
        // ]);
        const result = await ProductModel.aggregate([
          {
            $unwind: "$ListOfHrefs",
          },
          {
            $unwind: "$ListOfHrefs.cards",
          },
          {
            $unwind: "$ListOfHrefs.cards.hrefNumbers",
          },
          {
            $match: query,
          },
          {
            $project: {
              partNumber: "$ListOfHrefs.cards.hrefNumbers",
              partName: {
                $let: {
                  vars: {
                    index: {
                      $indexOfArray: [[href_number], "$ListOfHrefs.cards.hrefNumbers"]
                    }
                  },
                  in: {
                    $arrayElemAt: ["$ListOfHrefs.cards.hrefNames", "$$index"]
                  }
                }
              },
              partPrice: {
                $let: {
                  vars: {
                    index: {
                      $indexOfArray: [[href_number], "$ListOfHrefs.cards.hrefNumbers"]
                    }
                  },
                  in: {
                    $arrayElemAt: ["$ListOfHrefs.cards.hrefPrices", "$$index"]
                  }
                }
              },
              productId: "$_id",
              title: "$ListOfHrefs.cards.Alt",
              car: {
                $ifNull: ["$ParentTitle", "$BreadcrumbsH1.0"],
              },
              productImage: "$ListOfHrefs.cards.Href",
              mainTitle: "$ListOfHrefs.cards.hrefH1",
              frame: "$Frames",
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
        ]);
        let product: any = result

        if (product && product.length) {
          res.status(200).json({
            success: true,
            product: product
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Part Not Found",
          });
        }
      } else {
        return next(
          new ErrorHandler(`⚠️ Please Enter Product Number To Search`, 404)
        );
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
  BreadcrumbsH1: string;
}

export const getProductsBySubCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sub_category = req.params.subCategory;

      let { limit, page } = req.params as {
        type?: any;
        limit?: any;
        page?: any;
      };
      limit = Number(limit) || 10 ;
      page= Number(page) || 1

      let query: any = {};
      const skip = (Number(page) - 1) * Number(limit);

      if (sub_category) {
        query["product_name"] = {
          $regex: ".*" + sub_category + ".*",
          $options: "i",
        };
      }

      const totalCount = await ProductModel.countDocuments(query);
      let product: any = await ProductModel.find(query)
        .limit(Number(limit))
        .skip(skip)
        .select(
          "BreadcrumbsH1 Frames ImageLink Years subcategory product_name category"
        );

      if (product.length === 0) {
        return next(new ErrorHandler("🚀 No Product Found", 404));
      }

      res.status(200).json({
        success: true,
        products: product,
        limit: Number(limit),
        page: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ product by product Id and Card ID
interface IproductCard {
  productId: string;
  payment_info: string;
}
export const getProductCard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { payment_info, productId } = req.body as IproductCard;

      let product: any = await ProductModel.findOne({
        _id: productId,
        "ListOfHrefs.H1Tag": payment_info,
      });

      const ListOfHref = product.ListOfHrefs;

      const result = ListOfHref.find((item: any) => {
        const resultItem =
          item.H1Tag.trim().toUpperCase() === payment_info.trim().toUpperCase();
        console.log(`Item : ${resultItem}`);
        return resultItem;
      });

      if (!product) {
        return next(new ErrorHandler(`⚠️ Product Not Found`, 404));
      } else {
        // const cardList = product.some((item: any) => {
        //   const listHref = item.ListOfHrefs;
        //   console.log(`🚀 ${listHref}`);
        // });
        res.status(200).json({
          success: true,
          result,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
