const User = require("../models/User");
const bcrypt = require("bcrypt");

// GET USER BY ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

// Alias
const getCurrentUser = getUserById;

// GET ALL USERS (admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

// UPDATE PROFILE (firstName, lastName, phone, country, dateOfBirth)
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, country, dateOfBirth } = req.body;

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { firstName, lastName, phone, country, dateOfBirth } },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect." });

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN STATS
const getAdminStats = async (req, res) => {
  try {
    const Question = require("../models/Question");
    const totalUsers = await User.countDocuments();
    const totalAssessments = await Question.countDocuments();
    const indiaAssessments = await Question.countDocuments({ country: "India" });
    const usaAssessments = await Question.countDocuments({ country: "USA" });
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select("-password");

    res.status(200).json({
      totalUsers,
      totalAssessments,
      indiaAssessments,
      usaAssessments,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  getAdminStats,
};
