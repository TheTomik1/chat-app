process.env["DEBUG"] = "calendar:initialize";

const fs = require('fs');
const debug = require('debug')('calendar:initialize');
const path = require('path');

function initialize() {
    if (!fs.existsSync(path.join(__dirname, "api/attachments"))) {
        debug("Creating attachments directory. It is advised to drop the chats collection in the database!");
        fs.mkdirSync(path.join(__dirname, "api/attachments"));
    }

    if (!fs.existsSync(path.join(__dirname, "api/profile-pictures"))) {
        debug("Creating profile-pictures directory. It is advised to drop the users collection in the database!");
        fs.mkdirSync(path.join(__dirname, "api/profile-pictures"));
    }

    if (!fs.existsSync(path.join(__dirname, ".ENV"))) {
        debug("Creating .ENV file.");

        fs.writeFileSync(path.join(__dirname, ".ENV"), `MONGO_URI="Your MongoDB URI here"\n\nJWT_SECRET="Your JWT secret here"\n`);
    }

    debug("Initialization complete.");
}

initialize()