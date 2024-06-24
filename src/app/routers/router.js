import express from "express";
import {
  handleActivateUserAccount,
  handleCreateUser,
  handleLoginUser,
  handleRefreshToken,
} from "../controllers/userController.js";

export const apiRouter = express.Router();

//user router
apiRouter.post("/users/create-user", handleCreateUser);
apiRouter.get("/users/verify/:token", handleActivateUserAccount);
apiRouter.post("/users/auth-user-login", handleLoginUser);
apiRouter.get("/users/auth-manage-token", handleRefreshToken);
