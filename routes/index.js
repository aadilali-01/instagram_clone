var express = require("express");
var router = express.Router();
const passport = require("passport");
const localStrategy = require("passport-local");
const userModel = require("./users.js");
var FacebookStrategy = require("passport-facebook");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const postModel = require("./posts.js");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const mongoose = require("mongoose");
const storyModel = require("./story.js");
var moment = require('moment'); // moment.js
const mailer = require('../nodemailer.js')



passport.use(new localStrategy(userModel.authenticate()));

//using grid fs

var conn = mongoose.createConnection("mongodb://127.0.0.1:27017/instagram");
let gfs, gridfsBucket;
conn.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
  });

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

//create storage engine

const storage = new GridFsStorage({
  url: "mongodb://127.0.0.1:27017/instagram",
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });




router.get("/", function (req, res) {
  res.render("index");
});

router.post("/search",async function(req, res){
  let username = req.body.username.trim();
  let user = await userModel.find({
    "$or": [
      {"username": {$regex:new RegExp("^" + username + ".*", "i")}}
    ]
  })
  console.log(user);
  res.send({user: user})
})

router.post("/searchemail",async function(req, res){
  let email = req.body.email.trim();
  let user = await userModel.find({
    "$or": [
      {"email": {$regex:new RegExp("^" + email + ".*", "i")}}
    ]
  })
  console.log(user);
  res.send({user: user})
})

router.post("/register", function (req, res, next) {
  var newUser = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });
  userModel
    .register(newUser, req.body.password)
    .then(function (u) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/instagram");
      });
    })
    .catch(function (err) {
      res.send(err);
    });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/instagram",
    failureRedirect: "/",
  }),
  function (req, res, next) {}
);

function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/");
  }
}

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/reset",async function(req,res){
  let user = await userModel.findOne({email: req.body.email});
  if(user){
    crypto.randomBytes(17,async function(err,buff){
      var rnstr = buff.toString("hex");
      user.forgotToken = rnstr;
      let time_allowed = Date.now()+24*60*60*1000;
      user.maxTime = time_allowed;
      user.save();
      await mailer(user.email,user._id,rnstr)
      res.render("emailsent",{user});
    })
  }else{
    res.send("Your account does not exist")
  }
})

router.get('/reset/:userid/:token',async function(req, res, next){
  let user = await userModel.findOne({_id: req.params.userid})
  if(user.forgotToken === req.params.token && user.maxTime > Date.now()){
    res.render('reset',{id: user._id})
  }else{
    res.send("link expired")
  }
})

router.post('/resetpassword', async function(req, res){
  let user = await userModel.findOne({_id: req.body.userid})
  console.log(user)
  user.setPassword(req.body.newPassword,function(){
    user.save()
  })
})

router.get("/signup", function (req, res, next) {
  res.render("signup");
});

router.get("/login/federated/facebook", passport.authenticate("facebook"));

require("dotenv").config();
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env["FACEBOOK_CLIENT_ID"],
      clientSecret: process.env["FACEBOOK_CLIENT_SECRET"],
      callbackURL: "/oauth2/redirect/facebook",
      state: true,
    },
    async function verify(accessToken, refreshToken, profile, cb) {
      console.log(accessToken, refreshToken, profile);
      console.log(profile);
      let user = await userModel.findOne({ username: `${profile.displayName}_${profile.provider}` });
      if (user) {
        return cb(null, user);
      } else {
        let newUser = await userModel.create({ name: profile.displayName, username: `${profile.displayName}_${profile.provider}` });
        return cb(null, newUser);
      }
    }
  )
);

router.get(
  "/oauth2/redirect/facebook",
  passport.authenticate("facebook", {
    successRedirect: "/instagram",
    failureRedirect: "/login",
  })
);

router.get("/instagram", isloggedIn, async function (req, res, next) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let allposts = await postModel.find().populate("userid");
  let allstories = await storyModel.find().populate("userid");
  let story = await storyModel.findOne({ userid: loggedinuser._id });
  let allusers = await userModel.find()
  res.render("instagram", {
    loggedinuser: loggedinuser,
    allposts: allposts,
    story: story,
    allstories: allstories,
    allusers: allusers
  });
});

