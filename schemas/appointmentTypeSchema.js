const { Schema } = require("mongoose");
const mongoose = require('mongoose');

const appointmentTypeSchema = new Schema({
    title: {
        type: String,
        required: true,
        minlength: 1
    },
    description: {
        type: String,
        required: true,
        minlength: 5
    },
    identifier: {
        type: String,
        required: true,
        minlength: 1,
        unique: true
    }
});

const Module = mongoose.model('AppointmentType', appointmentTypeSchema);

module.exports = Module;