import { postsCollection, usersCollection } from "../collections/collection.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../helpers/cloudinary.js";
import { requiredField } from "../helpers/requiredField.js";
import { validateString } from "../helpers/validateString.js";
import crypto from "crypto";
import createError from "http-errors";

export const handleAddPost = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { post_description } = req.body;
  const bufferFile = req.file?.buffer;

  try {
    if (!user) {
      throw createError(400, "User not found. Login again");
    }

    requiredField(post_description, "Post description is required");

    const processedPost = validateString(
      post_description,
      "Post description",
      2,
      30000
    );

    const generateCode = crypto.randomBytes(16).toString("hex");

    let uploadedPostImage = null;
    if (bufferFile) {
      uploadedPostImage = await uploadOnCloudinary(bufferFile);

      if (!uploadedPostImage?.public_id) {
        throw createError(500, "Something went wrong. Image not uploaded");
      }
    }

    const newPost = {
      post_id: generateCode,
      post_image: {
        id: uploadedPostImage?.public_id ? uploadedPostImage?.public_id : "",
        url: uploadedPostImage?.url ? uploadedPostImage?.url : "",
      },
      post_description: processedPost,
      post_additional: {
        likes: [],
      },
      restricted: false,
      views: 0,
      createdBy: user?.user_id,
      createdAt: new Date(),
    };

    const result = await postsCollection.insertOne(newPost);
    if (!result?.insertedId) {
      throw createError(500, "Post not added, Try again");
    }

    res.status(200).send({
      success: true,
      message: "Post added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetAllPosts = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit);

    const regExSearch = new RegExp(".*" + search + ".*", "i");

    let query;

    if (search) {
      query = {
        $or: [{ post_description: regExSearch }, { post_id: regExSearch }],
      };
    } else {
      query = {};
    }

    let sortCriteria = { createdAt: -1 };

    const posts = await postsCollection
      .find(query)
      .sort(sortCriteria)
      .limit(limit)
      .skip((page - 1) * limit)
      .toArray();

    // Get unique user IDs from the posts
    const userIds = [...new Set(posts.map((post) => post.createdBy))];

    // Retrieve user data for the unique user IDs, selecting only the name and avatar fields using projection
    const users = await usersCollection
      .find(
        { user_id: { $in: userIds } },
        { projection: { name: 1, avatar: 1, user_id: 1 } }
      )
      .toArray();

    // Create a map of user data
    const userMap = users.reduce((map, user) => {
      map[user.user_id] = {
        name: user.name,
        avatar: user.avatar,
      };
      return map;
    }, {});

    // every single post with who created
    const postsWithUser = posts.map((post) => {
      return {
        ...post,
        user_info: userMap[post.createdBy] || null,
      };
    });

    const count = await postsCollection.countDocuments(query);

    res.status(200).send({
      success: true,
      message: "Posts retrieved successfully",
      data_found: count,
      pagination: {
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        previousPage: page - 1 > 0 ? page - 1 : null,
        nextPage: page + 1 <= Math.ceil(count / limit) ? page + 1 : null,
      },
      data: postsWithUser,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetSinglePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    if (postId?.length < 32) {
      throw createError(400, "Invalid id");
    }

    const result = await postsCollection.findOne({ post_id: postId });
    if (!result) {
      throw createError(404, "Post not found");
    }

    const postOwner = await usersCollection.findOne(
      {
        user_id: result?.createdBy,
      },
      { projection: { name: 1, avatar: 1, _id: 0 } }
    );

    // add view value
    await postsCollection.findOneAndUpdate(
      { post_id: result.post_id },
      { $inc: { views: 1 } }
    );

    res.status(200).send({
      success: true,
      message: "Post retrieved successfully",
      data: { user_info: postOwner, ...result },
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeletePost = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { postId } = req.params;
  try {
    if (!user) {
      throw createError(400, "User not found. Login again");
    }
    if (postId?.length < 32) {
      throw createError(400, "Invalid id");
    }
    let query;
    if (user.role === "admin") {
      query = { post_id: postId };
    } else {
      query = { post_id: postId, createdBy: user?.user_id };
    }

    const existingPost = await postsCollection.findOne(query);
    if (!existingPost) {
      throw createError(404, "Post not found");
    }

    if (existingPost?.post_image?.id) {
      const removeImage = await deleteFromCloudinary(
        existingPost?.post_image?.id
      );

      if (removeImage?.result != "ok") {
        throw createError(500, "Something went wrong try again");
      }
    }

    const result = await postsCollection.findOneAndDelete({ post_id: postId });

    if (!result) {
      throw createError(500, "Failed to delete the post");
    }

    res.status(200).send({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    next(error);
  }
};

export const handleEditPost = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { postId } = req.params;
  const { post_description } = req.body;
  try {
    if (!user) {
      throw createError(400, "User not found. Login again");
    }

    if (postId?.length < 32) {
      throw createError(400, "Invalid id");
    }
    requiredField(post_description, "Post description is required");
    const processedPost = validateString(
      post_description,
      "Post description",
      2,
      3000
    );

    let query = { post_id: postId, createdBy: user?.user_id };

    const existingPost = await postsCollection.findOne(query);
    if (!existingPost) {
      throw createError(404, "Post not found");
    }

    if (processedPost == existingPost?.post_description) {
      throw createError(400, "Nothing to edit");
    }

    const updatedResult = await postsCollection.findOneAndUpdate(
      { post_id: postId },
      { $set: { post_description: processedPost } },
      { returnDocument: "after" }
    );

    res.status(200).send({
      success: true,
      message: "Post edited",
      data: updatedResult,
    });
  } catch (error) {
    next(error);
  }
};

export const handleAddLike = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { postId } = req.params;
  const { like } = req.body;

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

    const existingLikeIndex = existingPost?.post_additional?.likes?.findIndex(
      (likeEntry) => likeEntry?.user_id === user?.user_id
    );

    if (existingLikeIndex !== -1 && like === true) {
      // Remove like if exists and like is false
      await postsCollection.updateOne(
        { post_id: postId },
        { $pull: { "post_additional.likes": { user_id: user?.user_id } } }
      );
    } else if (existingLikeIndex === -1 && like === true) {
      // Add like if not exists and like is true
      const generateCode = crypto.randomBytes(6).toString("hex");
      const likeEntry = {
        id: generateCode,
        user_id: user?.user_id,
        name: existingUser?.name,
        avatar: existingUser?.avatar,
      };

      await postsCollection.updateOne(
        { post_id: postId },
        { $push: { "post_additional.likes": likeEntry } }
      );
    }

    res.status(200).send({
      success: true,
      message: "Like/comment added/removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
