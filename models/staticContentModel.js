import mongoose from 'mongoose';

const StaticContentSchema = new mongoose.Schema({
  section: {
    type: String,
    enum: ['aboutUs', 'termsAndConditions', 'privacyPolicy', 'deleteAccount'],
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('StaticContent', StaticContentSchema);
