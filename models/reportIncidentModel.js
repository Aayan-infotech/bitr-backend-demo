import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassesAdmin',
        required: true,
    },
    sessionId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
    },
    instructor:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    description:{
        type: String,
        required:true,
    }
}, {
    timestamps: true,
});

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;