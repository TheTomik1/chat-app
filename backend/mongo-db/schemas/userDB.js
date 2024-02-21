const { model, Schema } = require('mongoose');

module.export = model(
    "users",
    new Schema({
        "username": {
            "type": "String",
            "required": true
        },
        "password": {
            "type": "String",
            "required": true
        },
        "email": {
            "type": "String",
            "required": true
        },
        "created_at": {
            "type": "Date",
            "default": Date.now
        }
    }
));
