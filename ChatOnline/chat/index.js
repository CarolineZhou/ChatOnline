const express = require("express");
const fs = require("fs");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

eval(fs.readFileSync("name.js") + "");

const online_users = [];
const history = [];

io.on("connection", function(socket) {
  let name = generateName();
  let font_color = "#800000";

  // client has an existing name
  socket.on("returnUser", function(returnName) {
    if (online_users.includes(returnName)) {
      // name is already taken by someone else - generate a unique name to assign to the client
      while (online_users.indexOf(name) != -1) {
        name = generateName();
      }

      // send the new name to the client
      socket.emit("name", name);

      // add the new name to list of online users
      online_users.push(name);
    } else {
      // if name is not taken, let the client use its own name and add the name to the list of online users
      online_users.push(returnName);

      // set the name variable to the user specified name
      name = returnName;
    }

    // transfer all chat history to client
    socket.emit("all history", history);

    // send updated list of online users to all clients
    io.sockets.emit("updateOnlineUsers", online_users);
  });

  // client needs a new name
  socket.on("newName", function() {
    // generate a unique name to assign to the client
    while (online_users.indexOf(name) != -1) {
      name = generateName();
    }

    // send the new name to the client
    socket.emit("name", name);

    // add the new name to list of online users
    online_users.push(name);

    // transfer all chat history to client
    socket.emit("all history", history);

    // send updated list of online users to all clients
    io.sockets.emit("updateOnlineUsers", online_users);
  });

  // client sent a chat message or a command
  socket.on("chat message", function(msg) {
    // regex to match commands
    const regex = "^(/.*) (.*)$";

    // try a match with match command regex
    const match_regex = msg.match(regex);

    // chek if the client sent a command
    if (match_regex && !match_regex[1].localeCompare("/nickcolor")) {
      // color change request
      // check if the color req is in the correct format or not
      // length must equal to 6 with only with number and character
      const color_regex = "^([a-zA-Z0-9])+$";
      const match_color_regex = match_regex[2].match(color_regex);

      if (match_color_regex && match_regex[2].length === 6) {
        // color format is correct, change font color
        font_color = "#" + match_regex[2];
      } else {
        // color format is incorrect, send error message
        socket.emit("error message", " <Wrong color format>");
      }
    } else if (match_regex && !match_regex[1].localeCompare("/nick")) {
      let tempName = match_regex[2];
      // nickname change request
      // check if the name they wish to update already exist in the list
      if (online_users.includes(tempName)) {
        // if the name exists, send out an error message
        socket.emit(
          "error message",
          " <Username taken, please choose a another name!>"
        );
      } else {
        // if the name does not exist, then change the name and tell the client
        socket.emit("name", tempName);

        // update the online users list
        let index_of_user = online_users.indexOf(name);
        online_users[index_of_user] = tempName;

        // update the name variable
        name = tempName;

        // send updated list of online users to all clients
        io.sockets.emit("updateOnlineUsers", online_users);
      }
    } else if (!msg.slice(0, 1).localeCompare("/")) {
      // check if it's a invalid command - if so then send the error message to the client
      socket.emit("error message", "<Invalid command!>");
    } else {
      // add the current date and client's font color and name and send the message to everyone
      msg = Date.now() + ":" + font_color + ":" + name + ": " + msg;
      io.sockets.emit("chat message", msg);

      // add the message to the history
      history.push(msg);
    }
  });

  // client is disconnected
  socket.on("disconnect", function() {
    // remove the disconnected client's name from the list of online users
    const indexToRemove = online_users.indexOf(name);
    if (indexToRemove > -1) {
      online_users.splice(indexToRemove, 1);

      // send updated list of online users to all clients
      io.sockets.emit("updateOnlineUsers", online_users);
    }
  });
});

// start listening for requests
http.listen(3000, function() {
  console.log("listening on *:3000");
});
