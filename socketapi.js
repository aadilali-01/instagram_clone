const io = require("socket.io")();
const socketapi = {
    io: io
};

const userModel = require('./routes/users')
const chatsModel = require('./routes/chats')

io.on("connection", async function (socket) {
    console.log("A user connected");

    let loggedinuserId = socket.handshake.auth.token
    await userModel.findByIdAndUpdate({_id: loggedinuserId},{$set:{is_online: '1'}})

    socket.broadcast.emit('getOnlineUser',{loggedinuserId: loggedinuserId})

    socket.on('data',function(data){
        console.log("click !")
        io.emit("send",data)
    })

    socket.on("typing",function(data){
        socket.broadcast.emit("done",data)
    })

    socket.on("disconnect",async function(){
        console.log("disconnected")

        let loggedinuserId = socket.handshake.auth.token
        await userModel.findByIdAndUpdate({_id: loggedinuserId},{$set:{is_online: '0'}})

        socket.broadcast.emit('getOfflineUser',{loggedinuserId: loggedinuserId})
    })

    socket.on("message",function(data){
        chatsModel.create({
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
            message: data.message,
        })
        socket.broadcast.emit("message",data)
    })

    socket.on("userDetails",function(data){
        userModel.findOne({_id: data}).then(function(receiver){
            socket.emit("user-details",receiver)
        })
    })

    //load exist chats
    socket.on("existchat",async function(data){
        let chats = await chatsModel.find({$or: [
            {sender_id: data.sender_id, receiver_id: data.receiver_id},
            {sender_id: data.receiver_id, receiver_id: data.sender_id}
        ]})
        // console.log(chats)
        socket.emit("loadchats",chats)
    })

    
});



module.exports = socketapi;