//middlewares are called before req is processed 
//we will define a middleware function to verify user 
// via access token, added a user field to request
//call the next() middleware
// we could use this mdware later to load user doc into req
//from there, to load user doc into res or process the doc
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const protected = async (req, res, next) => {
    //get the token from header
    const authorization = req.headers["authorization"];
    // req.headers['authorization'] to retrieve the access JWT ***

    //if we dont have a token return error
    if(!authorization)
        return res.status(401).json({
            type:"error",
            message:"No token"
        })
    
    //we have a token, lets verify it
    const token = authorization.split(" ")[1];
    let id
    try{
        //decode the token
        id = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET).id;
    } catch(error){
        return res.status(401).json({
            type:"error",
            message:"Invalid token!"
        })
    }

    //if token does not have a payload id
    if(!id){
        return res.status(401).json({
            type:"error",
            message:"Invalid token!"
        })
    }

    //see if we could find user in database
    const user = await User.findById(id);

    if(!user){
        return res.status(401).json({
            type:"error",
            message:"user doesn't exist!"
        })
    }

    //if user exists, that means token is valid
    //lets set user prop verify to true and save it
    //we'll add a new field "user" to the request object
    // user.verified = true
    // await user.save()
    req.user = user;

    //call the next middleware
    next();    
};

module.exports = { protected };