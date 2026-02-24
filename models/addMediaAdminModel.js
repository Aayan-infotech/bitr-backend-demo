
import mongoose from "mongoose";

const addMediaAdminSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "ClassesAdmin",
    },
    title:{
        type: String,
        required: true,
    },
    uploadVideo: {
        type: String,
        required: false,
    },
    uploadLink: {
        type: String,
        required: false,
    },
    Description: {
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
const AddMediaAdmin = mongoose.model("AddMediaAdmin", addMediaAdminSchema);
export default AddMediaAdmin;