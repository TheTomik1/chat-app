import crypto from "crypto";

const secretKey = process.env.SECRET_KEY;

async function decryptData(secret, token) {
    const algorithm = 'aes-256-cbc';
    const secretIV = crypto.randomBytes(16).toString('hex');

    const key = crypto.createHash('sha512').update(secret).digest('hex').substring(0,32)
    const encIv = crypto.createHash('sha512').update(secretIV).digest('hex').substring(0,16)
    const decipher = crypto.createDecipheriv(algorithm, key, encIv)

    return decipher.update(token, 'base64', 'utf8') + decipher.final('utf8');
}

module.exports = decryptData;