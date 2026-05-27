import express, { Request, Response } from "express";
var router = express.Router();

/* GET users listing. */
router.get("/", function (req: Request, res: Response, next: Function) {
  res.send("respond with a resource");
});

module.exports = router;
