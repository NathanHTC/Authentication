var express = require("express");
var router = express.Router();
const { hash } = require("bcryptjs");
const bcrypt = require("bcrypt")
const { 
    createAccessToken,
    createRefreshToken,
    createEmailVerifyToken,
    sendAccessToken,
    sendRefreshToken,
} = require('../utils/tokens') 
const User = require("../models/user")
const jwt = require('jsonwebtoken')
const { protected } = require('../utils/protected')

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
        sendAccessToken(req, res, accessToken);
        sendRefreshToken(res, refreshToken); 
           

    } catch(error) {
        console.log("Error in sign up phase: ", error)
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
        const { refreshtoken } = req.cookies;
        //if req does not have a refreshToken, meaning user is logged out
        if(!refreshtoken){
            return res.status(401).json({
                type: "error",
                message: "cookie expired, try login again"
            });
        }
        //we have a refresh token, next is to verify it 
        let id;
        try{
            //verify will decode user's refreshtoken to its payload, in this case { id } obj
            id = jwt.verify(refreshtoken, process.env.REFRESH_TOKEN_SECRET).id;
        } catch(error){
            return res.status(401).json({
                message:"Invalid refresh token!",
                type:"error",
            });
        }

        //if the decoded json payload does not include an id prop
        if(!id){
            return res.status(401)._construct({
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

        //if we are here, that means user doc with provided id is found
        //last check, if refresh token matches record in doc
        if(refreshtoken != user.refreshToken){
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
        sendRefreshToken(res, newRefreshToken)
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

module.exports = router;