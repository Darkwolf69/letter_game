import { Strategy } from "passport-local";
import bcrypt from "bcrypt";
import { getUserByEmail } from "../service.js";
import type { PassportStatic } from "passport";

export default function initialize(passport: PassportStatic) {
  passport.use(
    new Strategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const foundUser = await getUserByEmail(email);

        if (!foundUser) {
          return done(null, false, {
            message: "Felhasználónév vagy jelszó nem egyezik!",
          });
        }

        const passwordIsValid = await bcrypt.compare(
          password,
          foundUser.password,
        );

        if (!passwordIsValid) {
          return done(null, false, {
            message: "Felhasználónév vagy jelszó nem egyezik!",
          });
        }

        return done(null, {
          id: foundUser.id,
          email: foundUser.email,
          username: foundUser.username,
        });
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.email);
  });

  passport.deserializeUser(async (email, done) => {
    try {
      const user = await getUserByEmail(email as string);

      if (!user) {
        return done(null, false);
      }

      return done(null, {
        id: user.id,
        email: user.email,
        username: user.username,
      });
    } catch (err) {
      return done(err);
    }
  });
}
