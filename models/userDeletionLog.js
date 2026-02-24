import mongoose from "mongoose";

const affectedCollectionSchema = new mongoose.Schema({
  collection: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: [
      "deleteMany",
      "deleteOne",
      "updateMany",
      "pull",
      "skip",
      "delete",
      "update"
    ],
    required: true,
  },
  filter: {
    type: Object,
    default: {},
  },
  affectedCount: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const userDeletionLogSchema = new mongoose.Schema({
  deletedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  affectedUserName: {
    type: String,
    required: true,
  },

  affectedUserEmail: {
    type: String,
    required: false,
  },

  affectedUserRole: {
    type: String,
    enum: ["user", "instructor", "mentor"],
    required: true,
  },

  deletedBy: {
    type: String,
    default: "admin",
    immutable: true,
  },

  reason: {
    type: String,
    required: true,
  },

  ipAddress: {
    type: String,
    required: true,
  },

  affectedCollections: {
    type: [affectedCollectionSchema],
    default: [],
  },

  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("UserDeletionLog", userDeletionLogSchema);
