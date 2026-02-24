import mongoose from 'mongoose';

const SupportMessageSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  attachment: {
    type: String,
    default: null
  },
  attachmentType: {
    type: String,
    enum: ['image', 'pdf', null],
    default: null
  }
}, { timestamps: true });

export default mongoose.model('SupportMessage', SupportMessageSchema);
