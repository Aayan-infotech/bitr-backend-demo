import mongoose from 'mongoose';

const mentorshipActivitySchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    mentorId: {
        type: mongoose.Schema.ObjectId,
        required:true,
        ref: 'User',
    },
    Date:{
        type: String,
        required: true,
    },
    startTime:{
        type:String,
        required:true,
    },
    endTime:{
        type:String,
        required:true,
    },
    activityType:{
        type:String,
        enum:['Guidance','Motivation','Training'],
        required:true,
    },
    Notes:{
        type:String,
        required:true,
    },
    assignedUsers:[{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
    }],
    AttendedUsersAndNotes:[{
        userId:{
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        notes:{
            type:String,
        }
    }]
},{
    timestamps:true,
});

const mentorshipActivity = mongoose.model('MentorshipActivity', mentorshipActivitySchema);

export default mentorshipActivity;