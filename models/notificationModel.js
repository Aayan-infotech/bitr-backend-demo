import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    notificationType: {
        type: String,
        enum: [
            "Class Reminder",
            "Inspirational Quote",
            "Upcoming Event Invitation",
            "new Media",
            "messageNotification"
        ],
        required: true,
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassesAdmin'
    },
    actvityId: {
        type: mongoose.Schema.Types.ObjectId,   
        ref: 'MentorshipActivity'
    },
    template: { 
        type: String,
        enum: ["template1", "template2", "template3", "template4"],
    },
    title: { 
        type: String,
        required:true,
    },
    message: {
        type: String,
        required:true,
    },
    html: { 
        type: String
    },
    Date:{
        type:Date
    },
    Time:{
        type:String 
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    senderName:{
        type:String,
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    readBy:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    }],
    deletedBy:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
