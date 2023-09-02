var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/instagram');

var chatsSchema = mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId, ref: 'user'
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId, ref: 'user'
  },
  message: {
    type: String,
    required: true
  }
  
})



module.exports = mongoose.model('chats',chatsSchema);