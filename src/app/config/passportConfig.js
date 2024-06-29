import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { usersCollection } from "../collections/collection.js";
import createError from "http-errors";
import {
  clientURL,
  googleClientID,
  googleClientSecret,
} from "../../../important.js";
import crypto from "crypto";

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientID,
      clientSecret: googleClientSecret,
      callbackURL: `${clientURL}/api/v2/users/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create a user in your database
        let user = await usersCollection.findOne({ googleId: profile?.id });

        if (!user) {
          const count = await usersCollection.countDocuments();
          const generateUserCode = crypto.randomBytes(16).toString("hex");
          const newUser = {
            user_id: count + 1 + "-" + generateUserCode,
            googleId: profile?.id || null,
            name: profile?.displayName || null,
            email: profile?.emails[0]?.value || null,
            avatar: { id: null, url: profile?.photos[0]?.value || null },
            role: "user",
            banned_user: false,
            email_verified: true,
            deleted_user: false,
            createdAt: new Date(),
          };

          const result = await usersCollection.insertOne(newUser);
          if (!result?.insertedId) {
            throw createError(400, "Something went wrong. Try again");
          }
          const userResult = await usersCollection.findOne({
            user_id: newUser?.user_id,
          });
          user = userResult;
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user?.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await usersCollection.findOne({ user_id: id });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
