import mongoose from "mongoose";

const AssignUsersSchema = new mongoose.Schema({
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
  ],
}, {
  timestamps: true
});

const AssignUser = mongoose.model("AssignUser", AssignUsersSchema);
export default AssignUser;
