// src/index.js
//
// This is the bot's "local menu" - a simple command-line menu running on
// your own machine. It is NOT the SonicRoom chat. Pasting a link here joins
// the bot to that room; removing the link (typing "remove") makes the bot
// leave. Once joined, /play, /stop, /change-nickname, /help typed by people
// INSIDE the SonicRoom chat control playback - that's handled separately by
// chatWatcher.js + audio.js.

const readline = require("readline");
const browser = require("./browser");
const audio = require("./audio");
const { watchChat } = require("./chatWatcher");
const config = require("./config");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  if (browser.isJoined()) {
    rl.question(
      '\nBot is currently IN a room.\nType "remove" to leave, or paste a new link to switch rooms: ',
      handleMenuInput
    );
  } else {
    rl.question(
      "\nPaste a SonicRoom link to join (or Ctrl+C to quit): ",
      handleMenuInput
    );
  }
}

async function handleMenuInput(input) {
  const value = input.trim();

  if (!value) {
    prompt();
    return;
  }

  if (value.toLowerCase() === "remove") {
    if (browser.isJoined()) {
      console.log("Leaving room...");
      audio.stop();
      await browser.leaveRoom();
      console.log("Left the room.");
    } else {
      console.log("Bot isn't in a room.");
    }
    prompt();
    return;
  }

  // Treat anything else as a room link.
  if (!/^https?:\/\//i.test(value)) {
    console.log("That doesn't look like a link. Try again.");
    prompt();
    return;
  }

  if (browser.isJoined()) {
    console.log("Switching rooms - leaving current room first...");
    audio.stop();
    await browser.leaveRoom();
  }

  console.log(`Joining ${value} ...`);
  try {
    const page = await browser.joinRoom(value);
    console.log("Joined. Bot is muted until /play is used in chat.");
    await watchChat(page, handleChatCommand);
    console.log("Listening for chat commands: /play, /stop, /change-nickname, /help");
  } catch (err) {
    console.error("Failed to join room:", err.message);
  }

  prompt();
}

async function handleChatCommand(command, args, rawMessage) {
  console.log(`[chat command] ${command} ${args}`);

  switch (command) {
    case "play": {
      const url = args.trim();
      if (!url) {
        await browser.sendChatMessage("Usage: /play <youtube, mp3, or radio stream link>");
        return;
      }
      await browser.sendChatMessage("Processing, please wait...");
      audio.play(url, {
        onStart: async (trackName) => {
          await browser.unmute();
          await browser.sendChatMessage(`Now Playing: ${trackName}`);
        },
        onEnd: async () => {
          await browser.mute();
          await browser.sendChatMessage("Playback finished.");
        },
        onError: async (err) => {
          await browser.mute();
          await browser.sendChatMessage(`Couldn't play that link: ${err.message}`);
        },
      });
      break;
    }

    case "stop": {
      audio.stop();
      await browser.mute();
      await browser.sendChatMessage("Stopped.");
      break;
    }

    case "change-nickname": {
      const newName = args.trim();
      if (!newName) {
        await browser.sendChatMessage("Usage: /change-nickname <new name>");
        return;
      }
      await browser.changeNickname(newName);
      await browser.sendChatMessage(`Nickname changed to: ${newName}`);
      break;
    }

    case "help": {
      await browser.sendChatMessage(
        "Commands: /play <link> - play YouTube/MP3/radio stream | " +
        "/stop - stop playback | " +
        "/change-nickname <name> - rename the bot | " +
        "/help - show this message"
      );
      break;
    }
  }
}

console.log("=== SonicRoom Media Bot ===");
prompt();
