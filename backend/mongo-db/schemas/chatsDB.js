const { model, Schema } = require('mongoose');

module.exports = model(
    "chats",
    new Schema({
        participants: { type: Array, required: true },
        messages: [{
            sender: { type: String, required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            edited: { type: Boolean, default: false },
            readBy: { type: Array },
            attachments: [{
                filename: { type: String, required: true },
                url: { type: String, required: true },
                contentType: { type: String },
                size: { type: Number }
            }],
            emojis: {
                type: Map,
                of: [{
                    user: { type: String, required: true },
                    count: { type: Number, required: true }
                }]
            }
        }],
        createdAt: { type: Date, default: Date.now },
    })
);