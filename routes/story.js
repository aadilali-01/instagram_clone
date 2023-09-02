var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/instagram');

var storiesSchema = mongoose.Schema({
  image: {
    type: Array,
    default: []
  },
  userid: {type: mongoose.Schema.Types.ObjectId, ref:"user"},
  dateAndtime: String,
  maxtime: String,
  
})



module.exports = mongoose.model('story',storiesSchema);