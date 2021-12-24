const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer,{ 
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }});
let rooms = {

};

io.on("connection", (socket) => {
    socket.status = 'free';

    socket.on('create', ({username, roomname}) => {
      if(rooms[roomname]) return socket.emit('error', '房間名稱重複');
      socket.username = username;
      socket.join(roomname)
      rooms[roomname] = {count: 1, step:{}, host: username, guest: '', roomname, who:'host'};
      socket.status = 'host';
      socket.roomname = roomname;
      socket.emit('create', rooms[roomname]);
    });

    socket.on('restart', ({username, roomname}) => {
      if(!rooms[roomname]) return socket.emit('error', '房間尚未建立');
      if(rooms[roomname].count !== 2) return socket.emit('error', '房間尚未開始對弈');
      if(!rooms[roomname].end) return socket.emit('error', '對弈尚未結束');
      rooms[roomname].end = undefined;
      rooms[roomname].who = 'host';
      rooms[roomname].step = {};
      socket.emit('restart', rooms[roomname])
      socket.to(roomname).emit('restart', rooms[roomname]);
    });

    socket.on('join', ({username, roomname}) => {
      if(!rooms[roomname]) return socket.emit('error', '房間尚未建立');
      if(rooms[roomname].count === 2) return socket.emit('error', '房間已開始對弈');
      if(rooms[roomname].host === username) return socket.emit('error', '名稱與房主重複');
      socket.username = username;
      socket.join(roomname)
      rooms[roomname].count = 2;
      rooms[roomname].guest = username;
      socket.status = 'guest';
      socket.roomname = roomname;
      socket.emit('join', rooms[roomname]);
      socket.to(roomname).emit('step', rooms[roomname]);
    });

    socket.on('step', ({who, index}) => {
      const roomname = socket.roomname;
      if(!rooms[roomname]) return socket.emit('error', '房間尚未建立');
      if(rooms[roomname].count !== 2) return socket.emit('error', '房間尚未開始對弈');
      if(rooms[roomname].end) return socket.emit('error', '棋局已經結束');
      if(rooms[roomname].step[index]) return socket.emit('error', '此步已被下子');
      rooms[roomname].step[index] = {
        who,
      }
      rooms[roomname].who = who === 'host' ? 'guest' : 'host';
      socket.emit('step', rooms[roomname]);
      socket.to(roomname).emit('step', rooms[roomname]);
      if(Object.keys(rooms[roomname].step).length > 4) {
        const check_end = (end) => {
          if(rooms[roomname].step[0]?.who === end && rooms[roomname].step[1]?.who === end && rooms[roomname].step[2]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[3]?.who === end && rooms[roomname].step[4]?.who === end && rooms[roomname].step[5]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[6]?.who === end && rooms[roomname].step[7]?.who === end && rooms[roomname].step[8]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[0]?.who === end && rooms[roomname].step[3]?.who === end && rooms[roomname].step[6]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[1]?.who === end && rooms[roomname].step[4]?.who === end && rooms[roomname].step[7]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[2]?.who === end && rooms[roomname].step[5]?.who === end && rooms[roomname].step[8]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[0]?.who === end && rooms[roomname].step[4]?.who === end && rooms[roomname].step[8]?.who === end) rooms[roomname].end = end;
          if(rooms[roomname].step[2]?.who === end && rooms[roomname].step[4]?.who === end && rooms[roomname].step[6]?.who === end) rooms[roomname].end = end;
        }
        
        check_end(who);
        if(rooms[roomname].end) {
          socket.emit('end', rooms[roomname]);
          socket.to(roomname).emit('end', rooms[roomname]);
        }
      }
    });

    socket.on('leave', roomname => {
      if(!rooms[roomname]) return socket.emit('error', `你沒有加入"${roomname}"房間`);
      socket.leave(roomname)
      socket.emit('leave', {username:socket.username});
      if(rooms[roomname].count === 1 || socket.status === 'host') {
        delete rooms[roomname];
        socket.to(roomname).emit('leave', {username:socket.username});
        io.in(roomname).socketsLeave(roomname);
      } else {
        rooms[roomname] = {
          ...rooms[roomname],
          count: 1,
          step:{},
          guest: '',
        }
        socket.to(roomname).emit('restart', rooms[roomname]);
      }
      socket.status = 'free';
    });

    socket.on("disconnect", (reason) => {
      let roomname = socket.roomname;
      if(!rooms[roomname]) return socket.emit('error', `你沒有加入"${roomname}"房間`);
      socket.leave(roomname)
      socket.emit('leave', {username:socket.username});
      if(rooms[roomname].count === 1 || socket.status === 'host') {
        delete rooms[roomname];
        socket.to(roomname).emit('leave', {username:socket.username});
        io.in(roomname).socketsLeave(roomname);
      } else {
        rooms[roomname] = { 
          ...rooms[roomname],
          count: 1,
          step:{},
          guest: '',
        }
        socket.to(roomname).emit('restart', rooms[roomname]);
      }
      socket.status = 'free';
    });
});

httpServer.listen(3001);