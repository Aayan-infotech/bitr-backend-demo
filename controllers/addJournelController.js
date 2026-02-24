import mongoose from "mongoose";
import Journel from '../models/addJournelModel.js';
import ClassesAdmin from '../models/classesAdminModel.js';
import AssignInstructor from '../models/assignInstructorByMentor.js';
import AssignUser from "../models/assignUserByInstructor.js";
import User from '../models/User.js';



export const createJournal = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, title1, description1, title2, description2, shareWith = ['Private'] } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid classId or userId" });
    }

    const updatedJournal = await Journel.findOneAndUpdate(
      { classId, userId },
      {
        title1,
        description1,
        title2,
        description2,
        shareWith
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: "Journal saved successfully",
      data: updatedJournal
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getJournalsByClassId = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const journals = await Journel.find({
      classId,
      shareWith: { $ne: 'Private' }
    })
    .populate('userId', 'name email')
    .lean();

    res.status(200).json({ success: true, data: journals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getJournalsByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }

    const assignDoc = await AssignUser.findOne({ instructorId }).lean();
    const assignedUserIds = assignDoc ? assignDoc.userIds : [];

    const instructorClasses = await ClassesAdmin.find(
      { Instructor: instructorId },
      '_id'
    ).lean();
    const classIds = instructorClasses.map(cls => cls._id);

    if (!classIds.length && !assignedUserIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const journals = await Journel.find({
      shareWith: 'instructor',
      $or: [
        { classId: { $in: classIds } },
        { userId: { $in: assignedUserIds } }
      ]
    })
    .populate('userId', 'name email')
    .populate('classId', 'title')
    .lean();

    // Sort journals by class title (case-insensitive)
    const sortedJournals = journals.sort((a, b) => {
      const titleA = (a.classId?.title || '').toLowerCase();
      const titleB = (b.classId?.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });

    res.status(200).json({ success: true, data: sortedJournals });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export const deleteJournal = async (req, res) => {
  try {
    const { journalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(journalId)) {
      return res.status(400).json({ success: false, message: "Invalid journalId" });
    }

    const deleted = await Journel.findByIdAndDelete(journalId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Journal not found" });
    }

    res.status(200).json({ success: true, message: "Journal deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getByJournalId = async (req, res) => {
  try {
    const { journalId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(journalId)) {
      return res.status(400).json({ success: false, message: "Invalid journalId" });
    }

    const journal = await Journel.findById(journalId)
      .populate({
        path: 'userId',
        select: 'name email location',
        populate: {
          path: 'location',
          model: 'Location'
        }
      })
      .lean();

    if (!journal) {
      return res.status(404).json({ success: false, message: "Journal not found" });
    }

    res.status(200).json({ success: true, data: journal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const addNoteToJournal = async (req, res) => {
  try {
    const { journalId } = req.params;
    const { userId, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(journalId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid journalId or userId" });
    }

    const updatedJournal = await Journel.findByIdAndUpdate(
      journalId,
      {
        $push: {
          notes: { userId, note }
        }
      },
      { new: true, runValidators: true }
    ).populate('userId', 'name email').lean();

    if (!updatedJournal) {
      return res.status(404).json({ success: false, message: "Journal not found" });
    }

    res.status(200).json({ success: true, data: updatedJournal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export const getJournalsForMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ success: false, message: "Invalid mentorId." });
    }

    const assignment = await AssignInstructor.findOne({ mentorId }).lean();

    if (!assignment || !assignment.instructors || assignment.instructors.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const allUserIds = assignment.instructors.flatMap(inst =>
      inst.userIds.map(id => id.toString())
    );

    const journals = await Journel.find({
      userId: { $in: allUserIds },
      shareWith: 'mentor'
    })
      .populate('userId', 'name email')
      .lean();

    for (const journal of journals) {
      if (Array.isArray(journal.notes)) {
        for (const note of journal.notes) {
          // Fetch user info for note.userId
          const user = await User.findById(note.userId, 'name email profilePicture').lean();
          if (user) {
            note.userInfo = {
              name: note.userId.toString() === mentorId ? "me" : user.name,
              email: user.email,
              profilePicture: user.profilePicture
            };
          }
          // Do not send reviewByMe key at all now
        }
      }
    }

    return res.status(200).json({ success: true, data: journals });
  } catch (err) {
    console.error("Error in getJournalsForMentor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getAdminJournals = async (req, res) => {
  try {
    const journals = await Journel.find({
    })
      .populate({
        path: 'userId',
        select: 'name email number dateOfBirth profilePicture location',
        populate: {
          path: 'location',
          select: 'location'
        }
      })
      .populate({
        path: 'classId',
        select: 'title theme sessionType startDate endDate status Instructor location',
        populate: [
          {
            path: 'Instructor',
            select: 'name email profilePicture'
          },
          {
            path: 'location',
            select: 'location'
          }
        ]
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: journals.length,
      data: journals
    });

  } catch (error) {
    console.error("Error in getAdminJournals:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export default {
    createJournal,
    getJournalsByClassId,
    getJournalsByInstructor,
    deleteJournal,
    getByJournalId,
    addNoteToJournal,
    getJournalsForMentor,
    getAdminJournals
}