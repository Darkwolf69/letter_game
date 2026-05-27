import express from "express";
import { getUserByName } from "../service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    const username = req.query.username as string;
    const user = await getUserByName(username);
    res.json(user);
  } else {
    return res.status(401).send({ msg: "Sikertelen azonosítás!" });
  }
});

export default router;
