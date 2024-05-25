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
  database: "api_test"
});

let instance;
const startMySQLEvents = async () => {
  try {
    instance = new MySQLEvents(connection, { startAtEnd: true });
    await instance.start();

    instance.addTrigger({
      name: 'monitoring',
      expression: 'sekolahan.user',
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
  console.log("user connected");
});

httpServer.listen(3000, () => console.log("Server running on port 3000"));
