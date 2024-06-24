import express from "express";
import {
  handleActivateUserAccount,
  handleCreateUser,
  handleGetCurrentUser,
  handleLoginUser,
  handleRefreshToken,
} from "../controllers/userController.js";
import { upload } from "../middlewares/multer.js";
import { isLoggedIn } from "../middlewares/authUser.js";
import {
  handleAddPost,
  handleDeletePost,
  handleEditPost,
  handleGetAllPosts,
  handleGetSinglePost,
} from "../controllers/postController.js";

export const apiRouter = express.Router();

//user router
apiRouter.post("/users/create-user", upload.single("avatar"), handleCreateUser);
apiRouter.get("/users/verify/:token", handleActivateUserAccount);
apiRouter.post("/users/auth-user-login", handleLoginUser);
apiRouter.get("/users/auth-manage-token", handleRefreshToken);
apiRouter.get("/users/find-current-user", isLoggedIn, handleGetCurrentUser);

//post router
apiRouter.post(
  "/posts/create-post",
  isLoggedIn,
  upload.single("postImage"),
  handleAddPost
);
apiRouter.get("/posts/get-all", handleGetAllPosts);
apiRouter.get("/posts/get-single/:postId", handleGetSinglePost);
apiRouter.delete("/posts/delete/:postId", isLoggedIn, handleDeletePost);
apiRouter.patch("/posts/edit/:postId", isLoggedIn, handleEditPost);
