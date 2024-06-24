import { postsCollection } from "../collections/collection.js";
import { uploadOnCloudinary } from "../helpers/cloudinary.js";
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
      3000
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
      createdBy: user?.user_id,
      createdAt: new Date(),
    };

    const result = await postsCollection.insertOne(newPost);
    console.log(result);

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

    let sortCriteria = { createdAt: 1 };

    const posts = await postsCollection
      .find(query)
      .sort(sortCriteria)
      .limit(limit)
      .skip((page - 1) * limit)
      .toArray();

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
      data: posts,
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
    // add view value
    await postsCollection.findOneAndUpdate(
      { post_id: result.post_id },
      { $inc: { views: 1 } }
    );

    res.status(200).send({
      success: true,
      message: "Post retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
