import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { getUserByEmail, getUserByName, createUser } from "../service.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  const foundUserByEmail = await getUserByEmail(email);
  const foundUserByName = await getUserByName(username);
  if (foundUserByEmail || foundUserByName) {
    return res.status(400).json({ msg: "A megadott felhasználó már létezik!" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const createdUser = await createUser(username, email, hashed);
  if (createdUser) {
    res.json({ msg: "Felhasználó létrehozása sikeres!" });
  } else {
    res.json({ msg: "Felhasználó létrehozása sikertelen!" });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: Error | null, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ msg: "Általános szerver hiba!" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ msg: info?.message ?? "Bejelentkezés sikertelen!" });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ msg: "Szerver hiba (session)!" });
      }
      return res.sendStatus(200);
    });
  })(req, res, next);
});

router.get("/me", async (req, res) => {
  console.log("Session az autentikációkor:\n", req.session);
  console.log("Session id az autentikációkor:\n", req.sessionID);
  req.sessionStore.get(req.session.id, (err, sessionData) => {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log("Session adatok:\n", sessionData);
  });

  req.session.visited = true;

  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Sikertelen azonosítás!" });
  }

  const foundUser = await getUserByEmail(req.user.email);

  if (!foundUser) {
    return res.status(404).json({ message: "Felhasználó nem található!" });
  }

  return res.json({
    user: {
      userId: foundUser.id,
      username: foundUser.username,
    },
  });
});

router.post("/logout", (req, res) => {
  req.logout((e) => {
    if (e) {
      return res.status(500).json({ message: "Sikertelen kijelentkezés!" });
    }

    res.json({ message: "Kijelentkezés sikeres" });
  });
});

// router.post("/change-username", async (req, res) => {
//   if (!req.isAuthenticated()) {
//     return res.status(401).json({ msg: "Sikertelen azonosítás!" });
//   }

//   const { oldUsername, newUsername } = req.body;

//   try {
//     const user = await getUserByEmail(req.session.passport.user);

//     if (!user) {
//       return res.status(404).json({ msg: "A felhasználó nem található!" });
//     }

//     if (user.username !== oldUsername) {
//       return res
//         .status(400)
//         .json({ msg: "A régi felhasználónév nem egyezik!" });
//     }

//     if (
//       oldUsername === newUsername ||
//       oldUsername.trim() === newUsername.trim()
//     ) {
//       return res
//         .status(400)
//         .json({ msg: "Az új felhasználónév nem egyezhet meg a régivel!" });
//     }

//     const existingUser = await getUserByName(newUsername.trim());
//     if (existingUser) {
//       return res
//         .status(409)
//         .json({ msg: "A megadott felhasználónév foglalt!" });
//     }

//     if (!newUsername || !newUsername.trim()) {
//       return res
//         .status(400)
//         .json({ msg: "Az új felhasználónév nem lehet üres!" });
//     }

//     const updated = await changeUsername(user.id, newUsername);
//     return res
//       .status(200)
//       .json({ msg: "Felhasználónév módosítva!", user: updated });
//   } catch (e) {
//     return res.status(500).json({
//       msg:
//         "Szerver hiba történt a felhasználónév módosítás során: " + e.message,
//     });
//   }
// });

// router.post("/change-password", async (req, res) => {
//   if (!req.isAuthenticated()) {
//     return res.status(401).json({ msg: "Sikertelen azonosítás!" });
//   }

//   const { oldPassword, newPassword } = req.body;
//   try {
//     const user = await getUserByEmail(req.session.passport.user);
//     if (!user) {
//       return res.status(404).json({ msg: "A felhasználó nem található!" });
//     }

//     if (!req.user.password) {
//       return res.status(403).json({
//         msg: "Google-fiókkal bejelentkezett felhasználó nem módosíthat jelszót.",
//       });
//     }

//     if (!(await bcrypt.compare(String(oldPassword), String(user.password)))) {
//       return res.status(403).json({ msg: "Érvénytelen régi jelszó!" });
//     }

//     const hashed = await bcrypt.hash(newPassword, 10);
//     const updated = await changePassword(user.id, hashed);

//     return res.status(200).json({ msg: "Jelszó módosítva!", user: updated });
//   } catch (e) {
//     return res.status(500).json({
//       msg: "Szerver hiba történt a jelszó módosítás során: " + e.message,
//     });
//   }
// });

export default router;
