import mongoose from "mongoose"

const feedbackSchema = new mongoose.Schema({
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassesAdmin",
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  feedback: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

const feedbackClass = mongoose.model("Feedback", feedbackSchema);
export default feedbackClass;