router.get("/profile/:username", isloggedIn, async function (req, res, next) {
  let user = await userModel.findOne({ username: req.params.username });
  let followers = await userModel.find({_id: user.follower})
  let followings = await userModel.find({_id: user.following})
  let allpost = await postModel.find({userid: user._id}).populate("userid")
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render("profile", { user: user, loggedinuser: loggedinuser, followers: followers, followings: followings,allpost: allpost});
});

router.post(
  "/upload",
  upload.single("profileImage"),
  function (req, res, next) {
    userModel
      .findOne({ username: req.session.passport.user })
      .then(function (loggedinuser) {
        loggedinuser.profileImage = req.file.filename;
        loggedinuser.save().then(function (done) {
          res.redirect("back");
        });
      });
  }
);

router.get("/files/:filename", async function (req, res) {
  let file = await gfs.files.findOne({ filename: req.params.filename });
  if (!file || file.length === 0) {
    return res.status(404).json({
      err: "no such file or directory",
    });
  } else {
    return res.json(file);
  }
});

router.get("/image/:filename", async function (req, res) {
  let file = await gfs.files.findOne({ filename: req.params.filename });
  if (!file || file.length === 0) {
    return res.status(404).json({
      err: "no such file or directory",
    });
  }
  if (
    file.contentType === "image/jpeg" ||
    file.contentType === "image/png" ||
    file.contentType === "image/webp" ||
    file.contentType === "image/jpg"
  ) {
    const readstream = gridfsBucket.openDownloadStream(file._id);
    readstream.pipe(res);
  } else {
    res.status(404).json({
      err: "not an image",
    });
  }
});

router.get("/video/:filename", async function (req, res) {
  let file = await gfs.files.findOne({ filename: req.params.filename });
  if (!file || file.length === 0) {
    return res.status(404).json({
      err: "no such file or directory",
    });
  }
  if (file.contentType === "video/mp4") {
    const readstream = gridfsBucket.openDownloadStream(file._id);
    readstream.pipe(res);
  } else {
    res.status(404).json({
      err: "not an image",
    });
  }
});

router.get("/instagram/accounts/edit", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render("editProfile", { loggedinuser });
});

router.post("/update", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    {
      username: req.body.username,
      name: req.body.name,
      email: req.body.email,
      bio: req.body.bio,
    }
  );
  console.log(req.body.name)
  res.redirect(`/profile/${loggedinuser.username}`);
});

router.get("/createpost", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user
  });
  res.render("createpost", { loggedinuser });
});

router.get("/allposts", async function (req, res) {
  let all = await postModel.find().populate("userid");
  res.send(all);
});

router.get("/alluser", async function (req, res) {
  let allusers = await userModel.find();
  res.render("alluser", { allusers });
});

router.post(
  "/createpost",
  upload.single("filename"),
  function (req, res, next) {
    userModel
      .findOne({ username: req.session.passport.user })
      .then(function (loggedinuser) {
        console.log(req.file);
        loggedinuser.post = req.file.filename;
        loggedinuser.allposts.push(req.file.filename);
        loggedinuser.save().then(function (done) {
          res.redirect("back");
        });
      });
  }
);

router.post("/uploadpost", async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let posts = await postModel.create({
    caption: req.body.caption,
    image: loggedinuser.post,
    userid: loggedinuser._id,
    dateAndtime: new Date().toLocaleString(),
  });
  posts.save()
  loggedinuser.post = "";
  res.redirect("/instagram");
});

// randomizing the posts using this function

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

router.get("/explore", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let allposts = await postModel.find().populate("userid");
  shuffle(allposts);
  console.log(allposts);
  res.render("explore", { loggedinuser: loggedinuser, allposts: allposts });
});

router.post("/follow", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let user = await userModel.findOne({ _id: req.body.userid });
  loggedinuser.following.push(user._id);
  loggedinuser.save();
  user.follower.push(loggedinuser._id);
  user.save();
  console.log(loggedinuser.following);
  console.log(user.follower);
  res.send({user: user, loggedinuser: loggedinuser} )
  
});

