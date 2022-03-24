const { Schema } = require("mongoose");
const mongoose = require('mongoose');

const appointmentSchema = new Schema({
    type: {
        type: String,
        required: true,
        minlength: 1
    },
    number: {
        type: String,
        required: false,
        minlength: 1
    },
    location: {
        type: mongoose.Types.ObjectId,
        ref: "Hospital",
        required: true,
        minlength: 5
    },
    ward: {
        type: String,
        required: true,
        minlength: 1
    },
    date: {
        type: String,
        required: true,
        minlength: 5
    },
    time: {
        type: String,
        required: true,
        minlength: 5
    },
    userID: {
        type: String,
        required: true,
        minlength: 1,
    }
});

const Module = mongoose.model('Appointment', appointmentSchema);

module.exports = Module;