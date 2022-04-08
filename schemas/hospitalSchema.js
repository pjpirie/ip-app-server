const { Schema } = require("mongoose");
const mongoose = require('mongoose');

const hospitalSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 1
    },
    address: {
        type: String,
        required: true,
        minlength: 1
    },
    postcode: {
        type: String,
        required: true,
        minlength: 5
    },
    number: {
        type: String,
        required: true,
        minlength: 5
    },
    website: {
        type: String,
        required: true,
        minlength: 5
    },
    parking: {
        type: Boolean,
        required: true
    },
    transport: {
        type: String,
        required: true,
        minlength: 5
    },
    description: {
        type: String,
        required: true,
        minlength: 5
    },
    identifier: {
        type: String,
        required: true,
        minlength: 3
    },
    mapHTML: {
        type: String,
        required: true,
        minlength: 1
    }
});

const Module = mongoose.model('Hospital', hospitalSchema);

module.exports = Module;