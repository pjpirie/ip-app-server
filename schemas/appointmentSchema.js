const { Schema } = require("mongoose");
const mongoose = require('mongoose');

const appointmentSchema = new Schema({
    title: {
        type: String,
        required: true,
        minlength: 1
    },
    number: {
        type: String,
        required: true,
        minlength: 1
    },
    description: {
        type: String,
        required: true,
        minlength: 5
    },
});

const Module = mongoose.model('Appointment', appointmentSchema);

module.exports = Module;