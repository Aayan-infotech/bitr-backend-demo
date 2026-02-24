import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const sessionSchema = new Schema({
  date:      { type: Date,   required: true },
  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
  status:    { type: String, enum: ["Active", "Blocked"], default: "Active" },
}, { _id: true });

const classesAdminSchema = new Schema({
  title:       { type: String, required: true },
  theme:       { type: String, required: true },
  tags:        { type: [String], default: [] },          
  startDate:   { type: Date,   required: true },
  endDate:     { type: Date,   required: true },
  sessionType: { type: String, enum: ["daily","weekly","monthly"], required: true },
  Image:       { type: String, },
  location:    { type: Types.ObjectId, ref: "Location", required: true },
  Instructor:  { type: Types.ObjectId, ref: "User",     required: true },
  Type:        { type: String, enum: ["Regular Class","Workshop","Special Event"], default: "Regular Class" },
  status:      { type: String, enum: ["Active","Blocked"], default: "Active" },
  sessions:    [ sessionSchema ]
}, { timestamps: true });

export default model("ClassesAdmin", classesAdminSchema);