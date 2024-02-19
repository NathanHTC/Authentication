var express = require("express");
var router = express.Router();

router.get("/", function(req, res){
    res.send("hello express!! from index router");
});
module.exports = router;