import mongoose from 'mongoose';
import Prisoner from '../models/addPrisonerModel.js';
import User from '../models/User.js';
import Location from '../models/locationModel.js';
import RegisterClass from "../models/registerClassModel.js";
import AssignUser from "../models/assignUserByInstructor.js";
import ClassesAdmin from "../models/classesAdminModel.js";


export const addPrisoner = async (req, res, next) => {
  try {
    const { instructorId, prisonerId, prisonerName, location } = req.body;

    if (!instructorId || !prisonerId || !prisonerName || !location) {
      return res.status(400).json({
        success: false,
        message: 'instructorId,prisonerId, prisonerName, and location are required'
      });
    }


    const instructor = await User.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }
    const foundLocation = await Location.findById(location);
    if (!foundLocation) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    if (prisonerId.length < 5 || prisonerId.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Prisoner ID must be between 5 and 20 characters'
      });
    };

    const newPrisoner = new Prisoner({ instructorId, prisonerId, prisonerName, location });
    await newPrisoner.save();

    res.status(201).json({
      success: true,
      message: 'Prisoner created successfully',
      data: newPrisoner
    });
  } catch (error) {
    next(error);
  }
};

export const getPrisoners = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    
    // Filter by location if provided
    if (req.query.location) {
      filter.location = req.query.location;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status === 'active' ? 'Active' : 'Blocked';
    }
    
    // Search by name or ID if search term provided
    if (req.query.search) {
      filter.$or = [
        { prisonerName: { $regex: req.query.search, $options: 'i' } },
        { prisonerId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Prisoner.countDocuments(filter);

    const prisoners = await Prisoner.find(filter)
      .populate('instructorId', 'name')
      .populate('location', 'location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: prisoners,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPrisonerById = async (req, res, next) => {
  try {
    const { prisonerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prisoner ID'
      });
    }

    const prisoner = await Prisoner.findById(prisonerId)
      .populate('instructorId', 'name')
      .populate('location', 'location');

    if (!prisoner) {
      return res.status(404).json({
        success: false,
        message: 'Prisoner not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prisoner
    });
  } catch (error) {
    next(error);
  }
};

export const updatePrisoner = async (req, res, next) => {
  try {
    const { prisonerId } = req.params;
    const { prisonerName, location } = req.body;

    if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prisoner ID'
      });
    }

    const updatedPrisoner = await Prisoner.findByIdAndUpdate(
      prisonerId,
      { prisonerName, location },
      { new: true }
    ).populate('instructorId', 'name').populate('location', 'name');

    if (!updatedPrisoner) {
      return res.status(404).json({
        success: false,
        message: 'Prisoner not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedPrisoner
    });
  } catch (error) {
    next(error);
  }
};

export const deletePrisoner = async (req, res, next) => {
  try {
    const { prisonerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prisonerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prisoner ID'
      });
    }

    const deletedPrisoner = await Prisoner.findByIdAndDelete(prisonerId);

    if (!deletedPrisoner) {
      return res.status(404).json({
        success: false,
        message: 'Prisoner not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prisoner deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};


export const getPrisonersByInstructor = async (req, res, next) => {
  try {
    const { instructorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructorId"
      });
    }

    const prisoners = await Prisoner.find({ instructorId })
      .populate("instructorId", "name")
      .populate("location", "location")
      .lean();

    return res.status(200).json({
      success: true,
      data: prisoners
    });

  } catch (error) {
    next(error);
  }
};

export const getPrisonersByInstructorApp = async (req, res, next) => {
  try {
    const { instructorId, classId } = req.params;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(instructorId) ||
      !mongoose.Types.ObjectId.isValid(classId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructorId or classId",
      });
    }

    // Fetch class
    const classDoc = await ClassesAdmin.findById(classId).lean();
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check instructor assignment
    if (classDoc.Instructor.toString() !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "This instructor is not assigned to this class",
      });
    }

    // Fetch prisoners under instructor
    const prisoners = await Prisoner.find({ instructorId })
      .populate("instructorId", "name")
      .populate("location", "location")
      .lean();

    // Fetch assigned users
    const assigned = await AssignUser.findOne({ instructorId }).lean();
    const assignedUserIds = assigned
      ? assigned.userIds.map((id) => id.toString())
      : [];

    // Fetch registered users for the class
    const registerDoc = await RegisterClass.findOne({ class: classId })
      .populate("registrations.userId", "name email")
      .lean();

    let registeredAssignedUsers = [];

    if (registerDoc) {
      registeredAssignedUsers = registerDoc.registrations
        .filter((r) =>
          assignedUserIds.includes(r.userId._id.toString())
        )
        .map((r) => r.userId);
    }

    return res.status(200).json({
      success: true,
      data: {
        prisoners,
        users: registeredAssignedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePrisonerStatus = async (req, res, next) => {
  try {
    const { prisonerId } = req.params;

    if (!prisonerId || !mongoose.Types.ObjectId.isValid(prisonerId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid prisoner ID is required'
      });
    }

    const prisoner = await Prisoner.findById(prisonerId);

    if (!prisoner) {
      return res.status(404).json({
        success: false,
        message: 'Prisoner not found'
      });
    }

    prisoner.status = prisoner.status === 'Active' ? 'Blocked' : 'Active';
    await prisoner.save();

    return res.status(200).json({
      success: true,
      message: `Prisoner status changed to ${prisoner.status}`,
      data: prisoner
    });
  } catch (err) {
    console.error('changePrisonerStatus error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};



export default {
  addPrisoner,
  getPrisoners,
  getPrisonerById,
  updatePrisoner,
  deletePrisoner,
  getPrisonersByInstructor,
  getPrisonersByInstructorApp,
  changePrisonerStatus
};
