import express from "express";
import {
  handleActivateUserAccount,
  handleCreateUser,
  handleGetCurrentUser,
  handleGoogleLogin,
  handleLoginUser,
  handleLogoutUser,
  handleRefreshToken,
} from "../controllers/userController.js";
import { upload } from "../middlewares/multer.js";
import { isLoggedIn } from "../middlewares/authUser.js";
import {
  handleAddLikeComment,
  handleAddPost,
  handleDeletePost,
  handleEditPost,
  handleGetAllPosts,
  handleGetSinglePost,
} from "../controllers/postController.js";
import passport from "../config/passportConfig.js";

export const apiRouter = express.Router();

//user router
apiRouter.post("/users/create-user", upload.single("avatar"), handleCreateUser);
apiRouter.get("/users/verify/:token", handleActivateUserAccount);
apiRouter.post("/users/auth-user-login", handleLoginUser);
apiRouter.post("/users/auth-user-logout", handleLogoutUser);
apiRouter.get("/users/auth-manage-token", handleRefreshToken);
apiRouter.post("/users/find-current-user", isLoggedIn, handleGetCurrentUser);

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
apiRouter.patch(
  "/posts/edit/add-like-comment/:postId",
  isLoggedIn,
  handleAddLikeComment
);

//google router
// google user
apiRouter.get(
  "/users/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

apiRouter.get(
  "/users/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: true }),
  handleGoogleLogin
);
