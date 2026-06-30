// src/browser.js
//
// Everything that touches the actual SonicRoom page: launching Chrome with
// the virtual-cable mic, joining a room, sending chat messages, toggling
// mute, and changing the bot's nickname.
//
// IMPORTANT: Every selector below marked TODO is a guess. Open the real
// SonicRoom page in a normal Chrome tab, hit F12 to open DevTools, click the
// "inspect element" arrow (top-left of DevTools), and click on the actual
// button/input/etc. That reveals the real tag, id, and class names - replace
// the guessed selector with the real one.

const puppeteer = require("puppeteer");
const path = require("path");
const config = require("./config");

let browser = null;
let page = null;

/**
 * Launches Chrome with the virtual-cable device pre-selected as the mic,
 * and navigates to the given SonicRoom room URL.
 */
async function joinRoom(roomUrl) {
  browser = await puppeteer.launch({
    headless: config.headless,
    userDataDir: path.resolve(__dirname, "..", config.userDataDir),
    args: [
      // Auto-accepts the mic/cam permission prompt instead of showing a
      // popup that would otherwise block the bot.
      "--use-fake-ui-for-media-stream",
      // Without this, Chrome may still try to enumerate real hardware mics
      // first. This flag isn't strictly required once a real device
      // ("CABLE Output") is selected via the page below, but is left here
      // as a safety net during testing.
    ],
  });

  page = await browser.newPage();

  // Grant mic/cam permission for this origin up front (belt-and-suspenders
  // alongside --use-fake-ui-for-media-stream).
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(new URL(roomUrl).origin, [
    "microphone",
    "camera",
  ]);

  await page.goto(roomUrl, { waitUntil: "networkidle2" });

  // TODO: Select "CABLE Output (VB-Audio Virtual Cable)" as the mic device.
  // Many WebRTC sites expose a device-selection dropdown either on a
  // "pre-join" lobby screen or in settings after joining. You'll need to:
  //   1. Find that dropdown's selector in DevTools.
  //   2. Either page.select('selector', 'deviceId') if it's a native <select>,
  //      or page.click() through a custom dropdown's options.
  // Example for a native <select id="micSelect">:
  //   await page.select('#micSelect', await getCableDeviceId(page));
  // Leaving this as a manual step for now - see README "First run" section.

  // TODO: Set the display name. Look for an input like
  // <input placeholder="Your name"> on a pre-join screen.
  const NAME_INPUT_SELECTOR = 'input[name="displayName"]'; // <-- TODO verify
  const nameInput = await page.$(NAME_INPUT_SELECTOR);
  if (nameInput) {
    await nameInput.click({ clickCount: 3 }); // select existing text
    await nameInput.type(config.botDisplayName);
  }

  // TODO: Click the actual "Join" / "Enter room" button.
  const JOIN_BUTTON_SELECTOR = 'button[type="submit"]'; // <-- TODO verify
  const joinButton = await page.$(JOIN_BUTTON_SELECTOR);
  if (joinButton) {
    await joinButton.click();
  }

  // Start muted - the bot should only unmute when audio.js confirms a
  // stream is actually flowing.
  await mute();

  return page;
}

async function leaveRoom() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

function isJoined() {
  return browser !== null && page !== null;
}

/**
 * Clicks the room's mute toggle button.
 * TODO: verify selector AND verify whether this is a single toggle button
 * (click once to mute, click again to unmute) or two separate buttons.
 */
async function setMuted(muted) {
  if (!page) return;
  const MUTE_BUTTON_SELECTOR = '[aria-label*="microphone" i]'; // <-- TODO verify
  const button = await page.$(MUTE_BUTTON_SELECTOR);
  if (!button) {
    console.warn("[sonicroom-bot] Could not find mute button on page.");
    return;
  }

  // TODO: Many accessible apps expose mic state via aria-pressed.
  // Verify this attribute name/values in DevTools and adjust if needed.
  const isMuted = await page.evaluate(
    (el) => el.getAttribute("aria-pressed") === "true",
    button
  );

  if (isMuted !== muted) {
    await button.click();
  }
}

const mute = () => setMuted(true);
const unmute = () => setMuted(false);

/**
 * Sends a plain text message into SonicRoom's chat (used for bot replies,
 * e.g. to /help).
 */
async function sendChatMessage(text) {
  if (!page) return;

  // TODO: verify the chat input selector.
  const CHAT_INPUT_SELECTOR = 'textarea[placeholder*="message" i]'; // <-- TODO verify
  const input = await page.$(CHAT_INPUT_SELECTOR);
  if (!input) {
    console.warn("[sonicroom-bot] Could not find chat input on page.");
    return;
  }

  await input.click();
  await input.type(text);
  await page.keyboard.press("Enter");
}

/**
 * Changes the bot's nickname mid-session (after already joined).
 * SonicRoom likely exposes this via a settings panel rather than re-showing
 * the join screen - TODO: find the right element in DevTools.
 */
async function changeNickname(newName) {
  if (!page) return;

  // TODO: replace with the real settings-button selector.
  const SETTINGS_BUTTON_SELECTOR = '[aria-label*="settings" i]'; // <-- TODO verify
  const settingsButton = await page.$(SETTINGS_BUTTON_SELECTOR);
  if (settingsButton) {
    await settingsButton.click();
  }

  // TODO: replace with the real nickname-field selector inside that panel.
  const NICKNAME_INPUT_SELECTOR = 'input[name="displayName"]'; // <-- TODO verify
  const nicknameInput = await page.$(NICKNAME_INPUT_SELECTOR);
  if (!nicknameInput) {
    console.warn("[sonicroom-bot] Could not find nickname field on page.");
    return;
  }

  await nicknameInput.click({ clickCount: 3 });
  await nicknameInput.type(newName);
  await page.keyboard.press("Enter");
}

module.exports = {
  joinRoom,
  leaveRoom,
  isJoined,
  mute,
  unmute,
  sendChatMessage,
  changeNickname,
};
