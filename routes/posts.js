var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/instagram');

var postsSchema = mongoose.Schema({
  image: String,
  likes: {
    type: Array,
    default: []
  },
  likeuser: {
    type: Array,
    default: []
  },
  comments: {
    type: Array,
    default: []
  },
  userid: {type: mongoose.Schema.Types.ObjectId, ref:"user"},
  caption: String,
  dateAndtime: String
  
})



module.exports = mongoose.model('posts',postsSchema);