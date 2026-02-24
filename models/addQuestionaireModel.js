import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true }
});

const answerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      answerText: { type: String, enum: ["Yes", "No"], required: true }
    }
  ]
});

const questionaireSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassesAdmin", required: true, unique: true },
  questions: [questionSchema],
  responses: [answerSchema]
}, { timestamps: true });

const Questionaires = mongoose.model("Questionaires", questionaireSchema);

export default Questionaires;
