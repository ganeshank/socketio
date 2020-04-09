const io = require('socket.io')();
const uuidv1 =  require('uuid/v1');
const messageHandler = require("./handlers/message.handler");
const https = require('https');

const users = {};
var users1 = {};
var allUsers = {};
var conversation = {};

function createUserAvatarUrl(){
    const rand1 = Math.round(Math.random() * 200 + 100);
    const rand2 = Math.round(Math.random() * 200 + 100);
    return `https://placeimg.com/${rand1}/${rand2}/any`;
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function createUsersOnline(){
    console.log(users);
    const values = Object.values(users);
    const onlyWithUsername = values.filter(u => u.username != undefined);
    return onlyWithUsername;
}

function getAllRegisteredUsers(username, socket){
    return new Promise((resolve, reject) => {
        https.get('https://poasana.000webhostapp.com/api/getallusers.php?user='+username+'&socket='+socket, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                //console.log("data--", data);
                resolve(data.toString());
            });

            resp.on('error', function(err) {
                // Second reject
                console.log("Error----",err)
               // reject(err);
            });

        })
    });
}

function getConversations(userid){
    return new Promise((resolve, reject) => {
        https.get('https://poasana.000webhostapp.com/api/getchat.php?id='+userid, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                //console.log("data--", data);
                resolve(data.toString());
            });

            resp.on('error', function(err) {
                // Second reject
                console.log("Error----",err)
               // reject(err);
            });

        })
    });
}

function getOffline(userId){
    https.get('https://poasana.000webhostapp.com/api/getoffline.php?id='+userId);
}

io.on("connection", socket =>{
    console.log("A user connected!");
    console.log(socket.id);
    console.log("allUsers--", allUsers);
    users[socket.id] = { userId: uuidv1() };

    

    socket.on("disconnect", async () =>{
        try{
            // for(var attributename in allUsers){
            //     console.log(allUsers[attributename].isOnline+": "+allUsers[attributename].socket+"..."+socket.id);
            //     if(allUsers[attributename].isOnline==1 && allUsers[attributename].socket === socket.id){
            //         getOffline(allUsers[attributename].userId);
            //         allUsers[attributename].isOnline = 0;
            //         console.log("Updated for user--", allUsers[attributename].userId);
            //         break;
            //     }
            // }
            
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
                // allUsers = JSON.parse(response);
                // users1 = Object.values(allUsers);
                io.emit("action",{type:"users_online", data: users1});
                socket.emit("action", {type: "self_user", data: allUsers[action.data]});
                // io.emit vs socket.emit (io used when distribute to all and socket for current user only)
                break;                
            case "server/private_message":
                const conversationId = action.data.conversationId;  
                const conversationName = action.data.conversationName;               
                const from = conversationName;
                const userValues = Object.values(allUsers);
                console.log("conversationId---",conversationId);
                console.log("conversationName---",conversationName);
                //const socketIds = Object.keys(allUsers);
                for(let i = 0; i < userValues.length; i++){
                    if(userValues[i].userId === conversationId){
                        const socketId = userValues[i].socket;
                        console.log("private sent back", userValues[i]);
                        console.log("private sent back", socketId);
                        console.log("private sent back", from);
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
            case "server/user_login":
                try{
                const username = action.data;
                console.log("Call for new users list111....");
                const response = await getAllRegisteredUsers(username, socket.id);
                console.log("Call for new users list222....");
                allUsers = JSON.parse(response);
                allUsers[username].socket = socket.id;
                users1 = Object.values(allUsers);
                                
                //io.emit("action",{type:"users_online", data: users1, chatconversations: allUsers[username].userId});
                }catch(ex){
                    console.log("EEEEE--", ex)
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
        }   
    })
});
io.listen(3001);