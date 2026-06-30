# SonicRoom Media Bot

A bot that joins a SonicRoom room as a real participant, stays muted until
told to play something, and responds to chat commands.

## How it's controlled

- **Local menu** (runs in your terminal on your Windows machine): paste the
  SonicRoom room link here to make the bot join. Type `remove` to make it
  leave.
- **In-room chat commands** (typed by anyone in the actual SonicRoom chat,
  once the bot has joined):
  - `/play <link>` - YouTube link, direct MP3 link, or Azuracast/Icecast
    radio stream link
  - `/stop` - stop playback, bot goes back to muted
  - `/change-nickname <name>` - renames the bot mid-session
  - `/help` - bot replies in chat with the command list

## One-time setup

1. **Install Node.js** (LTS): https://nodejs.org
2. **Install VB-Audio Virtual Cable**: https://vb-audio.com/Cable/
   - After installing, reboot if prompted.
3. **Install yt-dlp**: https://github.com/yt-dlp/yt-dlp/releases
   - Download `yt-dlp.exe`, put it somewhere on your PATH (e.g.
     `C:\Windows\` or a folder you've added to PATH).
4. **Install ffmpeg**: https://www.gyan.dev/ffmpeg/builds/ (the "essentials"
   build is fine)
   - Unzip it, add the `bin` folder to your PATH.
   - Test in a new terminal: `ffmpeg -version` should print a version, not
     "command not found".
5. **Install project dependencies**:
   ```
   cd sonicroom-bot
   npm install
   ```
6. **Find your exact VB-Cable device name for ffmpeg**:
   ```
   node src/list-audio-devices.js
   ```
   Copy the exact "CABLE Input (VB-Audio Virtual Cable)" string into
   `src/config.js` -> `ffmpegOutputDevice` if it differs at all from what's
   already there.

## Required manual step: filling in the TODOs

This is the part that needs you. SonicRoom doesn't have a public API or any
documentation, so I had to guess at element selectors (button/input names)
in `src/browser.js` and `src/chatWatcher.js`. Every guess is marked
`// TODO`. Before the bot will actually work, you need to:

1. Open the real SonicRoom room in a normal Chrome tab.
2. Press `F12` to open DevTools, then click the cursor/arrow icon top-left
   of the DevTools panel (or `Ctrl+Shift+C`).
3. Click on the actual element on the page (the name input, join button,
   mute button, chat input box, chat message list).
4. DevTools will highlight the matching HTML and show its tag, `id`, and
   `class`. Use that to build a precise CSS selector.
5. Replace the corresponding guessed selector in the code.

The TODOs you need to resolve, in order of how soon you'll hit them:

| File | What to find |
|---|---|
| `browser.js` | Display name input on the join/lobby screen |
| `browser.js` | Join/Enter button |
| `browser.js` | Mic device dropdown (to select CABLE Output) - may not exist if SonicRoom auto-selects the OS default mic, in which case you may need to set CABLE Output as your Windows default recording device instead |
| `browser.js` | Mute/unmute button, and how to read its current state |
| `browser.js` | Chat message input box |
| `browser.js` | Settings panel button + nickname field (for `/change-nickname`) |
| `chatWatcher.js` | The chat message list container (so new messages can be detected) |

## Running the bot

```
npm start
```

This opens the local menu in your terminal. Paste a SonicRoom link to join.
A visible Chrome window will open (not headless, on purpose, so you can
watch what it's doing while you fix TODOs) - you'll see it navigate, join,
and sit muted until someone types `/play <link>` in the room's chat.

## Notes

- Keep `headless: false` in `config.js` until everything works - it's much
  easier to see what's failing when you can watch the browser window.
- If `/play` is given a YouTube link, the bot resolves it via `yt-dlp`
  first; direct MP3 and radio stream links are handed straight to `ffmpeg`.
- Only one thing plays at a time - a new `/play` stops whatever was already
  playing.
