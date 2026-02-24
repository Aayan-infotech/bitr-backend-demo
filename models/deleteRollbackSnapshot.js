// models/deleteRollbackSnapshot.js
import mongoose from "mongoose";

const deleteRollbackSnapshotSchema = new mongoose.Schema({
  operationId: {
    type: String,
    required: true,
    index: true,
  },
  collection: {
    type: String,
    required: true,
  },
  documents: {
    type: Array,
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60, 
  },
});

export default mongoose.model(
  "DeleteRollbackSnapshot",
  deleteRollbackSnapshotSchema
);
