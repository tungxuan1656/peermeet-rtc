var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var passport = require('passport');

var app = express();
const PORT = process.env.PORT || 3000;
var server = app.listen(PORT, function () {
	console.log("Node app is running on port:", PORT);
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(expressSession({
	secret: 'tungxuan',
    resave: true,
	saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 50 * 5 //đơn vị là milisecond
    }
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/*
	Login passport
*/
var localStrategy = require('passport-local').Strategy;
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new localStrategy(
	(username, password, done) => { //các tên - name trường cần nhập, đủ tên trường thì Done 
		var regex = /^[A-Za-z0-9]+$/;
		var valid = regex.test(username);
		// console.log(valid, username);
		if (valid) {
			return done(null, username); //trả về username
		} else {
			return done(null, false); //chứng thực lỗi
		}
	}
));

app.route('/login')
.get((req, res) => res.render('login'))
.post(passport.authenticate('local', { 
    failureRedirect: '/login',
    successRedirect: '/rooms'
}));

app.get('/', (req, res) =>  {
	if (req.isAuthenticated()) res.render("index", { username: req.user });
	else res.redirect('/login');
});
app.get('/meeting/:meetid', (req, res) => {
	if (req.isAuthenticated()) res.render('meeting', { username: req.user, meetid: req.params.meetid });
	else res.redirect('/login');
});
app.get('/rooms', (req, res) => {
	if (req.isAuthenticated()) res.render('rooms', { username: req.user });
	else res.redirect('/login');
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;

/* 
Websocet Server
- Manager Key, RoomID, UserID
- Manager Connect P2P WebRTC 
*/

class User {
	constructor(username, ws) {
		this.username = username;
		this.ws = ws;
	};
}

var arrRooms = [{ roomID: 'default'}];
var arrUsers = [];

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

wss.on('connection', function(ws) {
	ws.on('message', function(m) {
		var message = getStringJSON(m);
		if (message === false) { console.log('Receive not json:', m); return; }
		if (message.command == "getRoomsAndUsers") {
			updateUser(message.username, ws);
			var users = arrUsers.map(u => u.username);
			var rooms = arrRooms.map(r => r.roomID);
			broadcastingAllClients(JSON.stringify({ command: "getRoomsAndUsers", users: users, rooms: rooms}));
		}
		if (message.command == "createRoom") {
			var roomID = message.roomID;
			if (arrRooms.map(r => r.roomID).includes(roomID)) {
				ws.send(JSON.stringify({ command: "alert", message: "RoomID đã tồn tại!" }));
			}
			else {
				arrRooms.push({ roomID: roomID });
				broadcastingAllClients(JSON.stringify({ command: "updateRooms", rooms: arrRooms.map(r => r.roomID) }));
			}
		}
		if (message.command == "deleteRoom") {
			var roomID = message.roomID;
			removeRoom(roomID);
			broadcastingAllClients(JSON.stringify({ command: "updateRooms", rooms: arrRooms.map(r => r.roomID) }));
		}
	});

	ws.on('close', function() {
		console.log('close', ws.username);
		removeUser(ws.username);
		var users = arrUsers.map(u => u.username);
		broadcastingAllClients(JSON.stringify({ command: "updateUsers", users: users}));
		if (arrUsers.length <= 0) {
			setTimeout(function() {
				if (arrUsers.length <= 0) {
					arrRooms = [{ roomID: 'default'}];
					arrUsers = [];
				}
			}, 20000);
		}
	});
});

function removeUser(username) {
	if (username != undefined) {
		var index = -1;
		for (var i = 0; i < arrUsers.length; i++) {
			if (arrUsers[i].username == username) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			arrUsers.splice(index, 1);
		}
	}
}

function removeRoom(roomID) {
	if (roomID != undefined && roomID != "") {
		var index = -1;
		for (var i = 0; i < arrRooms.length; i++) {
			if (arrRooms[i].roomID == roomID) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			arrRooms.splice(index, 1);
		}
	}
}

function updateUser(username, ws) {
	ws.username = username;
	var isAlive = false;
	for (var i = 0; i < arrUsers.length; i++) {
		if (arrUsers[i].username == username) {
			arrUsers[i].ws = ws;
			console.log('update user', username);
			isAlive = true;
			break;
		}
	}
	if (isAlive === false) {
		arrUsers.push(new User(username, ws));
		console.log('new user', username);
	}
}

function broadcastingAllClients(message) {
	wss.clients.forEach(client => {
		if(client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

function broadcastingExcludingSelf(ws, message) {
	wss.clients.forEach(client => {
		if(client !== ws && client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

function getStringJSON(text) {
	if (typeof text !== "string") return false;
	try { var json = JSON.parse(text); return json; }
	catch (error) { return false; }
}