router.post("/unfollow", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let user = await userModel.findOne({ _id: req.body.userid });
  let loggedinuserIndex = user.follower.indexOf(loggedinuser._id);
  let userIndex = loggedinuser.following.indexOf(user._id);
  user.follower.splice(loggedinuserIndex, 1);
  loggedinuser.following.splice(userIndex, 1);
  user.save();
  loggedinuser.save();
  let followers = await userModel.find({_id: user.follower})
  res.send({user: user,loggedinuser: loggedinuser,followers: followers});
});

router.post(
  "/createstory/:id",
  isloggedIn,
  upload.single("storyfile"),
  async function (req, res) {
    let loggedinuser = await userModel.findOne({
      username: req.session.passport.user,
    });
    let timeAllowed = Date.now() + 24*60*60*1000;
    let story = await storyModel.findOne({ userid: req.params.id });
    if(story === null){
      let stories = await storyModel.create({
        userid: loggedinuser._id,
      });
      stories.image.push({file: req.file.filename,
        date: new Date().toLocaleTimeString(undefined, { timeStyle: "short" }),
        maxtime: timeAllowed})
      stories.save();
      res.redirect("back");

    }else{
      story.image.push({
        file: req.file.filename,
        date: new Date().toLocaleTimeString(undefined, { timeStyle: "short" }),
        maxtime: timeAllowed
      });
      story.save();
      res.redirect("back");
    }
  }
);

router.get("/stories/:username/:id", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let story = await storyModel.findOne({ userid: req.params.id });
  res.render("stories", { loggedinuser: loggedinuser, story: story });
});

router.post("/like", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let post = await postModel.findOne({ _id: req.body.postId });
  post.likes.push( loggedinuser._id);
  post.likeuser.push(loggedinuser)
  post.save();
  res.send({success: true,likes: post.likes.length});
});

router.post("/unlike", isloggedIn, async function (req, res) {
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  let post = await postModel.findOne({ _id: req.body.postId });
  var unlike = post.likes.indexOf(loggedinuser._id);
  post.likes.splice(unlike,1)
  post.save();
  res.send({success: true,likes: post.likes.length});
});

router.post("/comment",isloggedIn,async function(req,res){
  let loggedinuser  = await userModel.findOne({username: req.session.passport.user})
  let post = await postModel.findOne({_id: req.body.postId})
  post.comments.push({loggedinuser: loggedinuser, CommentByuser: req.body.commentValue})
  post.save()
  res.send({success: true, commentArray: post.comments})
})

router.post("/getusers", async function (req, res) {
  let payload = req.body.payload.trim();
  let search = await userModel
    .find({ username: { $regex: new RegExp("^" + payload + ".*", "i") } })
    .exec();
  search = search.slice(0, 10);
  res.send({ payload: search });
});

router.post("/profile/getusers", async function (req, res) {
  let payload = req.body.payload.trim();
  let search = await userModel
    .find({ username: { $regex: new RegExp("^" + payload + ".*", "i") } })
    .exec();
  // search = search.slice(0, 10);
  res.send({ payload: search });
});

router.post("/instagram/accounts/getusers", async function (req, res) {
  let payload = req.body.payload.trim();
  let search = await userModel
    .find({ username: { $regex: new RegExp("^" + payload + ".*", "i") } })
    .exec();
  search = search.slice(0, 10);
  res.send({ payload: search });
});

// chatting feature with socket.io

router.get("/inbox", isloggedIn, async function (req, res) {
  let allusers = await userModel.find();
  let loggedinuser = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render("inbox", { loggedinuser: loggedinuser, allusers: allusers });
});

router.get('/forgot',function(req,res){
  res.render("forgot")
})

router.get("/reels",isloggedIn,async function(req,res){
  let loggedinuser = await userModel.findOne({username: req.session.passport.user})
  let posts = await postModel.find().populate("userid")
  shuffle(posts)
  res.render("reels",{loggedinuser: loggedinuser,posts: posts})
})

module.exports = router;
