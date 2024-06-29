import createError from "http-errors";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { jwtAccessToken } from "../../../important.js";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many bad request, try again later.",
    });
  },
});

export const isLoggedIn = async (req, res, next) => {
  try {
    const incomingToken =
      req.headers.authorization || req.headers.Authorization;

    if (!incomingToken) {
      throw createError(401, "Key not found. Please Login First");
    }

    const token = incomingToken.split(" ")[1];

    if (!token) {
      throw createError(401, "Token not found. Please Login First");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, jwtAccessToken);
    } catch (error) {
      throw createError(401, "Unauthorized. Key expired");
    }

    if (!decoded) {
      throw createError(403, "Failed to authenticate. Please login");
    }

    req.user = decoded;

    next();
  } catch (error) {
    return next(error);
  }
};
