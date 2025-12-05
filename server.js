const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());

// Routes
const vpnRoutes = require("./routes/vpnRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/usersRoutes");
const profileRoutes = require("./routes/profileRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vpn", vpnRoutes);
app.use("/api/profile", profileRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
