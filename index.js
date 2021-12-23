const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer,{ 
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }});
let rooms = {

};

io.on("connection", (socket) => {
    socket.on('username', username => {
      socket.username = username;
      socket.emit('username', `"${username}"名稱設定完成`);
    });

    socket.on('create', roomname => {
      let room = rooms[roomname];
      if(room) return socket.emit('error', '房間名稱重複');
      socket.join(roomname)
      rooms[roomname] = {count: 1, step:[]};
      socket.first = true;
      socket.roomname = roomname;
      socket.emit('create', `房間"${roomname}"建立完成，請將房間名稱告知對手`);
    });

    socket.on('leave', roomname => {
      let room = rooms[roomname];
      if(!room) return socket.emit('error', `你沒有加入"${roomname}"房間`);
      socket.to(roomname).emit('leave');
      delete rooms[roomname];
    });

    socket.on("disconnect", (reason) => {
      let roomname = socket.roomname;
      if(!roomname) return;
      socket.to(roomname).emit('leave');
      delete rooms[roomname];
    });
});

httpServer.listen(3001);