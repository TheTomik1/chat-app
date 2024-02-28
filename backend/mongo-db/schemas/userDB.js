const { model, Schema } = require('mongoose');

module.exports = model(
    "users",
    new Schema({
        userName: { type: String, required: true, unique: true},
        email: { type: String, required: true, unique: true},
        hashedPassword: { type: String, required: true },
        profilePictureUrl: { type: String, default: "https://robohash.org/noprofilepic.png", required: true},
        createdAt: { type: Date, default: Date.now },
    }
));
