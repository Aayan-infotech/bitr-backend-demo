import mongoose from "mongoose";

const journelSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassesAdmin",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title1: { type: String, required: true },
  description1: { type: String, required: true },
  title2: { type: String, required: true },
  description2: { type: String, required: true },
  notes: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      note: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  shareWith: {
    type: [String],
    enum: ['Private','mentor','instructor'],
    default: ['Private'],
    validate: {
      validator: function(arr) {
        if (arr.includes('Private') && arr.length > 1) {
          return false;
        }
        return arr.length > 0;
      },
      message: props =>
        `'shareWith' cannot mix 'Private' with other roles, and must have at least one value.`
    }
  }
}, {
  timestamps: true
});


const Journel = mongoose.model("Journel", journelSchema);
export default Journel;