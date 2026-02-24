import mongoose from "mongoose";
import Questionaires from '../models/addQuestionaireModel.js';
import RegisterClass from "../models/registerClassModel.js";

export const createQuestionaire = async (req, res) => {
  try {
    const { classId } = req.params;
    const { questionText } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    if (!questionText || typeof questionText !== 'string') {
      return res.status(400).json({ success: false, message: "Question text is required." });
    }

    let questionaire = await Questionaires.findOne({ classId });

    if (!questionaire) {
      questionaire = new Questionaires({
        classId,
        questions: [{ questionText }]
      });
    } else {
      questionaire.questions.push({ questionText });
    }

    await questionaire.save();
    return res.status(200).json({ success: true, message: "Question added successfully.", questionaire });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const getQuestionaire = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId." });
    }

    const questionaire = await Questionaires.findOne({ classId }).select("questions");

    if (!questionaire) {
      return res.status(404).json({ success: false, message: "No questions found for this class." });
    }

    res.status(200).json({ success: true, questions: questionaire.questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitAnswers = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, answers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid classId or userId." });
    }

    const regDoc = await RegisterClass.findOne({ class: classId });

    if (!regDoc) {
      return res.status(404).json({ success: false, message: "Registration not found." });
    }

    // Updated attendance check
    const registeredUser = regDoc.registrations.find(
      (r) =>
        r.userId.toString() === userId &&
        Array.isArray(r.sessionAttendance) &&
        r.sessionAttendance.some((session) => session.status === "Present")
    );

    if (!registeredUser) {
      return res.status(403).json({
        success: false,
        message: "Only registered and present users can submit answers."
      });
    }

    const questionaire = await Questionaires.findOne({ classId });

    if (!questionaire) {
      return res.status(404).json({ success: false, message: "Questionaire not found." });
    }

    const alreadyAnswered = questionaire.responses.find(
      (resp) => resp.userId.toString() === userId
    );

    if (alreadyAnswered) {
      return res.status(400).json({ success: false, message: "User already submitted answers." });
    }

    if (answers.length !== questionaire.questions.length) {
      return res.status(400).json({ success: false, message: "All questions must be answered." });
    }

    const formattedAnswers = questionaire.questions.map((q, i) => ({
      questionId: q._id,
      answerText: answers[i]
    }));

    questionaire.responses.push({
      userId,
      answers: formattedAnswers
    });

    await questionaire.save();

    res.status(200).json({ success: true, message: "Answers submitted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const editQuestion = async (req, res) => {
  try {
    const { classId, questionId } = req.params;
    const { questionText } = req.body;

    const updated = await Questionaires.updateOne(
      { classId, "questions._id": questionId },
      { $set: { "questions.$.questionText": questionText } }
    );

    if (updated.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Question not found or unchanged." });
    }

    res.status(200).json({ success: true, message: "Question updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserQuestionnaireWithAnswers = async (req, res) => {
  try {
    const { classId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid classId or userId." });
    }

    const questionaire = await Questionaires.findOne({ classId }).lean();

    if (!questionaire)
      return res.status(404).json({ success: false, message: "Questionnaire not found." });

    const userResponse = questionaire.responses.find(
      (resp) => resp.userId.toString() === userId
    );

    const questionsWithAnswers = questionaire.questions.map((q) => {
      const answerObj =
        userResponse?.answers.find((a) => a.questionId.toString() === q._id.toString());
      return {
        questionId: q._id,
        questionText: q.questionText,
        answerText: answerObj ? answerObj.answerText : null 
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        classId: questionaire.classId,
        userId,
        questions: questionsWithAnswers
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




export default {
    createQuestionaire,
    getQuestionaire,
    submitAnswers,
    editQuestion,
    getUserQuestionnaireWithAnswers,
    
};
