const nodemailer = require("nodemailer");

//this endpoint will be included in an password reset email 
//that was sent to user, when clicked, it will reset the password
const createPasswordResetUrl = (id, token) => {
    `${process.env.CLIENT_URL}/reset-password/${id}/${token}`;
}

let transporter = nodemailer.createTransport({
    service: process.env.EMAIL_HOST,
    auth: {
        user: process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASSWORD,
    }
})

//this is the email template we will sent from user to 
//user email stored in database
const passwordResetTemplate = (user, url) => {
    const { username, email } = user;
    return {
        //** why user email from .env is used here ? */
        from: `Mail - <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Reset Password`,
        html:`
            <h2>Password Reset Link<h2>
            <p>Reset your password by clicking on the link below:</p>
            <a href=${url}><button>Reset Password</button></a>
            <br />
            <br />
            <small><a style="color: #38A169" href=${url}>${url}</a></small>
            <br />
            <small>The link will expire in 15 mins!</small>
            <small>If you haven't requested password reset, please ignore!</small>
            <br /><br />
            <p>Thanks,</p>
            <p>Authentication API</p>`,
    }
}

const passwordResetConfirmationTemplate = (user) => {
    const { email } = user;
    return {
        from: `Mail - <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Password Reset Successful`,
        html: `
            <h2>Password Reset Successful</h2>
            <p>You've successfully updated your password for your account <${email}>. </p>
            <small>If you did not change your password, reset it from your account.</small>
            <br /><br />
            <p>Thanks,</p>
            <p>Authentication API</p>`,
    }
}


module.exports = { 
    transporter,
    createPasswordResetUrl,
    passwordResetTemplate,
    passwordResetConfirmationTemplate,
}