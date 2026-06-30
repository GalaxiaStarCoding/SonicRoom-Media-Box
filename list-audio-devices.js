// list-audio-devices.js
//
// Run this with: node src/list-audio-devices.js
// It shells out to ffmpeg's dshow device-list trick so you can copy the
// EXACT device name strings into config.js (Windows device names sometimes
// have hidden characters or slightly different casing than what you'd guess).

const { spawn } = require("child_process");

const proc = spawn("ffmpeg", [
  "-list_devices", "true",
  "-f", "dshow",
  "-i", "dummy",
]);

let output = "";
proc.stderr.on("data", (data) => {
  output += data.toString();
});

proc.on("close", () => {
  console.log("---- ffmpeg dshow device list ----");
  console.log(output);
  console.log("-----------------------------------");
  console.log(
    "Look for a line containing 'CABLE Input' under the AUDIO devices section."
  );
  console.log(
    "Copy that exact name (without the surrounding quotes) into config.js as ffmpegOutputDevice."
  );
});
