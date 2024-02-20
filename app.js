require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');

const PORT = process.env.PORT || 8080;
const app = express();
console.log(process.env.MONGO_URI)
mongoose.connect(process.env.MONGO_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
})
.then(() => {
    console.log("MongoDB connection is estabilised on databse: ", mongoose.connections[0].name);
})
.catch(err => console.error("mongoDB connection error: ", err))


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/auth", authRouter); 

app.listen(PORT, function(){
    console.log(`Listening on port ${PORT}`);
});

