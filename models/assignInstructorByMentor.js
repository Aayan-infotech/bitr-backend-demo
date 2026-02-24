import mongoose from "mongoose";

const AssignInstructorSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  instructors: [
    {
      instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        }
      ]
    }
  ]
}, {
  timestamps: true
});

const AssignInstructor = mongoose.model("AssignInstructor", AssignInstructorSchema);
export default AssignInstructor;
