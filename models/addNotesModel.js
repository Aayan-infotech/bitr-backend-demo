import mongoose from "mongoose";

const addNotesSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "ClassesAdmin",
    },
    title: {
        type: String,
        required: true,
    },
    uploadFile: {
        type: String,
        required: false,
    },
    description:{
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "Blocked"],
        default: "active",
    }
}, {
    timestamps: true,
});
const AddNotes = mongoose.model("AddNotes", addNotesSchema);
export default AddNotes;