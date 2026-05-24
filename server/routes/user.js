const express = require("express");
const users = require("../controllers/user.js");

const router = express.Router();

// GET user by ID
router.get("/getUser/:id", users.getUserById);

// GET all users
router.get("", users.getAllUsers);

// UPDATE profile
router.put("/updateProfile/:id", users.updateProfile);

// CHANGE password
router.put("/changePassword/:id", users.changePassword);

// ADMIN stats
router.get("/admin/stats", users.getAdminStats);

module.exports = router;
