const router = require('express').Router();
const { format } = require('date-fns');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

const authMiddleware = require('./middlewares/auth');

const userDB = require('../mongo-db/schemas/userDB');

const secretKey = process.env.JWT_SECRET;

router.use(cors({ origin: 'http://localhost:3000', credentials: true }));

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

        const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '7d' });
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
    const userInformation = await userDB.findById(req.user.id);

    await res.status(200).send({ userInformation });
});

module.exports = router;