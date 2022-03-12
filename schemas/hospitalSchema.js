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
});

const Module = mongoose.model('Hospital', hospitalSchema);

module.exports = Module;