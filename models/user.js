const { Schema, model } = require("mongoose");

const userSchema = new Schema({
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    verified:{
        type:Boolean,
        default:false,
    },
    refreshToken: {
        type:String,       
    },
});

module.exports = model("User", userSchema);