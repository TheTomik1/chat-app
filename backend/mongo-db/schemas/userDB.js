const { model, Schema } = require('mongoose');

module.exports = model(
    "users",
    new Schema({
        userName: { type: String, required: true },
        email: { type: String, required: true },
        hashedPassword: { type: String, required: true }
    }
));
