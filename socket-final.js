const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

const app = express();
const port = 3000; // Change this to your desired port
const httpServer = createServer(app);
const io = new Server(httpServer, {  
  cors: {
    origin: "*"
  }
});

app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: "api_test"
});

connection.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.post('/strikes', (req, res) => {
  const { id, name, description } = req.body;
  const sql = "INSERT INTO strikes (id, name, description) VALUES (?, ?, ?)";
  connection.query(sql, [id, name, description], (err, result) => {
    if (err) {
      res.status(500).send('Error saving data');
      return;
    }
    res.status(201).send('Data saved successfully');
  });
});

let instance;
const startMySQLEvents = async () => {
  try {
    instance = new MySQLEvents(connection, { startAtEnd: true });
    await instance.start();

    instance.addTrigger({
      name: 'monitoring',
      expression: 'api_test.strikes',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: (event) => {
        if (event) {
          const sql = "SELECT * FROM strikes";
          connection.query(sql, (err, result) => {
            if (err) throw err;
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

  const sql = "SELECT * FROM strikes";
  connection.query(sql, (err, result) => {
    if (err) throw err;
    socket.emit("getfirst", result);
  });
  console.log("user connected");
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
});
