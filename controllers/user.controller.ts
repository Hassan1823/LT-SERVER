require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";

// ! local imports
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import path from "path";
import sendMail from "../utils/sendMails";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
// import { redis } from "../utils/redis";
import {
  getAllUserService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service";
import cloudinary from "cloudinary";

// !register user

// !interface
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, avatar } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("🥲 Email Already Exist", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;
      console.log(`Activation Code is : ${activationCode}`);

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your Account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `✨ Please Check Your Email : ${user.email} To Activate Your Account`,
          activationToken: activationToken.token,
        });
        console.log(`Activation Token is : ${activationToken.token}`);
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return {
    token,
    activationCode,
  };
};

// ! activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // console.log("Request body:", req.body);
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      // console.log(`Activation Code : ${activation_code}`)

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      // console.log("New user:", newUser);

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("🥲 Invalid Activation Code", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler("🥲 Email Already Exist", 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
        isVerified: true,
      });

      res.status(201).json({
        success: true,
        message: `🚀 User Registered Successfully`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! USer Login
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler(`🚀 Please Enter Email & Password`, 400));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler(`🚀 Invalid Email || Password`, 400));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler(`🚀 Invalid Password`, 400));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      console.log(`User ID: ${userId}`);
      // redis.del(userId);

      res.status(200).json({
        success: true,
        message: `😁 Logged Out Successfully`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! update access tokens
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      // console.log(`😌 Refresh Token : ${refresh_token}`);

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = `🥲 Couldn't Refresh Token`;

      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      // const session = await redis.get(decoded.id as string);
      // if (!session) {
      //   return next(new ErrorHandler(message, 400));
      // }

      // const user = JSON.parse(session);
      const user = await userModel.findById(decoded.id);
      if (!user) {
        return next(new ErrorHandler(message, 400));
      }

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        status: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//! get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      if (user) {
        res.status(201).json({
          success: true,
          user,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No User Found",
        });
      }
      // getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//! user cart products

export const getUserCart = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      const user = await userModel.findById(userId);
      if (user) {
        console.log(`User found`);
        res.status(201).json({
          success: true,
          products: user.products,
        });
      } else {
        console.log(`user not found`);
        res.status(404).json({
          success: false,
          message: "User Not Found",
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! social auths

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });

      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
        // return next(new ErrorHandler(`🥲 No User Found`, 400))
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! update user info
interface IUpdateUserInfo {
  name?: string;
  email?: string;
  // password?:string
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as IUpdateUserInfo;

      const userId = req.user?._id;

      const user = await userModel.findById(userId);

      if (name && user) {
        user.name = name;
      }

      await user?.save();
      // await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! update user password
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler(`🚀 Please Enter The Old & New Password`, 400)
        );
      }

      const user = await userModel.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler(`🚀 Invalid User`, 400));
      }

      const isPasswordMatch = await user?.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new ErrorHandler(`🚀 Old Password Doesn't Matched`, 400));
      }

      user.password = newPassword;

      await user.save();

      // await redis.set(req.user?._id, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ! update profile picture || avatar
interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;
      const userId = req?.user?._id;
      const user = await userModel.findById(userId);

      if (avatar && user) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.url,
          };
        }
      }
      await user?.save();
      // await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ get all users --- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUserService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ update user role ---only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;

      updateUserRoleService(res, next, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ delete user ---only for admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await userModel.findById(id);

      if (!user) {
        return next(new ErrorHandler(`⚠️ User Not Found`, 404));
      } else {
        await user.deleteOne({ id });

        // ! delete user from redis also
        // await redis.del(id);

        res.status(200).json({
          success: true,
          message: `🚀 ${user.name} Your Account Is Deleted Successfully`,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// ~ delete items from cart
export const deleteCartItem = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params; // Destructure productId correctly

      const userId = req.user?._id;

      const user = await userModel.findById(userId);

      if (user) {
        const products = user.products;

        if (productId) {
          const productIndex = products.findIndex(
            (product: any) => product._id.toString() === productId
          ); // Convert to string and find index

          if (productIndex > -1) {
            // If product is found, remove it from the array
            products.splice(productIndex, 1);
            await user.save(); // Save the user document after removing the product

            res.status(200).json({
              success: true,
              message: "Product removed from cart successfully",
              // products: products,
            });
          } else {
            res.status(404).json({
              success: false,
              message: "Product not found in cart",
            });
          }
        } else {
          res.status(400).json({
            success: false,
            message: "No Product ID provided",
          });
        }
      } else {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
