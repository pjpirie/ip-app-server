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
        required: false,
        minlength: 1
    },
    location: {
        type: String,
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
    user: {
        type: String,
        required: true,
        minlength: 1,
    }
});

const Module = mongoose.model('Appointment', appointmentSchema);

module.exports = Module;