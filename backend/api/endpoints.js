const router = require('express').Router();
const { format } = require('date-fns');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

const authMiddleware = require('./middlewares/auth');

const userDB = require('../mongo-db/schemas/userDB');
const chatDB = require('../mongo-db/schemas/chatsDB');

const secretKey = process.env.JWT_SECRET;

router.use(cors({ origin: 'http://localhost:3000', credentials: true }));

router.post("/send-message", authMiddleware, async(req, res) => {
    try {
        const { participants, message } = req.body;

        if (!participants || !message) {
            return res.status(400).send({ message: 'Invalid body.' });
        }

        const findChat = await chatDB.findOne({ participants });
        if (!findChat) {
            await chatDB.create({ participants });
        }

        const chat = await chatDB.findOne({ participants });
        await chatDB.updateOne({ _id: chat._id }, { $push: { messages: { sender: req.user.id, content: message } } });

        req.io.to(chat._id).emit('new-message', {
            sender: req.user.id,
            content: message,
            timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        });

        await res.status(201).send({ message: 'Message sent.' });
    } catch (e) {
        await res.status(500).send({ message: 'Internal server error.' });
    }
});

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

router.get("/chat-history", authMiddleware, async(req, res) => {
    const { participants } = req.query;

    const chatHistory = await chatDB.findOne({ participants: { $all: participants } });

    if (!chatHistory) {
        return res.status(404).send({ message: 'Chat history not found.' });
    }

    await res.status(200).send({ chatHistory });
});

router.get("/chats", authMiddleware, async(req, res) => {
    const chats = await chatDB.find({ participants: req.user.id });

    await res.status(200).send({ chats });
});

module.exports = router;