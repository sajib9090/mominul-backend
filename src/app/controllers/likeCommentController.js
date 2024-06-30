import {
  likeCommentCollection,
  postsCollection,
  usersCollection,
} from "../collections/collection.js";
import { requiredField } from "../helpers/requiredField.js";
import { validateString } from "../helpers/validateString.js";
import crypto from "crypto";
import createError from "http-errors";

export const handleAddComment = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { postId } = req.params;
  const { comment } = req.body;
  try {
    if (!user) {
      throw createError(400, "User not found. Please login");
    }

    const existingUser = await usersCollection.findOne(
      { user_id: user?.user_id },
      { projection: { name: 1, avatar: 1, _id: 0 } }
    );

    if (postId?.length < 32) {
      throw createError(400, "Invalid post ID");
    }

    const existingPost = await postsCollection.findOne({ post_id: postId });
    if (!existingPost) {
      throw createError(404, "Post not found");
    }

    await postsCollection.updateOne(
      { post_id: postId },
      { $inc: { views: 1 } }
    );

    requiredField(comment, "Comment is required");
    const processedComment = validateString(comment, "Comment", 2, 300);

    const generateCode = crypto.randomBytes(6).toString("hex");

    const commentEntry = {
      post_id: existingPost?.post_id,
      id: generateCode,
      comment: processedComment,
      user_id: user?.user_id,
      name: existingUser?.name,
      avatar: existingUser?.avatar,
      createdAt: new Date(),
    };

    const addComment = await likeCommentCollection.insertOne(commentEntry);
    if (!addComment?.insertedId) {
      throw createError(500, "Comment not added. Try again");
    }

    await postsCollection.updateOne(
      { post_id: postId },
      { $inc: { total_comment: 1 } }
    );
    res.status(200).send({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetCommentByPost = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { postId } = req.params;
  try {
    if (!user) {
      throw createError(400, "User not found. Please login");
    }

    if (postId?.length < 32) {
      throw createError(400, "Invalid post ID");
    }

    const existingPost = await postsCollection.findOne(
      { post_id: postId },
      { projection: { post_id: 1 } }
    );
    if (!existingPost) {
      throw createError(404, "Post not found");
    }

    await postsCollection.updateOne(
      { post_id: postId },
      { $inc: { views: 1 } }
    );

    const comments = await likeCommentCollection
      .find({ post_id: postId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Post comment retrieved successfully",
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};
