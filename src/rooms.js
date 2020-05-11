const $ = require("jquery");

var app = {};
app.username = $("#username").text();
app.arrUsername = [];
app.arrRoomID = []
console.log(app.username);

var HOST = location.origin.replace(/^http/, "ws");
var ws = new WebSocket(HOST);

ws.onopen = function (e) {
	ws.send(JSON.stringify({ command: "getRoomsAndUsers", username: app.username }));
};

ws.onmessage = function (message) {
	var m = getStringJSON(message.data);
	if (m === false) console.log("receive string,", message.data);

    if (m.command == "alert") {
        alert(m.message);
    }
	if (m.command == "getRoomsAndUsers") {
        app.arrUsername = m.users;
        app.arrRoomID = m.rooms;
        setupRooms(app.arrRoomID);
        setupUsers(app.arrUsername);
    }
    if (m.command == "updateUsers") {
        app.arrUsername = m.users;
        console.log(app.arrUsername);
        setupUsers(app.arrUsername);
    }
    if (m.command == "updateRooms") {
        app.arrRoomID = m.rooms;
        setupRooms(app.arrRoomID);
    }
};

ws.onclose = function () {};

/**
 * Event Button
 */
$('#buttonCreateAndJoin').on('click', function(e) {
    e.preventDefault();
    var roomID = $("#createRoomID").val();
    if (app.arrRoomID.includes(roomID)) {
        alert("RoomID đã tồn tại!");
    }
    else {
        ws.send(JSON.stringify({ command: "createRoom", roomID: roomID }));
        $("#createRoomID").val("");
        joinRoom(roomID);
    }
})

function setupUsers(arrUsername) {
    if (arrUsername != undefined && arrUsername.lenght != 0) {
        $('#tbody_users').empty();
        arrUsername.forEach(username => {
            var element = `
            <tr>
                <td>${username}</td>
            </tr>`;
            $('#tbody_users').append(element);
        });
    }
}

function setupRooms(arrRoomID) {
    console.log(arrRoomID);
    if (arrRoomID != undefined && arrRoomID.lenght != 0) {
        $('#tbody_rooms').empty();
        arrRoomID.forEach(roomID => {
            var element = `
            <tr>
                <td>${roomID}</td>
                <td>
                    <button class="btn btn-primary mb-2 mr-sm-2" id="buttonJoin_${roomID}">Join</button>
                    <button class="btn btn-primary mb-2" id="buttonDelete_${roomID}">Delete</button>
                </td>
            </tr>`;
            $('#tbody_rooms').append(element);
            $("#buttonDelete_" + roomID).on('click', function(e) {
                console.log('button delete on click', roomID);
                ws.send(JSON.stringify({ command: "deleteRoomID", roomID: roomID}));
            });
            $("#buttonJoin_" + roomID).on('click', function(e) {
                console.log('button join on click', roomID);
                joinRoom(roomID);
            });
        });
    }
}

function joinRoom(roomID) {
    console.log('window redirect', roomID);
    window.location.href = window.location.origin + "/meeting/" + roomID;
}

function getStringJSON(text) {
	if (typeof text !== "string") return false;
	try {
		var json = JSON.parse(text);
		return json;
	} catch (error) {
		return false;
	}
}
