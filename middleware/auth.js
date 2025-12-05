const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "Access denied, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // menaruh payload JWT di req.user
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;
