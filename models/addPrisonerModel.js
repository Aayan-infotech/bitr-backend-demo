import mongoose from "mongoose";
const prisonerSchema = new mongoose.Schema({
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    prisonerId:{
        type: String,
        required: true,
        unique: true,
    },
    prisonerName: {
        type: String,
        required: true      
    },
    location: {
        type :mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Blocked'],
        default: 'Active'
    },
}, {
    timestamps: true
});
const Prisoner = mongoose.model('Prisoner', prisonerSchema);
export default Prisoner;