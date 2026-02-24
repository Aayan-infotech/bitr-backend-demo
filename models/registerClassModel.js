import mongoose from "mongoose";

const userSessionAttendanceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Session"
  },
  status: {
    type: String,
    enum: ["Present", "Absent"],
    required: true
  }
}, { _id: false });

const instructorAttendanceSchema = new mongoose.Schema({
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Session"
  },
  attendanceList: [
    {
      prisonerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Prisoner",
        default: null
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      status: {
        type: String,
        enum: ["Present", "Absent"],
        required: true
      }
    }
  ]
}, { timestamps: true });

const prisonerRegistrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sessionAttendance: [userSessionAttendanceSchema],
  certificateEmailSent: {
    type: Boolean,
    default: false  
  }
}, { _id: false });

const registerClassSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassesAdmin",
    required: true
  },
  registrations: [prisonerRegistrationSchema],
  instructorAttendances: [instructorAttendanceSchema]
}, {
  timestamps: true
});

registerClassSchema.index({ class: 1 });

const RegisterClass = mongoose.model("RegisterClass", registerClassSchema);
export default RegisterClass;
