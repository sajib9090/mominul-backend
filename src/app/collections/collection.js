import { client } from "../config/db.js";

const db_name = "social-connection";

export const usersCollection = client.db(db_name).collection("users");
export const postsCollection = client.db(db_name).collection("posts");
export const commentsCollection = client.db(db_name).collection("comments");

//hdh