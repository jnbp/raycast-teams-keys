<div align="center">

<img src="assets/icon.png" width="128" height="128" alt="Microsoft Teams Keys icon">

# Microsoft Teams Keys

**Microsoft Teams from the keyboard – no sign-in, no admin approval.**<br>
A [Raycast](https://raycast.com) extension that opens chats, types or sends messages, controls your meeting, sets
your status and joins meetings in the Teams desktop app. Everything runs locally on your Mac.

[![Latest release](https://img.shields.io/github/v/release/jnbp/raycast-teams-keys?label=release&color=5c54d6)](https://github.com/jnbp/raycast-teams-keys/releases/latest)
![macOS](https://img.shields.io/badge/platform-macOS-2c3142)
![Raycast](https://img.shields.io/badge/Raycast-extension-ff6363)
[![License: MIT](https://img.shields.io/badge/license-MIT-2c3142)](LICENSE)

[**Download the installer**](https://github.com/jnbp/raycast-teams-keys/releases/latest/download/install-teams-keys.zip) · [Commands](#commands) · [How it works](#how-it-works) · [FAQ](#faq)

</div>

---

## Why

Most Teams integrations need a Microsoft sign-in and an app registration that your IT has to approve – and many
organisations never do. Microsoft Teams Keys needs none of that. It talks to the Teams app on your Mac the way you would:
through Teams links, the official keyboard shortcuts and the Teams slash commands.

> [!NOTE]
> Microsoft Teams Keys is not made by or affiliated with Microsoft.

## Commands

| Command | What it does |
| --- | --- |
| **Open Teams Chat** | Opens the chat with a person and types an optional message. Leaves it as a draft or sends it (preference) |
| **Send Teams Message** | Opens the chat and sends the message right away |
| **Teams Contacts** | Short names for the people you message most – chat, message, call or video call them |
| **Control Teams Meeting** | Microphone, camera, raise hand, share content, admit from lobby, leave call and your status in one list |
| **Toggle Teams Microphone / Camera** | Mute or unmute, camera on or off |
| **Raise or Lower Hand in Teams** | Raise or lower your hand |
| **Leave Teams Call** | Hang up |
| **Share Screen in Teams** | Opens *Share content* (`⌘⇧E`); you pick the screen or window, Teams stays in front |
| **Admit from Teams Lobby** | Lets in the people waiting in the lobby |
| **Set Teams Status** | Available, Busy, Do Not Disturb, Be Right Back, Away or Offline (English and German Teams) |
| **Set Teams Status to …** | One command per status (Available, Busy, Do Not Disturb, Be Right Back, Away, Offline), so each can have its own hotkey |
| **Start Teams Call** | Audio or video call; Teams asks once more before it dials |
| **Teams Meetings** | Your Teams meetings for the next seven days, from the Calendar app – join with Return |
| **Join Next Teams Meeting** | Joins the meeting that is running or starts within 15 minutes |
| **Join Teams Meeting** | Opens a meeting link from the argument or the clipboard in the app, Outlook Safe Links included |
| **Schedule Teams Meeting** | Fills in the Teams new meeting form with subject, attendees, start and duration |

> [!TIP]
> Give the commands you use most a hotkey – Toggle Teams Microphone on a hotkey is a mute button that works no
> matter which app is in front. Open Raycast, select the command, press `⌘K` → **Configure Command**.

### Who you can write to

Open Teams Chat, Send Teams Message and Start Teams Call take:

- an **email address** – `anna@example.com` opens the chat directly;
- a **saved contact** – `anna` if you saved Anna in **Teams Contacts**;
- **any other name** – typed into the Teams search, and the first result is opened (chats only, can be turned off).

## How it works

| Feature | Route |
| --- | --- |
| Chats, messages, calls, joining and scheduling meetings | Teams links (`msteams:`), the same ones the "Open in app" buttons use |
| Sending a message, names without an address | The Teams search (`⌘E`) and Return |
| Meeting controls | The official Teams shortcuts (`⌘⇧M`, `⌘⇧O`, `⌘⇧K`, `⌘⇧E`, `⌘⇧Y`, `⌘⇧H`) |
| Status | The Teams slash commands (`/available`, `/busy` … or `/verfügbar`, `/beschäftigt` …, depending on the Teams language) |
| Upcoming meetings | The macOS calendar database, so the work account must be added to the Calendar app |

Keyboard shortcuts only reach the app in front, so Teams comes to the front for a moment and your previous app
comes back right after (you can turn that off). Raycast needs the **Accessibility** permission for the keystrokes
and the **Calendars** permission for the meeting commands; macOS asks the first time.

## Installation

### Option 1 – Installer (recommended)

1. Download **[install-teams-keys.zip](https://github.com/jnbp/raycast-teams-keys/releases/latest/download/install-teams-keys.zip)** and double-click it to unzip.
2. Double-click **install-teams-keys.command**.

The installer checks for Raycast and Node.js, downloads the latest release and imports the extension. **Run the
same file again to update** – it always fetches the newest release and keeps your preferences.

> [!NOTE]
> Downloaded scripts are not signed by Apple, so macOS may block the first double-click. Open **System Settings ›
> Privacy & Security** and click **Open Anyway**, or start it from Terminal, which is never blocked:
>
> ```bash
> bash ~/Downloads/install-teams-keys.command
> ```

### Option 2 – From source

```bash
git clone https://github.com/jnbp/raycast-teams-keys.git
cd raycast-teams-keys
npm install && npm run dev
```

**Requirements:** macOS, the new Microsoft Teams desktop app, [Raycast](https://raycast.com) and Node.js 22 or newer.

## FAQ

<details>
<summary><b>Why no background blur or reactions?</b></summary>

Microsoft switched off the local Teams API that third-party tools such as Stream Deck plugins used for those on
30 June 2026. Teams has no keyboard shortcut for them, so no local tool can reach them any more.
</details>

<details>
<summary><b>Teams misses a keystroke.</b></summary>

Set **Timing** to *Slow* or *Very Slow* in the extension preferences. Teams then gets more time between steps. If Teams keeps up
well, *Fast* down to *Instant* make every command quicker; *Custom Factor* takes any value from 0.05 to 10 (1 is Normal).
</details>

<details>
<summary><b>Teams Meetings is empty.</b></summary>

The meetings come from the Calendar app on your Mac. Add your work account in **System Settings › Internet
Accounts** and check that the meetings show up in Calendar. Meetings without a Teams link are left out.
</details>

<details>
<summary><b>Does it send any data anywhere?</b></summary>

No. The extension talks only to the Teams app and the calendar on your Mac and makes no network requests itself.
</details>

## License

[MIT](LICENSE) © jnbp
