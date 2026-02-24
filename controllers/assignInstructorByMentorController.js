import User from "../models/User.js";
import AssignUser from "../models/assignUserByInstructor.js";
import AssignInstructor from "../models/assignInstructorByMentor.js";
import mongoose from "mongoose";

export const getInstructorByMentorLocation = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ success: false, message: "Invalid mentorId" });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }
    const instructors = await User.find({
      role: 'instructor', 
      location: mentor.location
    }).select('_id name profilePicture number email location').populate('location','location');

    const assignment = await AssignInstructor.findOne({ mentorId });

    const assignedInstructorIds = assignment
      ? assignment.instructors.map(i => i.instructorId.toString())
      : [];

    const responseInstructors = instructors.map(inst => ({
      ...inst.toObject(),
      status: assignedInstructorIds.includes(inst._id.toString()) ? 'Assigned' : 'UnAssigned'
    }));

    res.status(200).json({ success: true, instructors: responseInstructors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const getUsersOfInstructorTeam = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    // Fetch instructor to get location
    const instructor = await User.findById(instructorId).select('location');
    if (!instructor) {
      return res.status(404).json({ success: false, message: "Instructor not found" });
    }

    const assignRecord = await AssignUser.findOne({ instructorId });

    if (!assignRecord || !assignRecord.userIds.length) {
      return res.status(200).json({ success: true, users: [] });
    }

    const userIds = assignRecord.userIds.map(id => id.toString());

    // Filter users by both IDs and same location as instructor
    const users = await User.find({ 
      _id: { $in: userIds },
      location: instructor.location  // Filter users with same location as instructor
    })
      .select('_id name email number profilePicture location')
      .populate('location', 'location');

    // Find assigned user IDs among mentors assignments (unchanged)
    const allMentorRecords = await AssignInstructor.find({
      'instructors.instructorId': instructorId
    });

    let assignedUserSet = new Set();

    allMentorRecords.forEach(record => {
      const instructorEntry = record.instructors.find(i => i.instructorId.toString() === instructorId);
      if (instructorEntry) {
        instructorEntry.userIds.forEach(uid => assignedUserSet.add(uid.toString()));
      }
    });

    const responseUsers = users.map(user => ({
      ...user.toObject(),
      status: assignedUserSet.has(user._id.toString()) ? "Assigned" : "UnAssigned"
    }));

    res.status(200).json({ success: true, users: responseUsers });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



export const assignUsersUnderInstructorByMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { instructors } = req.body;

    // Validate instructors array presence (but allow empty array)
    if (!Array.isArray(instructors)) {
      return res.status(400).json({ success: false, message: "Instructors array must be provided" });
    }

    if (instructors.length > 0) {
      const instructorIdSet = new Set();
      for (const entry of instructors) {
        if (!mongoose.Types.ObjectId.isValid(entry.instructorId)) {
          return res.status(400).json({ success: false, message: "Invalid instructorId in request" });
        }

        if (instructorIdSet.has(entry.instructorId)) {
          return res.status(400).json({ success: false, message: `Duplicate instructorId found: ${entry.instructorId}` });
        }
        instructorIdSet.add(entry.instructorId);

        if (!Array.isArray(entry.userIds) || entry.userIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
          return res.status(400).json({ success: false, message: "Invalid userIds for instructor" });
        }

        const instructor = await User.findById(entry.instructorId);
        if (!instructor || instructor.role !== 'instructor') {
          return res.status(404).json({ success: false, message: `Instructor not found: ${entry.instructorId}` });
        }
      }
    }

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }

    const updatedAssignment = await AssignInstructor.findOneAndUpdate(
      { mentorId },
      { $set: { instructors } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Instructor-user assignments updated successfully",
      data: updatedAssignment
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const getMentorTeam = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ success: false, message: "Invalid mentorId" });
    }

    const assignment = await AssignInstructor.findOne({ mentorId });

    if (!assignment) {
      return res.status(404).json({ success: false, message: "No assigned Instructors or users found for this mentor" });
    }

    const response = [];

    for (const instructor of assignment.instructors) {
      const instructorData = await User.findById(instructor.instructorId)
        .select('_id name profilePicture number email');

      const usersData = await User.find({
        _id: { $in: instructor.userIds },
        user_status: 1 
      }).select('_id name profilePicture number email');

      response.push({
        instructor: instructorData,
        users: usersData
      });
    }

    return res.status(200).json({
      success: true,
      mentorId,
      team: response
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const getUsersUnderMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ success: false, message: "Invalid mentorId" });
    }

    const assignment = await AssignInstructor.findOne({ mentorId });

    if (!assignment) {
      return res.status(404).json({ success: false, message: "No assignments found for this mentor." });
    }

    // Aggregate all userIds from all instructors
    const allUserIds = assignment.instructors.reduce((acc, instructor) => {
      return acc.concat(instructor.userIds.map(id => id.toString()));
    }, []);

    // Remove duplicates
    const uniqueUserIds = [...new Set(allUserIds)];

    if (uniqueUserIds.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $in: uniqueUserIds },
    }).select('_id name profilePicture number email location');

    return res.status(200).json({
      success: true,
      mentorId,
      users
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export default {
    getInstructorByMentorLocation,
    getUsersOfInstructorTeam,
    assignUsersUnderInstructorByMentor,
    getMentorTeam,
    getUsersUnderMentor
};