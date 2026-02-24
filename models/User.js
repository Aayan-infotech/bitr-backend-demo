import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'instructor', 'mentor'], required: true },
  type:{
    type: String,
    enum :['Inmate', 'Free']
  },
  Instructor:{
    type:mongoose.Schema.ObjectId,
    ref:"User"
  },
  name: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'user' || this.role === 'mentor' || this.role === 'instructor';
    }
  },
  profilePicture: { type: String, required: false, trim: true },
  number: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'user' || this.role === 'mentor';
    }
  },
  email: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'user' || this.role === 'mentor';
    }
  },
  password: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'user' || this.role === 'mentor';
    }
  },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },                 
  otpExpiry: { type: Date },              
  isVerified: { type: Boolean, default: false },
  location: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref:'Location'
      },
  prisonerid : {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'instructor';
    }
  },
  expertise: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'mentor';
    }
  },
  bio: { type: String, trim: true },
  dateofbirth: {
    type: String,
    trim: true,
  }, 
  address: { type: String, required: false, trim: true }, 
  ins_date: { type: Date, default: Date.now },  
  ins_ip: { type: String },                     
  refreshToken: { type: String },                     
  user_status: {                                
    type: Number,
    enum: [1, 0, 2], 
    default: 0,
  },
  notificationStatus: {type: Boolean, default: true },
   tags:        { type: [String], default: [] }, 
  fcmToken: { type: String, default: null },
  biometricData: {
    type: String,
    unique: true,
    sparse: true,
  },
  biometricDataVal: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined,
  },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;