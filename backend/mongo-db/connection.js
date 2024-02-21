const debug = require('debug')('chat-app-api:mongo');
const mongoose = require('mongoose');
require('dotenv').config();

const mongoConnectionString = process.env.MONGO_URL;

mongoose.set("strictQuery", true);
mongoose.connect(mongoConnectionString, {}).then(() => {
    debug("Successfully connected to MongoDB!")
}).catch((err) => {
    debug(`Error while connecting to MongoDB: ${err}`)
})