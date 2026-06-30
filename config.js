// config.js
// Central place for settings you may need to tweak.

module.exports = {
  // The Windows audio device name that Chromium should use as its "microphone".
  // This must be the *output* side of VB-Audio Virtual Cable, since that's what
  // appears as a recordable input device once something is playing into
  // "CABLE Input". In Chrome's device list it normally shows up as:
  //   "CABLE Output (VB-Audio Virtual Cable)"
  // TODO: Confirm the exact device name on your machine. Run:
  //   node src/list-audio-devices.js
  // after installing VB-Cable, and copy the exact label here.
  micDeviceLabel: "CABLE Output (VB-Audio Virtual Cable)",

  // The device ffmpeg should render audio OUT to. On Windows with VB-Cable
  // installed, this is normally named "CABLE Input (VB-Audio Virtual Cable)".
  // ffmpeg's dshow audio output device list will show the exact string -
  // run scripts/list-ffmpeg-devices.bat to get it precisely (names sometimes
  // include extra characters that must match exactly, including hyphens).
  ffmpegOutputDevice: "CABLE Input (VB-Audio Virtual Cable)",

  // Whether to show the bot's Chrome window or run fully headless.
  // Keep this `false` (visible) at first - it's much easier to debug
  // selector issues when you can see what Chrome is doing.
  headless: false,

  // Path to a persistent Chrome user-data-dir, so the bot doesn't have to
  // re-grant mic/cam permissions every run.
  userDataDir: "./chrome-profile",

  // Display name the bot will use when joining a room.
  botDisplayName: "MediaBot",

  // Command prefix the bot listens for in SonicRoom's chat.
  commandPrefix: "/",
};
