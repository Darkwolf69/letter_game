import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import expressMySQLSession from "express-mysql-session";
import createError from "http-errors";
import authRoutes from "./routes/auth.js";
import gameRoutes from "./routes/games.js";
import userRoutes from "./routes/users.js";

import initializePassport from "./strategies/local-strategy.js";

dotenv.config();

const cookieSecret = process.env.SESSION_SECRET;
if (!cookieSecret) {
  throw new Error("SESSION_SECRET is not defined");
}

const options = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

const MySQLStore = expressMySQLSession(session);
const sessionStore = new MySQLStore(options);

const app = express();

app.use(
  cors({
    origin: `http://localhost:${process.env.FRONTEND_PORT}`,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  session({
    secret: cookieSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
    },
    store: sessionStore,
  }),
);

sessionStore
  .onReady()
  .then(() => {
    console.log("A MySQL session store készen áll");

    app.listen(process.env.EXPRESS_PORT, () => {
      console.log(
        `A szerver fut a következő porton: ${process.env.EXPRESS_PORT}`,
      );
    });
  })
  .catch((e) => {
    console.error("A MySQL session store nem indult el:", e);
    process.exit(1);
  });

initializePassport(passport);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/users", userRoutes);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    message:
      statusCode === 404
        ? "A keresett backend endpoint nem található."
        : "Hiba történt a backenden!",
    detail: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});
