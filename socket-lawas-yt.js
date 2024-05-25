const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {  
  cors: {
    origin: "*"
  }
});

// Move connection and instance outside the connection handler
const connection = mysql.createConnection({
  host: 'localhost', //CHANGE THIS
  user: 'root',
  password: '',
  database: "sekolahan"
});

let instance;
const startMySQLEvents = async () => {
  try {
    instance = new MySQLEvents(connection, { startAtEnd: true });
    await instance.start();

    instance.addTrigger({
      name: 'monitoring',
      expression: 'sekolahan.user',
      //sekolahan is database
      //user is table
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: (event) => {
        console.log(event);
        if (event) {
          const sql = "SELECT * FROM user";
          connection.query(sql, (err, result) => {
            if (err) throw err;
            console.log(result);
            io.emit("hasilnya", { data: result });
          });
        }
      },
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
  } catch (err) {
    console.error('Error starting MySQL events:', err);
  }
};

io.on("connection", (socket) => {
  if (!instance) {
    startMySQLEvents();
  }

  const sql = "SELECT * FROM user";
  connection.query(sql, (err, result) => {
    if (err) throw err;
    console.log(result);
    socket.emit("getfirst", result);
  });

  socket.on("deletesocket", (id) => {
    const sql = `DELETE FROM user WHERE id='${id.id}'`;
    connection.query(sql, (err, result) => {
      if (err) throw err;
      console.log(result);
    });
  });

  socket.on("editsocket", (data) => {
    const sql = `UPDATE user SET nama='${data.editdata}' WHERE id='${data.id}'`;
    connection.query(sql, (err, result) => {
      if (err) throw err;
      console.log(result);
    });
  });

  socket.on("addnewitem", (newinput) => {
    const sql = `INSERT INTO user (nama) VALUES('${newinput.newinput}')`;
    console.log(newinput);
    connection.query(sql, (err, result) => {
      if (err) throw err;
      console.log(result);
    });
  });

  console.log("user connected");
});

httpServer.listen(3000, () => console.log("Server running on port 3000"));
