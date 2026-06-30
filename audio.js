// src/audio.js
const { spawn, exec } = require("child_process");
const config = require("./config");

let currentFfmpeg = null;
let currentYtDlp = null;

function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

// Resolves a YouTube URL into a direct, ffmpeg-playable audio stream URL.
function resolveYouTubeAudioUrl(youtubeUrl) {
  return new Promise((resolve, reject) => {
    // -f bestaudio picks the best audio-only stream; -g prints the direct URL
    // instead of downloading.
    exec(
      `yt-dlp -f bestaudio -g "${youtubeUrl}"`,
      { maxBuffer: 1024 * 1024 * 10 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`yt-dlp failed: ${stderr || err.message}`));
        }
        const directUrl = stdout.trim().split("\n")[0];
        if (!directUrl) {
          return reject(new Error("yt-dlp returned no stream URL"));
        }
        resolve(directUrl);
      }
    );
  });
}

// Stops whatever is currently playing.
function stop() {
  if (currentFfmpeg) {
    currentFfmpeg.kill("SIGKILL");
    currentFfmpeg = null;
  }
  currentYtDlp = null;
}

// Plays a URL (YouTube link, direct MP3, or Icecast/Azuracast stream) out
// through the configured virtual-cable output device.
// onStart / onEnd are callbacks so index.js can unmute/mute the bot in sync.
async function play(url, { onStart, onEnd, onError } = {}) {
  stop(); // only one stream at a time for now

  let playUrl = url;
  try {
    if (isYouTubeUrl(url)) {
      playUrl = await resolveYouTubeAudioUrl(url);
    }
  } catch (err) {
    if (onError) onError(err);
    return;
  }

  // -re paces input at native playback rate (important for files; harmless for live streams).
  // -i playUrl is the source.
  // -f dshow + -audio_buffer_size + the named output device sends decoded
  // audio to the virtual cable so Chromium's "microphone" picks it up.
  const args = [
    "-re",
    "-i", playUrl,
    "-vn", // no video
    "-f", "dshow",
    `audio="${config.ffmpegOutputDevice}"`,
  ];

  // NOTE: ffmpeg's dshow output device argument needs to be passed as a single
  // token like `audio=CABLE Input (VB-Audio Virtual Cable)`, not split across
  // two array entries. We rebuild args accordingly below using spawn with
  // shell:true so quoting behaves predictably on Windows.
  const cmd = `ffmpeg -re -i "${playUrl}" -vn -f dshow "audio=${config.ffmpegOutputDevice}"`;

  currentFfmpeg = spawn(cmd, { shell: true });

  let started = false;
  currentFfmpeg.stderr.on("data", (data) => {
    const text = data.toString();
    // ffmpeg logs "size=" once it actually starts writing output - use that
    // as a rough signal that audio is flowing, so we don't unmute on silence.
    if (!started && text.includes("size=")) {
      started = true;
      if (onStart) onStart();
    }
    // Uncomment for debugging:
    // process.stderr.write(text);
  });

  currentFfmpeg.on("close", (code) => {
    currentFfmpeg = null;
    if (onEnd) onEnd(code);
  });

  currentFfmpeg.on("error", (err) => {
    currentFfmpeg = null;
    if (onError) onError(err);
  });
}

module.exports = { play, stop, isYouTubeUrl };
