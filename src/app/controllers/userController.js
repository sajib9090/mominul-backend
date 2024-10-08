import createError from "http-errors";
import { usersCollection } from "../collections/collection.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { requiredField } from "../helpers/requiredField.js";
import { validateString } from "../helpers/validateString.js";
import { duplicateChecker } from "../helpers/duplicateEmailChecker.js";
import createJWT from "../helpers/createJWT.js";
import {
  clientURL,
  frontEndURL,
  jwtAccessToken,
  jwtRefreshToken,
  jwtSecret,
} from "../../../important.js";
import { emailWithNodeMailer } from "../helpers/email.js";
import { uploadOnCloudinary } from "../helpers/cloudinary.js";

export const handleCreateUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  const bufferFile = req.file?.buffer;

  try {
    requiredField(name, "Name is required");
    requiredField(email, "Email is required");
    requiredField(password, "Password is required");

    const processedName = validateString(name, "Name", 3, 30);
    const processedEmail = email?.toLowerCase();

    if (!validator.isEmail(processedEmail)) {
      throw createError(400, "Invalid email address");
    }
    await duplicateChecker(
      usersCollection,
      "email",
      processedEmail,
      "Email already exists. Please login"
    );

    const trimmedPassword = password.replace(/\s/g, "");
    if (trimmedPassword.length < 8 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 8 characters long and not more than 30 characters long"
      );
    }

    if (!/[a-z]/.test(trimmedPassword) || !/\d/.test(trimmedPassword)) {
      throw createError(
        400,
        "Password must contain at least one letter (a-z) and one number"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    const count = await usersCollection.countDocuments();
    const generateUserCode = crypto.randomBytes(16).toString("hex");

    let uploadedAvatar = null;
    if (bufferFile) {
      uploadedAvatar = await uploadOnCloudinary(bufferFile);

      if (!uploadedAvatar?.public_id) {
        throw createError(500, "Something went wrong. Avatar not uploaded");
      }
    }

    const newUser = {
      user_id: count + 1 + "-" + generateUserCode,
      name: processedName,
      avatar: {
        id: uploadedAvatar?.public_id || null,
        url: uploadedAvatar?.url || null,
      },
      email: processedEmail,
      password: hashedPassword,
      role: "user",
      banned_user: false,
      deleted_user: false,
      email_verified: false,
      createdAt: new Date(),
    };
    const token = await createJWT(
      {
        user_id: count + 1 + "-" + generateUserCode,
      },
      jwtSecret,
      "5m"
    );

    const userResult = await usersCollection.insertOne(newUser);

    if (!userResult?.insertedId) {
      throw createError(500, "Can't create user try again");
    }

    //prepare email
    const emailData = {
      email,
      subject: "Account Creation Confirmation",
      html: `<h2 style="text-transform: capitalize;">Hello ${processedName}!</h2>
      <p>Please click here to <a href="${clientURL}/api/v2/users/verify/${token}">activate your account</a></p>
      <p>This link will expires in 5 minutes</p>`,
    };

    // send email with nodemailer
    try {
      await emailWithNodeMailer(emailData);
    } catch (emailError) {
      next(createError(500, "Failed to send verification email"));
    }

    res.status(200).send({
      success: true,
      message: `Please go to your email at- ${email} and complete registration process`,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetAllUser = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit);
    const regExSearch = new RegExp(".*" + search + ".*", "i");
    if (!user) {
      throw createError(400, "User not found. Login again");
    }

    if (user?.role !== "admin") {
      throw createError(403, "Forbidden access only admin can access");
    }

    let query;

    if (search) {
      query = {
        $or: [
          { username: regExSearch },
          { email: regExSearch },
          { name: regExSearch },
        ],
      };
    } else {
      query = {};
    }

    let sortCriteria = { email: 1 };
    const users = await usersCollection
      .find(query)
      .sort(sortCriteria)
      .limit(limit)
      .skip((page - 1) * limit)
      .toArray();

    const count = await usersCollection.countDocuments(query);

    res.status(200).send({
      success: true,
      message: "Users retrieved successfully",
      data_found: count,
      pagination: {
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        previousPage: page - 1 > 0 ? page - 1 : null,
        nextPage: page + 1 <= Math.ceil(count / limit) ? page + 1 : null,
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const handleActivateUserAccount = async (req, res, next) => {
  const token = req.params.token;
  try {
    if (!token) {
      throw createError(404, "Credential not found");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded) {
      throw createError(404, "Invalid credential");
    }

    const existingUser = await usersCollection.findOne({
      user_id: decoded.user_id,
    });

    if (!existingUser) {
      throw createError(404, "User not found. Try again");
    }

    if (existingUser.email_verified) {
      return res.redirect(`${frontEndURL}/login`);
    }

    const updateUser = await usersCollection.updateOne(
      { user_id: existingUser.user_id },
      {
        $set: {
          email_verified: true,
        },
      }
    );

    if (updateUser.modifiedCount === 0) {
      throw createError(500, "Something went wrong. Please try again");
    }

    return res.redirect(`${frontEndURL}/login`);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.redirect(`${frontEndURL}/expired-credentials`);
    }
    next(error);
  }
};

export const handleLoginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw createError(400, "Email and password are required");
    }

    const stringData = email?.trim().replace(/\s+/g, "").toLowerCase();

    if (!validator.isEmail(stringData)) {
      throw createError(400, "Invalid email address");
    }

    const trimmedPassword = password.replace(/\s/g, "");

    if (trimmedPassword.length < 8 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 8 characters long and not more than 30 characters long"
      );
    }

    if (!/[a-z]/.test(trimmedPassword) || !/\d/.test(trimmedPassword)) {
      throw createError(
        400,
        "Password must contain at least one letter (a-z) and one number"
      );
    }

    // check user exist ot not
    const user = await usersCollection.findOne({ email: stringData });

    if (!user) {
      return next(createError.BadRequest("Invalid email or password"));
    }

    // Match password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(createError.Unauthorized("Invalid email or password"));
    }

    // check email verified or not
    if (!user?.email_verified) {
      const token = await createJWT(
        {
          user_id: user.user_id,
        },
        jwtSecret,
        "5m"
      );

      const email = user?.email;
      const emailData = {
        email,
        subject: "Account Creation Confirmation",
        html: `<h2 style="text-transform: capitalize;">Hello ${user?.name}!</h2>
        <p>Please click here to <a href="${clientURL}/api/v2/users/verify/${token}">activate your account</a></p>
        <p>This link will expire in 5 minutes</p>`,
      };

      try {
        await emailWithNodeMailer(emailData);
      } catch (emailError) {
        return next(createError(500, "Failed to send verification email"));
      }

      return next(
        createError.Unauthorized(
          `You are not verified. Please check your email at- ${user.email} and verify your account.`
        )
      );
    }

    // check user band or not
    if (user.banned_user) {
      return next(
        createError.Unauthorized("You are banned. Please contact authority")
      );
    }

    // check user removed or not
    if (user.deleted_user) {
      return next(
        createError.Unauthorized("You are deleted. Please contact authority")
      );
    }
    const loggedInUser = {
      user_id: user.user_id,
      role: user.role,
    };

    const userObject = { ...loggedInUser };

    const accessToken = await createJWT(userObject, jwtAccessToken, "10m");

    const refreshToken = await createJWT(userObject, jwtRefreshToken, "7d");
    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).send({
      success: true,
      message: "User logged in successfully",
      data: userObject,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleLogoutUser = async (req, res, next) => {
  try {
    const options = {
      httpOnly: true,
      secure: true,
    };
    // console.log(req.user);
    // res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
    res.status(200).send({
      success: true,
      message: "User logout successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleRefreshToken = async (req, res, next) => {
  const oldRefreshToken = req.cookies.refreshToken;
  try {
    if (!oldRefreshToken) {
      throw createError(404, "Refresh token not found. Login first");
    }
    //verify refresh token
    const decodedToken = jwt.verify(oldRefreshToken, jwtRefreshToken);

    if (!decodedToken) {
      throw createError(401, "Invalid refresh token. Please Login");
    }

    // if token validation success generate new access token
    const accessToken = await createJWT(
      { user: decodedToken },
      jwtAccessToken,
      "10m"
    );
    // Update req.user with the new decoded user information
    req.user = decodedToken.user;

    res.status(200).send({
      success: true,
      message: "New access token generate successfully",
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleReUploadUserAvatar = async (req, res, next) => {
  try {
    res.status(200).send({
      success: true,
      message: "Avatar changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetCurrentUser = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  try {
    if (!user) {
      throw createError(400, "User not found. Login again");
    }

    const currentUser = await usersCollection.findOne({
      user_id: user?.user_id,
    });

    if (currentUser) {
      delete currentUser.password;
    }

    res.status(200).send({
      success: true,
      message: "Current user retrieved successfully",
      data: currentUser,
    });
  } catch (error) {
    next(error);
  }
};

// google controller
export const handleGoogleLogin = async (req, res, next) => {
  const user = req.user;
  console.log(user);
  try {
    if (!user?.googleId) {
      return res.redirect(`${frontEndURL}/login`);
    }

    if (user?.banned_user) {
      return next(
        createError.Unauthorized("You are banned. Please contact authority")
      );
    }

    // check user removed or not
    if (user?.deleted_user) {
      return next(
        createError.Unauthorized("You are deleted. Please contact authority")
      );
    }

    const loggedInUser = {
      user_id: user?.user_id,
      role: user?.role,
    };

    const userObject = { ...loggedInUser };

    const accessToken = await createJWT(userObject, jwtAccessToken, "10m");

    const refreshToken = await createJWT(userObject, jwtRefreshToken, "7d");
    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).send({
      success: true,
      message: "Google login successfully",
      data: userObject,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGoogleLoginFailure = (req, res, next) => {
  try {
    const errorMessage =
      req.session.messages[0] || "Authentication failed. Please try again.";

    res.status(200).send({
      message: errorMessage,
    });
  } catch (error) {
    next(error);
  }
};
