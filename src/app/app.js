import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import createError from "http-errors";
import { rateLimit } from "express-rate-limit";
import UAParser from "ua-parser-js";
import session from "express-session";
import passport from "./config/passportConfig.js";
import { apiRouter } from "./routers/router.js";
import { sessionSecret } from "../../important.js";

const app = express();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res
      .status(429)
      .json({ success: false, message: "Too many requests, try again later." });
  },
});

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://thoughts-app-v1.web.app"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// google
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// routes
app.use("/api/v2", apiRouter);

app.get("/", (req, res) => {
  const userAgent = req.headers["user-agent"];
  const parser = new UAParser();
  const result = parser.setUA(userAgent).getResult();

  // Extract browser and device information
  const browser = result?.browser?.name
    ? result?.browser?.name
    : result?.ua || "Unknown";
  const device = userAgent?.includes("Mobile") ? "Mobile" : "Desktop";
  const os = { name: result?.os?.name, version: result?.os?.version };
  res.status(200).send({
    success: true,
    message: "Server is running",
    browser: browser,
    device: device,
    operatingSystem: os,
  });
});

//client error handling
app.use((req, res, next) => {
  createError(404, "Route not found!");
  next();
});

//server error handling
app.use((err, req, res, next) => {
  return res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
});

export default app;
