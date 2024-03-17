// ! all find of services related to the user

import { NextFunction, Response } from "express";
// import { redis } from "../utils/redis";
import userModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";

// ! get user by ID
export const getUserById = async (id: string, res: Response) => {
  // const userJson = await redis.get(id);

  const user = await userModel.findById(id);

  if (user) {
    res.status(201).json({
      success: true,
      user,
    });
  }
  // if (userJson) {
  //   const user = JSON.parse(userJson);
  //   res.status(201).json({
  //     success: true,
  //     user,
  //   });
  // }
};

// ~ get all users
export const getAllUserService = async (res: Response) => {
  const users = await userModel.find().sort({ createdAt: 1 });
  res.status(201).json({
    success: true,
    users,
  });
};

// ~ update user role
export const updateUserRoleService = async (
  res: Response,
  next: NextFunction,
  id: string,
  role: string
) => {
  const user = await userModel.findById(id);
  if (!user) {
    return next(new ErrorHandler(`⚠️ User Not Found`, 404));
  } else {
    const newUser = await userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    );
    res.status(201).json({
      success: true,
      newUser,
    });
  }
};
