import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import expressMySQLSession from "express-mysql-session";
import path from "path";
import createError from "http-errors";
import authRoutes from "./routes/auth.ts";

import initializePassport from "./strategies/local-strategy.ts";

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
    // MySQL session store készen áll
    console.log("A MySQL session store készen áll");
  })
  .catch((e) => {
    console.error(e);
  });

app.use(express.json());
app.use(cookieParser());

initializePassport(passport);

app.use(
  cors({
    origin: `http://localhost:${process.env.FRONTEND_PORT}`,
    credentials: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", authRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("Hiba történt a backenden!");
  res.render("error");
});

app.listen(process.env.EXPRESS_PORT, () => {
  console.log(`A szerver fut a következő porton: ${process.env.EXPRESS_PORT}`);
});
