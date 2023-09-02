var mongoose = require('mongoose');
var plm = require('passport-local-mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/instagram');

var userSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  facebookId: String,
  forgotToken: String,
  maxTime: String,
  profileImage: {
    type: String,
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
  },
  bio:{
    type: String,
  },
  post: {
    type: String,
    default: "123456.jpg"
  },
  allposts: {
    type: Array,
    default: [],
  },
  follower:{
    type: Array,
    default: []
  },
  following:{
    type: Array,
    default: []
  },
  is_online:{
    type: String,
    default: '0'
  }
})

userSchema.plugin(plm);


module.exports = mongoose.model('user',userSchema);