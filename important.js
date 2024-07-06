import "dotenv/config";

const port = process.env.PORT;
const mongoDB_URI = process.env.MONGODB_URI;

const jwtSecret = process.env.JWT_SECRET;
const jwtAccessToken = process.env.JWT_ACCESS_KEY;
const jwtRefreshToken = process.env.JWT_REFRESH_KEY;

const smtpUsername = process.env.SMTP_USERNAME;
const smtpPassword = process.env.SMTP_PASSWORD;

const clientURL = process.env.CLIENT_URL;
const frontEndURL = process.env.FRONT_END_URL;

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const sessionSecret = process.env.SESSION_SECRET;

export {
  port,
  mongoDB_URI,
  jwtSecret,
  jwtAccessToken,
  jwtRefreshToken,
  smtpUsername,
  smtpPassword,
  clientURL,
  frontEndURL,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  googleClientID,
  googleClientSecret,
  sessionSecret,
};
