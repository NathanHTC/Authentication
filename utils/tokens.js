const jwt = require('jsonwebtoken');

//signing the access token from .env
const createAccessToken = (id) => {
    return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: 15 * 60,
    });
}

//signing the refresh token
const createRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "90d",
    });
};

//create a email verify token for user to resend the password later
const createEmailVerifyToken = (id) => {
    return jwt.sign({ id }, process.env.EMAIL_VERIFY_SECRET, {
        expiresIn: 15 * 60,
    });
}


//sending back access token to client
const sendAccessToken = (_req, res, accessToken) => {
    res.json({
        accessToken,
        type:"success",
        message:"Welcome! You are signed in"
    });
};

//sending back refresh token to client
const sendRefreshToken = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly:true,
    });
}

//payload in this token will contain 3 + 1 createdAt info
const createPasswordResetToken = ({ id, email, password }) => {
    const secret = password;
    return jwt.sign({ id, email }, secret, {
        expiresIn: 15 * 60,
    })
}


module.exports = {
    createAccessToken,
    createRefreshToken,
    createEmailVerifyToken,
    sendAccessToken,
    sendRefreshToken,
    createPasswordResetToken,
};
