import crypto from "crypto";

const secretKey = process.env.SECRET_KEY;

async function encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const secretIV = crypto.randomBytes(16).toString('hex');

    const key = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0,32)
    const encIv = crypto.createHash('sha512').update(secretIV).digest('hex').substring(0,16)

    const cipher = crypto.createCipheriv(algorithm, key, encIv)
    const encrypted = cipher.update(secret, 'utf8', 'hex') + cipher.final('hex')

    return Buffer.from(encrypted).toString('base64');
}

export default encryptData;
