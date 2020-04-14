const io = require('socket.io')();
const uuidv1 =  require('uuid/v1');
const messageHandler = require("./handlers/message.handler");
const https = require('https');

const users = {};
var users1 = {};
var allUsers = {};
var conversation = {};

function getOffline(userId){
    try{
        https.get('https://poasana.000webhostapp.com/api/getoffline.php?id='+userId);
    }catch(ex){
        console.log("error--", ex);
    }    
}

io.on("connection", socket =>{
    console.log("A user connected!");
    console.log(socket.id);
    users[socket.id] = { userId: uuidv1() };
    socket.emit("action", {type: "socket_update", data: socket.id});    

    socket.on("disconnect", async () =>{
        try{
            for(var attributename in allUsers){
                console.log(allUsers[attributename].isOnline+": "+allUsers[attributename].socket+"..."+socket.id);
                if(allUsers[attributename].isOnline==1 && allUsers[attributename].socket === socket.id){
                    getOffline(allUsers[attributename].userId);
                    allUsers[attributename].isOnline = 0;
                    console.log("Updated for user--", allUsers[attributename].userId);
                    users1 = Object.values(allUsers);
                    io.emit("action",{type:"users_online", data: users1});
                    break;
                }
            }
            
            delete users[socket.id];
            // console.log("All done1111");
            // users1 = Object.values(allUsers);
            // io.emit("action",{type:"users_online", data: users1});
        }catch(ex){
            console.log("Error--", ex);
        }
        
    })

    
    socket.on("action", async action =>{
        switch(action.type){
            case "server/join":
                // console.log("Get join event", action.data);
                // console.log("Get join event", allUsers[action.data]);
                // allUsers[action.data].socket = socket.id;
                // console.log("Get join event", allUsers[action.data]);

                // const response = await getAllRegisteredUsers(action.data);
                // allUsers = JSON.parse(action.data.allUsers);
                allUsers = action.data.allUsers;
                users1 = Object.values(action.data.allUsers);
                io.emit("action",{type:"users_online", data: users1});
                socket.emit("action", {type: "self_user", data: allUsers[action.data.username]});
                socket.emit("action", {type: "login_flag", data: false});
                // io.emit vs socket.emit (io used when distribute to all and socket for current user only)
                break;                
            case "server/private_message":
                const conversationId = action.data.conversationId;  
                const senderId = action.data.senderId;
                const userValues = action.data.users;               
                
                console.log("conversationId---",conversationId);
                for(let i = 0; i < userValues.length; i++){
                    if(userValues[i].userId === conversationId){
                        const socketId = userValues[i].socket;
                        console.log("private sent back", userValues[i]);
                        console.log("private sent back", socketId);
                        console.log("private sent back", senderId);
                        io.sockets.sockets[socketId].emit("action", {
                            type: "private_message",
                            data: {
                                ...action.data,
                                conversationId: senderId
                            }
                        });
                        break;
                    }
                }
                break;
            case "server/user_signup":
                console.log("A new user signedup.......");
                
            break;
            case "server/public_message":
                const cId = action.data.conversationId;  
                const message = action.data.message;
                
                socket.broadcast.emit("action",{type:"public_message", 
                    data: {
                        ...action.data,
                        conversationId: cId
                    }}
                );
            break;
            case "server/logout":
                for(var attributename in allUsers){
                    console.log(allUsers[attributename].isOnline+": "+allUsers[attributename].socket+"..."+socket.id);
                    if(allUsers[attributename].isOnline==1 && allUsers[attributename].socket === socket.id){
                        getOffline(allUsers[attributename].userId);
                        allUsers[attributename].isOnline = 0;
                        console.log("Updated for user--", allUsers[attributename].userId);
                        users1 = Object.values(allUsers);
                        io.emit("action",{type:"users_online", data: users1});
                        //socket.emit("action",{type:"assigntoken", data: null});
                        break;
                    }
                }
            break;
        }   
    })
});
io.listen(3001);