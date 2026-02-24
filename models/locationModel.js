import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
    location: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Blocked'],
        default: 'Active',
    },
}, {
    timestamps: true,
});

const Location = mongoose.model('Location', locationSchema);

export default Location;