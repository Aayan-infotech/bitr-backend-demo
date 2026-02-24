import mongoose from 'mongoose';
import User from "../models/User.js";
import AssignUser from "../models/assignUserByInstructor.js";

export const getUsersByInstructorLocation = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ success: false, message: "Instructor not found" });
    }
    const users = await User.find({
      role: 'user',
      location: instructor.location,
      user_status: 1
    }).select('_id name profilePicture number email location').populate('location','location');

    const assignment = await AssignUser.findOne({ instructorId });
    const assignedUserIds = assignment ? assignment.userIds.map(id => id.toString()) : [];

    const responseUsers = users.map(user => ({
      ...user.toObject(),
      status: assignedUserIds.includes(user._id.toString()) ? 'Assigned' : 'UnAssigned'
    }));

    res.status(200).json({ success: true, users: responseUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const assignUsersToInstructor = async (req, res) => {
  try {
    const { instructorId} = req.params;
    const { userIds} = req.body;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    if (!Array.isArray(userIds) || userIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: "Invalid userIds" });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ success: false, message: "Instructor not found" });
    }

    const updatedAssignment = await AssignUser.findOneAndUpdate(
      { instructorId },
      { $set: { userIds } },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Users assigned successfully", data: updatedAssignment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const getInstructorTeam = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    const assignment = await AssignUser.findOne({ instructorId }).populate('userIds', '_id name email number profilePicture ');

    if (!assignment) {
      return res.status(200).json({ success: true, users: [] });
    }

    res.status(200).json({ success: true, users: assignment.userIds });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export default {
    getUsersByInstructorLocation,
    assignUsersToInstructor,
    getInstructorTeam
};