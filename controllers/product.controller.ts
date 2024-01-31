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
// import { redis } from "../utils/redis";

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

      // const isCachedExist = await redis.get(productId);

      // if (isCachedExist) {
      //   const product = JSON.parse(isCachedExist);
      //   res.status(200).json({
      //     success: true,
      //     product,
      //   });
      // } else {
      const product = await ProductModel.findById(productId);
      // await redis.set(productId, JSON.stringify(product));
      // await redis.del("allProducts");

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
      // const isCatcheExist = await redis.get("allProducts");

      // if (isCatcheExist) {
      //   const products = JSON.parse(isCatcheExist);
      //   //   console.log(`🚀 Hitting Redis`)

      //   res.status(200).json({
      //     success: true,
      //     products,
      //   });
      // } else {
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
      const { type, limit, prevLimit } = req.params;
      const typeTrim = (type || "").trim().toUpperCase();
      let productNames: any = [];

      console.log(`type is : `);
      console.log(typeTrim);
      let product: any = await ProductModel.find();
      productNames = product;

      if (type !== "") {
        productNames = productNames.filter((product: any) => {
          const productBreadcrumbsH1 = product.BreadcrumbsH1;
          let BreadcrumbsH1 = productBreadcrumbsH1;
          if (BreadcrumbsH1) {
            return BreadcrumbsH1.trim().toUpperCase().startsWith(typeTrim);
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
        products: productNames.slice(prevLimit, limit),
        length : productNames.length
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

// ! search products by hrefNumbers

interface ISearchHrefNames {
  href_number: any;
}
export const getProductsByHrefNumber = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { href_number } = req.body;

      const products = await ProductModel.find();
      let partNumber: any = "";
      let partName: any = "";
      let partPrice: any = "";
      let productId: any = "";
      let cardId: any = "";
      let title: any = "";
      let car: any = "";
      let productImage: any = "";
      let mainTitle: any = "";

      if (products) {
        const resultProducts = products.filter((product) => {
          const listOfHref = product.ListOfHrefs;
          let carType: any = product?.BreadcrumbsH1?.trim();
          let carTypeArray: any = carType?.split(" ");
          carType = carTypeArray[0] + " " + carTypeArray[1];

          const cards = listOfHref?.filter((listOfHref) => {
            const cardsList = listOfHref.cards;

            const hrefNumberList = cardsList?.filter((href) => {
              const hrefNumbers: any = href.hrefNumbers;
              const hrefNames: any = href.hrefNames;
              const hrefPrices: any = href.hrefPrices;

              // Corrected filter function to return a boolean
              const productHrefList = hrefNumbers?.filter(
                (item: any, index: number) => {
                  if (item === href_number.trim()) {
                    partNumber = item;
                    partName = hrefNames[index];
                    partPrice = hrefPrices[index];
                    productId = product._id;
                    cardId = href._id;
                    title = href.hrefH1;
                    car = carType;
                    productImage = href.ImageLink;
                    mainTitle = href.hrefH1;
                    return item;
                  }
                }
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
            resultProducts: {
              productId: productId,
              cardId: cardId,
              productImage: productImage,
              mainTitle: mainTitle,
              mainCategory: car,
              productName: title,
              partNumber: partNumber,
              partName: partName,
              partPrice: partPrice,
            },
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
  BreadcrumbsH1: string;
  // sub_category: string;
  // type: string;
}

export const getProductsBySubCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subType = req.params.id;
      const types = subType.split(" ");
      const second_category = types[1];
      // console.log(types);
      // const { sub_category, type } = req.body as Product;

      const mainCategory = types[0].trim();
      console.log(`Main Category : ${mainCategory}`);
      console.log(`Sub Category : ${second_category}`);
      let products: any = [];
      let productNames: any = [];

      // const isCacheExist = await redis.get(mainCategory);
      // if (isCacheExist) {
      //   products = JSON.parse(isCacheExist);
      //   console.log(`🚀 Hitting Redis`);
      // } else {
      products = await ProductModel.find();

      products = products.filter((product: Product) => {
        let productTitle = product.BreadcrumbsH1.trim();
        let productTitleArray = productTitle.split(" ");
        productTitle = productTitleArray[0];
        // console.log(productTitle);

        return productTitle === mainCategory;
      });
      // await redis.set(mainCategory, JSON.stringify(products));
      // }
      productNames = products;
      // console.log(`🚀 ${productNames.BreadcrumbsH1 }`);

      if (second_category !== "") {
        productNames = productNames.filter((product: Product) => {
          let title = product.BreadcrumbsH1.trim();
          let titleArray = title.split(" ");
          let splitItem = titleArray[1];

          console.log(`Trim : ${splitItem}`);
          return splitItem.toUpperCase() === second_category.toUpperCase();
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
