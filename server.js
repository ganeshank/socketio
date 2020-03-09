const io = require('socket.io')();
const uuidv1 =  require('uuid/v1');
const messageHandler = require("./handlers/message.handler");

const users = {};

function createUserAvatarUrl(){
    const rand1 = Math.round(Math.random() * 200 + 100);
    const rand2 = Math.round(Math.random() * 200 + 100);
    return `https://placeimg.com/${rand1}/${rand2}/any`;
}

function createUsersOnline(){
    const values = Object.values(users);
    const onlyWithUsername = values.filter(u => u.username != undefined);
    return onlyWithUsername;
}

io.on("connection", socket =>{
    console.log("A user connected!");
    console.log(socket.id);
    users[socket.id] = { userId: uuidv1() };

    socket.on("disconnect", () =>{
        delete users[socket.id];
        io.emit("action",{type:"users_online", data: createUsersOnline()});
    })

    
    socket.on("action", action =>{
        switch(action.type){
            case "server/join":
                console.log("Get join event", action.data);
                users[socket.id].username = action.data;
                users[socket.id].avatar = createUserAvatarUrl();
                
                // io.emit vs socket.emit (io used when distribute to all and socket for current user only)
                io.emit("action",{type:"users_online", data: createUsersOnline()});
                socket.emit("action", {type: "self_user", data: users[socket.id]});
                break;
            case "server/private_message":
                const conversationId = action.data.conversationId;
                const from = users[socket.id].userId;
                const userValues = Object.values(users);
                const socketIds = Object.keys(users);
                for(let i = 0; i < userValues.length; i++){
                    if(userValues[i].userId === conversationId){
                        const socketId = socketIds[i];
                        console.log("private sent back", socketId);
                        io.sockets.sockets[socketId].emit("action", {
                            type: "private_message",
                            data: {
                                ...action.data,
                                conversationId: from
                            }
                        });
                        break;
                    }
                }
                break;
        }   
    })
});
io.listen(3001);