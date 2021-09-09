<div style="text-align:center;" align="center">

# Node-Notifier

Open client that triggers desktop notifications through HTTP requests  
Intended to be used together with [ESP-Notifier](https://github.com/Sv443/ESP-Notifier) to send a desktop notification through an electrical button press

<br>

[![License](https://img.shields.io/github/license/Sv443/Node-Notifier)](https://sv443.net/LICENSE)
[![Known Vulnerabilities](https://snyk.io/test/github/Sv443/Node-Notifier/badge.svg)](https://snyk.io/test/github/Sv443/Node-Notifier)
[![Version](https://img.shields.io/github/package-json/v/Sv443/Node-Notifier)](https://github.com/Sv443/Node-Notifier/blob/main/changelog.md#readme)
[![Discord](https://img.shields.io/discord/565933531214118942)](https://dc.sv443.net/)

<br>

## Video Showcase:

[![TODO: image preview of video, click to open video in new tab](./.github/assets/video_showcase.png)](https://youtu.be/)

</div>

<br><br>

## Table of Contents:
- **[Installation](#installation)**
- **[REST API Usage](#rest-api-usage)**
    - [Sending a Notification](#sending-a-notification)
- **[Other](#other)**
    - [Files and Folders](#files-and-folders)
- [Disclaimer](#disclaimer)
- [Dependencies](#dependencies)

<br><br>

## Installation:
1. Install [Node.js](https://nodejs.org/)
    - Optionally install [pm2](https://npmjs.com/package/pm2) if you want to enable autostart, monitoring, etc. (to install run `npm i -g pm2`)
2. Clone or download and extract this repo
3. Edit the file `config.js` to your liking
4. Open a terminal in the project directory
5. Install dependencies with the command `npm i`
6. Start Node-Notifier with `npm start`
    - To start it without being wrapped by pm2 (not recommended for normal use) you can use the command `npm run debug`
7. See if the service is online by visiting the dashboard page: http://127.0.0.1:8042/
8. Do either of these:
    - Build an [ESP-Notifier](https://github.com/Sv443/ESP-Notifier) and configure it to work together with Node-Notifier
    - Send requests to the server in another way (see [sending requests](#rest-api-usage))

<br>

### Notes:
- To configure Node-Notifier, open the file `config.js` in the project root directory and edit it.  
If it's already running, make sure to restart the process by running `npm start` again.  
  
- If you need help with anything or just want to chat you can [join my Discord server.](https://dc.sv443.net/)

<br><br>

## REST API Usage:
Node-Notifier comes with a REST API that is used to send desktop notifications.  
This section tells you how you can use it.  
  
The IP addresses in this section are placeholders, instead you need to use the IP of the device Node-Notifier is running on.  
(Make sure your router always assigns the same IP to your device.)  
If the client and server are running on the same device, you can use `127.0.0.1` or `localhost`.

<br>

> ### Sending a Notification:
> #### `POST /send`
> 
> <br>
> 
> This is the main endpoint, used to send a desktop notification on the device this service is running on.  
> It accepts data in JSON format and has a few query parameters you can set.
> 
> <br><br>
> 
> **Expected request body (JSON):**  
> This is what the request body should look like.  
> Properties inside square brackets are optional.  
> 
> | Property | Description |
> | :-- | :-- |
> | `title` | The (short) title of the notification |
> | `message` | A more detailed message |
> | `[icon]` | A square icon to attach to the notification. Defaults to a placeholder icon on some operating systems if left empty.<br>This image needs to be present on the system the Node-Notifier server runs on.<br>An `assets` folder will be created at first startup, it is intended for storing these images. |
> | `[actions]` | Array of actions (buttons or dropdown, depending on OS) the user can select on the notification. Using this automatically enables `?waitForResult` |
> | `[timeout]` | How many seconds to wait before closing the notification automatically. Takes precedence over `?waitForResult`. Defaults to `10` |
> 
> <details><summary><b>Full example (click to view)</b></summary>
> 
> ```json
> {
>     "title": "Door Bell",
>     "message": "Someone is at the door, should I open it?",
>     "icon": "assets/door.png",
>     "actions": [
>         "Yes",
>         "No"
>     ],
>     "timeout": 42
> }
> ```
> 
> </details>
> 
> <br><br>
> 
> **Query parameters:**
> > `?waitForResult`  
> > This is a value-less parameter that makes Node-Notifier wait until the notification was reacted upon by the user or times out.  
> > Also, it will make the API return some data on how the user interacted with the notification.  
> > Make sure your HTTP client waits long enough before getting timed out while the API waits for user interaction!
> 
> <br><br>
> 
> **Possible response bodies:**
> 
> <details><summary>Base response (click to view)</summary><br>
> 
> HTTP status code: `200`
> ```json
> {
>     "error": false,
>     "message": "Notification was sent"
> }
> ```
> 
> </details>
> 
> <br>
> 
> <details><summary>Response when waiting for result (click to view)</summary><br>
> 
> HTTP status code: `200`
> ```json
> {
>     "error": false,
>     "message": "Hello, I am a success message",
>     "result": "Can be a string or null",
>     "type": "Describes the type of notification interaction",
>     "value": "Some other value, idk"
> }
> ```
> 
> </details>
> 
> <br>
> 
> <details><summary>Errored response (click to view)</summary><br>
> 
> HTTP status code: `400`
> ```json
> {
>     "error": true,
>     "message": "Hello, I am an error message"
> }
> ```
> 
> </details>
> 
> <br>

<br><br>

## Other:
### Files and Folders:
Node-Notifier generates a few files and folders:
- `assets/`  
This folder is intended to be used as a place to store your notifications' images and potentially other assets.  
It is generated and filled with an example image when Node-Notifier first starts up.  
  
- `.notifier/`  
This folder contains all internal files of Node-Notifier.  
Usually you shouldn't need to edit anything in here, but the program is open and I can't *really* stop you so go wild.  
  
- `.notifier/properties.json`  
This file contains internal values of Node-Notifier and I really can't recommend editing anything in here as you can very easily break something.  
  
- `.notifier/notifications.json`  
This file will be created when a notification was sent.  
It is a log file that contains the last *n* notifications, where *n* is defined by `logging.notificationLogSize` in the file `config.js`  
Feel free to use the contents of this file for your own projects. You can find the JSON schema in `.vscode/schemas/notifications.json`

<br><br>

## Disclaimer:
The current version of Node-Notifier only supports HTTP.  
Usually this is fine as long as all devices are part of the same network.  
But still, a compromised network could allow third parties to read your requests, so make sure you are not sending any important data.  
  
If I feel like it I might add HTTPS support in the future.

<br><br>

## Dependencies:
Node-Notifier wouldn't be possible without these libraries:
- [axios](https://npmjs.com/package/axios)
- [express](https://npmjs.com/package/express)
- [fs-extra](https://npmjs.com/package/fs-extra)
- [hidefile](https://npmjs.com/package/hidefile)
- [node-notifier](https://npmjs.com/package/node-notifier)
- [open](https://npmjs.com/package/open)
- [pm2](https://npmjs.com/package/pm2)
- [svcorelib](https://npmjs.com/package/svcorelib)
- [tcp-port-used](https://npmjs.com/package/tcp-port-used)


<br><br>

<div style="text-align:center;" align="center">

Made with ❤️ by [Sv443](https://github.com/Sv443)  
Like Node-Notifier? Please consider [supporting me](https://github.com/sponsors/Sv443)

</div>