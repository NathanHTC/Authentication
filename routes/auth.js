var express = require("express");
var router = express.Router();
const { hash } = require("bcryptjs");
const bcrypt = require("bcrypt")
const { 
    createAccessToken,
    createRefreshToken,
    createEmailVerifyToken,
    sendAccessToken,
    setRefreshToken,
    createPasswordResetToken
} = require('../utils/tokens') 
const User = require("../models/user")
const jwt = require('jsonwebtoken')
const { protected } = require('../utils/protected')
const {
    transporter,
    createPasswordResetUrl,
    passwordResetTemplate,
    passwordResetConfirmationTemplate,
} = require("../utils/email");
const { validate } = require("../models/user");

// corrected "./signup" the . is for relative path
router.post("/signup", async(req, res) =>{
    try{
        const { email, password } = req.body;
        //1. check if user already exists
        const user = await User.findOne({ email:email }); //isn't User a model, a model can check its documents?
        // if user exists
        if(user)
            return res.status(500).json({
                message: "User already exists! Try logging in.",
                type: "warning",
            });
        
        //2. user does not exists, create a new user
        const passwordHash = await hash(password, 10);
        const newUser = new User({
            email:email,
            password:passwordHash,
        });
        //3. save the user to the database
        await newUser.save();
        //4. send the response
        res.status(200).json({
            message:"user created successfully!",
            type: "success",
        });
        
    } catch(error){
        res.status(500).json({
            type: "error",
            message: "Error creating user!", error,
        });
    }
});

router.post('/signin', async (req, res) => {
    try{
        const { email, password } = req.body;
        const user = await User.findOne({ email: email })
        
        //if email provided is not found, ask user to sign up first
        if(!user){
            return res.status(400).json({
                type: "warning",
                message:"It seems you haven't signed up"
            })
        }
        
        
        const isMatch = await bcrypt.compare(password, user.password);


        //if the provided password is incorrect
        if(!isMatch){
            return res.status(400).json({ 
                type:"warning",
                message:"Provided password is incorrect"
            })
        }

        //if we are here, that means user pasword is correct
        //create access token and refresh token
        const accessToken = createAccessToken(user._id);
        const refreshToken = createRefreshToken(user._id);
        //save the refresh token into database/this user document
        user.refreshToken = refreshToken;
        await user.save();

        //send the tokens in response
        //this sequence is important
        setRefreshToken(res, refreshToken); 
        sendAccessToken(req, res, accessToken);
           

    } catch(error) {
        console.log("Error in sign in phase: ", error)
        return res.status(500).json({
            type:"warning",
            message:"Ops..there is an error when signing in", error
        })
    }
})
//a protected middleware is added, if access token is verified, add a
//user field containing user doc
router.get('/protected', protected, async (req, res) => {
    try{
        // if user exists in the request, 
        //meaning the protected middleware function runs smooth
        if(req.user)
            return res.json({
                type:"success",
                mssage:"You are logged in!",
                user: req.user,
            })
        // if user doesn't exists, return error
        return res.status(500).json({
            message: "You are not logged in!",
            type: "error",
        });

    } catch(error){
        res.status(500).json({
            type:"error",
            message:"Error in getting protected route!",
        })
    }
})

//create logout end point
router.post("/logout", (_req, res) => {
    //clear cookies
    res.clearCookie("refreshToken");
    return res.json({
        message: "Logged out successfully",
        type: "success",
    });
});

// const user1 = new userSchema({})
router.get('/', (req, res) =>{
    res.send("hello from the auth router");
});


// generate new access token from refreshToken in req cookies
//when old access token expires, this should run to keep user signed in
router.post('/refresh_token', async (req, res) => {
    try{
        const { refreshToken } = req.cookies;
        //console.log(req.cookies)
        //if req does not have a refreshToken, meaning user is logged out
        if(!refreshToken){
            return res.status(401).json({
                type: "error",
                message: "cookie expired, try login again"
            });
        }
        //we have a refresh token, next is to verify it 
        let id;
        try{
            //verify will decode user's refreshtoken to its payload, in this case { id } obj
            id = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET).id;
        } catch(error){
            return res.status(401).json({
                message:"Invalid refresh token!",
                type:"error",
            });
        }

        //if the decoded json payload does not include an id prop
        if(!id){
            return res.status(401).json({
                type: "error",
                message: "id prop not found in refresh token"
            })
        };

        //check if doc with this id really present in mongo user model
        const user = await User.findById(id);
        //user not exists
        if(!user){
            return res.status(401).json({
                type:"error",
                message:"doc matches id in refresh token is not found in user model"
            });
        }
        console.log(user.email)

        //if we are here, that means user doc with provided id is found
        //last check, if refresh token matches record in doc
        if(refreshToken != user.refreshToken){
            return res.status(403).json({
                type: "error",
                message: "refreshtoken in cookie not match with our record"
            });
        }

        //refresh token is valid, finally, let's create new tokens
        const newAccessToken = createAccessToken(user._id);
        const newRefreshToken = createRefreshToken(user._id);

        //update refresh token in database
        user.refreshToken = newRefreshToken;
        await user.save
        //store refresh token in res cookie
        setRefreshToken(res, newRefreshToken)
        //return res in a json object
        return res.status(200).json({
            type: "success",
            message: "access and refresh token refreshed",
            newAccessToken,
        })


    } catch(error){
        res.status(500).json({
            type: "error",
            message: "error refreshing access token!", error
        })
    }
    
})

router.post('/send-password-reset-email', async (req, res) => {
    try{
        const { email } = req.body

        const user = await User.findOne({ email })

        if(!user){
            return res.status(500).json({
                type: "error",
                message:"User does not exist!"
            })
        }
        //passing in all user info
        const token = createPasswordResetToken({ ...user, createdAt: Date.now() })
        //password reset url that for user to click and reset
        const url = createPasswordResetUrl(user.id, token)
        //create the password reset email using user and url 
        const mailOptions = passwordResetTemplate(user, url)

        //send the email
        transporter.sendMail(mailOptions, (err, info) => {
            if(err){
                return res.status(500).json({
                    message:"error sending the mail!"
                })
            }
            return res.json({
                type:"success",
                message:"Password reset link has been sent to your email!"
            })
        })

    } catch(error){
        res.status(500).json({
            type: "error",
            message: "Error sending Email",
            error,
        })
    }
})

router.post("/reset-password/:id/:token", async (req, res) => {
    try{
        const { id, token } = req.params
        //get new password from the request body
        const { newPassword } = req.body
        
        const user = await User.findById({ id })

        if(!user){
            return res.status(500).json({
                type:"error",
                message:"user does not exist!"
            })
        }

        //make sure token is valid
        //recall that we signed verify token using user passwd
        const isValid = jwt.verify(token, user.password)
        //if not valid
        if(!isValid){
            return res.status(403).json({
                type:"error",
                message:"Invalid Token!"
            })
        }
        //token valid, hash new password and save
        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()

        //create confirmation email using template
        const emailOptions = passwordResetConfirmationTemplate(user)

        //send the mail
        transporter.sendMail(emailOptions, (err, info) => {
            if(err){
                return res.status(500).json({
                    type:"error",
                    message:"Error sending email",
                    error
                })
                return res.status(500).json({
                    type:"success",
                    message:"Email sent!"
                })
            }

        })






    } catch(error){

    }
})

module.exports = router;