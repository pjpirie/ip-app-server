const { Schema } = require("mongoose");
const mongoose = require('mongoose');

const refreshTokenSchema = new Schema({
    userID: {
        type: String,
        required: true,
        minlength: 1,
        unique: true
    },
    token: {
        type: String,
        required: true,
        minlength: 5,
        unique: true
    }
});

const Module = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = Module;