const path = require("path");

module.exports = [
	{
		entry: "./src/meeting.js",
		output: {
			path: path.resolve(__dirname, "public"),
			filename: "bundle_meeting.js",
		},
    },
    {
        entry: "./src/rooms.js",
        output: {
            path: path.resolve(__dirname, "public"),
			filename: "bundle_rooms.js",
        }
    }
];
