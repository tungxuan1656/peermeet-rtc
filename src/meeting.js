const $ = require("jquery");
const RTCMultiConnection = require("./RTCMultiConnection");

var app = {};
app.username = $("#username").text();
app.meetID = $("#meetID").text();
app.videoContainer = document.getElementById('video-container');
console.log(app.username);
console.log(app.meetID);

/**
 * RTC Multi Connection
 */
var connection = new RTCMultiConnection();
connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.session = {
    audio: true,
    video: true
};

connection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
}

connection.DetectRTC.load(function() {
    if (!connection.DetectRTC.hasMicrophone) {
        connection.session.audio = false;
        connection.mediaConstraints.audio = false;
    }

    if (!connection.DetectRTC.hasWebcam) {
        connection.session.video = false;
        connection.mediaConstraints.video = false;
        alert("Không có Camera!!");
    }
    else {
        connection.openOrJoin('room_tungxuan_' + app.meetID);
    }
})

connection.onstream = function(event) {
    var video = event.mediaElement;
    app.videoContainer.appendChild(video);
};

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
};

ws.onclose = function () {};

function getStringJSON(text) {
	if (typeof text !== "string") return false;
	try {
		var json = JSON.parse(text);
		return json;
	} catch (error) {
		return false;
	}
}
