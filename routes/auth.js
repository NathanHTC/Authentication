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
                "type": "warning",
                "message":"It seems you haven't signed up"
            })
        }
        
        
        const isMatch = await bcrypt.compare(password, user.password);


        //if the provided password is incorrect
        if(!isMatch){
            return res.status(400).json({ 
                "type":"warning",
                "message":"Provided password is incorrect"
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
            "type":"warning",
            "message":"Ops..there is an error when signing in", error
        })
    }
})



// const user1 = new userSchema({})
router.get('/', (req, res) =>{
    res.send("hello from the auth router");
});


module.exports = router;