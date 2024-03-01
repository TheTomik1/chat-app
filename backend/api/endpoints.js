const router = require('express').Router();
const { format } = require('date-fns');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require("path");
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.ENV' });

const authMiddleware = require('./middlewares/auth');

const userDB = require('../mongo-db/schemas/userDB');
const chatDB = require('../mongo-db/schemas/chatsDB');
const profilePicturesDB = require('../mongo-db/schemas/profilePicturesDB');

const secretKey = process.env.JWT_SECRET;

router.use(cors({ origin: 'http://localhost:3000', credentials: true }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'profile-pictures'));
    },
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}-${file.originalname}`);
}});

const upload = multer({ storage });

router.post("/register", async(req, res) => {
    try {
        const { userName, email, password } = req.body;
        if (!userName || !email || !password) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await userDB.create({ userName, email, hashedPassword });

        await res.status(201).send({ message: 'User registered.' });
    } catch (e) {
        if (e.code === 11000) {
            return res.status(400).send({ message: 'User already exists.' });
        }

        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        const user = await userDB.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).send({ message: 'Invalid password.' });
        }

        const token = jwt.sign({ id: user.userName }, secretKey, { expiresIn: '7d' });
        await res.cookie('auth', token, { maxAge: 7 * 24 * 60 * 60 * 1000 , httpOnly: true });
        await res.status(201).send({ message: 'User logged in.' });
    } catch (e) {
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/logout", authMiddleware, async(req, res) => {
    try {
        await res.clearCookie('auth');
        await res.status(201).send({ message: 'Logged out.' });
    } catch (e) {
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.get("/me", authMiddleware, async(req, res) => {
    const userInformation = await userDB.findOne({ userName: req.user.id }, { userName: 1, email: 1, _id: 0 });

    await res.status(200).send({ userInformation });
});

router.get("/profile-picture", authMiddleware, async (req, res) => {
    let userId, userName;
    if (req.query.userName) {
        userName = req.query.userName;
    } else {
        userId = req.user.id;
    }

    const query = userName ? { userName } : { userName: userId };

    const userInformation = await profilePicturesDB.findOne(query, { imageName: 1, _id: 0 });

    if (userInformation === null || !userInformation.imageName) {
        return res.status(404).send({ message: 'No profile picture found.' });
    }

    const imagePath = path.join(__dirname, 'profile-pictures', userInformation.imageName);

    return res.status(200).sendFile(imagePath);
});

router.get("/list-users", authMiddleware, async(req, res) => {
    const users = await userDB.find({}, { userName: 1, _id: 0 });

    await res.status(200).send({ users });
});

router.get("/user-details", authMiddleware, async(req, res) => {
    const { userName } = req.query;

    const user = await userDB.findOne({ userName }, { userName: 1, email: 1, _id: 0 });

    if (!user) {
        return res.status(404).send({ message: 'User not found.' });
    }

    await res.status(200).send({ user });
});

router.get("/chats", authMiddleware, async(req, res) => {
    const chats = await chatDB.find({ participants: req.user.id });

    await res.status(200).send({ chats });
});

router.get("/chat-history", authMiddleware, async(req, res) => {
    const { participants } = req.query;

    const chatHistory = await chatDB.findOne({ participants: { $all: participants } });

    if (!chatHistory) {
        return res.status(404).send({ message: 'Chat history not found.' });
    }

    await res.status(200).send({ chatHistory });
});

router.post("/update-user", authMiddleware, async(req, res) => {
    try {
        const { userName, email, password } = req.body;
        if (!userName || !email) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        if (!password) {
            await userDB.updateOne({ userName: req.user.id }, { userName, email });
            return res.status(201).send({ message: 'User updated.' });
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);

            await userDB.updateOne({ userName: req.user.id }, { userName, email, hashedPassword });
            await res.status(201).send({ message: 'User updated.' });
        }
    } catch (e) {
        if (e.code === 11000) {
            return res.status(400).send({ message: 'User already exists.' });
        }

        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/invite-user", authMiddleware, async(req, res) => {
    try {
        const { participants, chatId, invitee } = req.body;

        if (!Array.isArray(participants) || participants.length === 0 || !chatId || !invitee) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        const chat = await chatDB.findOne({ _id: chatId, participants: req.user.id });

        if (!chat) {
            return res.status(404).send({ message: 'Chat not found.' });
        }

        const inviteeUser = await userDB.findOne({ userName: invitee });

        if (!inviteeUser) {
            return res.status(404).send({ message: 'Invitee not found.' });
        }

        const chatWithInvitee = await chatDB.findOne({ participants: { $all: [req.user.id, invitee] } });

        if (chatWithInvitee) {
            return res.status(400).send({ message: 'Chat with invitee already exists.' });
        }

        const updatedChat = await chatDB.updateOne({ _id: chatId }, { $push: { participants: invitee } });

        await res.status(201).send({ message: 'User invited.' });
    } catch (e) {
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/leave-chat", authMiddleware, async(req, res) => {
    try {
        const { participants, chatId } = req.body;
        if (!chatId) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        const chat = await chatDB.findOne({ _id: chatId, participants: req.user.id });

        if (!chat) {
            return res.status(404).send({ message: 'Chat not found.' });
        }

        if (chat.participants.length === 1) {
            await chatDB.deleteOne({ _id: chatId });
        } else {
            await chatDB.updateOne({ _id: chatId }, { $pull: { participants: req.user.id } });
        }

        await res.status(201).send({ message: 'User left chat.' });
    } catch (e) {
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/upload-profile-picture", authMiddleware, async(req, res) => {
    try {
        upload.single('file')(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).send({ message: 'Invalid file.' });
            } else if (err) {
                return res.status(500).send({ message: 'Internal server error.' });
            }

            if (!req.file) {
                return res.status(400).send({ message: 'No file uploaded.' });
            }

            const findProfilePicture = await profilePicturesDB.findOne({ userName: req.user.id });

            if (findProfilePicture !== null) {
                const oldImagePath = path.join(__dirname, 'profile-pictures', findProfilePicture["imageName"]);
                fs.unlinkSync(oldImagePath)
            }

            const fileName = `${req.user.id}-${req.file.originalname}`;
            await profilePicturesDB.updateOne({ userName: req.user.id }, { imageName: fileName }, { upsert: true });

            await res.status(201).send({ message: 'File uploaded.' });
        });
    } catch (e) {
        console.error(e);
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

router.post("/send-message", authMiddleware, async (req, res) => {
    try {
        const { participants, message } = req.body;

        if (!Array.isArray(participants) || participants.length === 0 || !message) {
            return res.status(400).json({ message: 'Invalid body.' });
        }

        let chat = await chatDB.findOne({ participants: { $all: participants } });

        if (!chat) {
            chat = await chatDB.create({ participants, messages: [{ sender: req.user.id, content: message }] });

            req.io.to(chat._id).emit("join-chat", chat._id);
        } else {
            chat.messages.push({ sender: req.user.id, content: message });
            chat.updatedAt = new Date();
            await chat.save();
        }

        req.io.to(chat._id).emit('new-message', {
            sender: req.user.id,
            content: message,
            timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        });

        return res.status(201).json({ message: 'Message sent.', chatId: chat._id });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post("/edit-message", authMiddleware, async(req, res) => {
    try {
        const { participants, message, messageId } = req.body;

        if (!Array.isArray(participants) || participants.length === 0 || !message || !messageId) {
            return res.status(400).json({ message: 'Invalid body.' });
        }

        const chat = await chatDB.findOne({ participants });
        const messageIndex = chat.messages.findIndex(msg => msg._id.toString() === messageId);
        if (messageIndex === -1) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        chat.messages[messageIndex].content = message;
        chat.messages[messageIndex].edited = true;
        chat.updatedAt = new Date();
        await chat.save();

        req.io.to(chat._id).emit('edited-message', {
            messageId,
            content: message,
            edited: true,
        });

        return res.status(200).json({ message: 'Message edited.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post("/delete-message", authMiddleware, async(req, res) => {
    try {
        const { participants, messageId } = req.body;

        if (!Array.isArray(participants) || participants.length === 0 || !messageId) {
            return res.status(400).json({ message: 'Invalid body.' });
        }

        const chat = await chatDB.findOne({ participants });
        const messageIndex = chat.messages.findIndex(msg => msg._id.toString() === messageId);
        if (messageIndex === -1) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        chat.messages.splice(messageIndex, 1);
        chat.updatedAt = new Date();
        await chat.save();

        req.io.to(chat._id).emit('deleted-message', messageId);

        return res.status(200).json({ message: 'Message deleted.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

module.exports = router;