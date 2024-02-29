const { model, Schema } = require('mongoose');

module.exports = model(
    "profilePictures",
    new Schema({
        userName: { type: String, required: true, unique: true},
        imageName: { type: String, default: "", required: true},
    }
));