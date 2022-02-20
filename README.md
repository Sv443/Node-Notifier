<div style="text-align:center;" align="center">

# Node-Notifier

Open client that triggers desktop notifications through HTTP requests  
Intended to be used together with [ESP-Notifier](https://github.com/Sv443/ESP-Notifier) to send a desktop notification through an electrical button press

<br>

[![License](https://img.shields.io/github/license/Sv443/Node-Notifier)](https://sv443.net/LICENSE)
[![Known Vulnerabilities](https://snyk.io/test/github/Sv443/Node-Notifier/badge.svg)](https://snyk.io/test/github/Sv443/Node-Notifier)
[![Discord](https://img.shields.io/discord/565933531214118942)](https://dc.sv443.net/)

<br>

## Video Showcase:

[![video showcase (click to watch)](./.github/video_thumb.png)](https://youtu.be/)

</div>


<br>


## Table of Contents:
- **[Installation](#installation)**
    - [Notes](#notes)
- **[Other Info](#other-info)**
    - [Files and folders](#files-and-folders)
    - [Advanced configuration](#advanced-configuration)
- **[REST API usage](#rest-api-usage)**
    - [Sending a notification](#sending-a-notification)
- [Troubleshooting (help something broke)](#troubleshooting)
- [Disclaimers](#disclaimers)
- [Dependencies](#dependencies)



<br><br>


## Installation:
1. Install [Node.js](https://nodejs.org/)
2. Clone or download and extract this repo
3. Open a terminal in the project directory
4. Install dependencies with the command `npm i`
    - This also installs [pm2](https://npmjs.com/package/pm2) globally. It enables autostart on reboot, monitoring, etc.
5. Start Node-Notifier with `npm start`
    - To start it without being wrapped by pm2 (not recommended for normal use) you can use the command `npm run debug`
6. Enter new login info for the admin user
7. Now you're in the control panel, from here:
    - Test the notification system by selecting the option `Send test notification`
    - Open the dashboard by selecting the option `Open web dashboard` or opening [`http://127.0.0.1:8042`](http://127.0.0.1:8042/) in your browser
8. To make use of Node-Notifier, you can now do either of these:
    - Build an [ESP-Notifier](https://github.com/Sv443/ESP-Notifier) and configure it to work together with Node-Notifier
    - Send requests to the server in another way (see [REST API usage](#rest-api-usage))

<br>

I recommend you look at the rest of this document to familiarize yourself with Node-Notifier.

<br>

### Notes:
- To configure the internals of Node-Notifier even beyond what the dashboard and control panel can do, edit the file `config.js` in the root directory of Node-Notifier.  
After saving, if Node-Notifier is already running, make sure to restart its background process.  
If this is still not enough, you can follow the [advanced configuration section.](#advanced-configuration)
  
- If you need to change or delete your password, use the login manager in the control panel.  
If it's unavailable, you can use the command `npm run login-mgr` to open it instead.  
  
- If you need help with anything or just want to chat you can [join my Discord server.](https://dc.sv443.net/)


<br><br><br>


## Other Info:
Some miscellaneous info about Node-Notifier:

<br>

### Files and folders:
Node-Notifier generates a few files and folders:
- `assets/`  
    This folder is intended to be used as a place to store your notifications' images and potentially other assets.  
    It is generated and filled with an example icon when Node-Notifier first starts up.
  
- `.notifier/`  
    This folder contains all internal files of Node-Notifier.  
    Usually you shouldn't need to edit anything in here, but the program is open and I can't *really* stop you so go wild.
  
- `.notifier/properties.json`  
    This file contains persistent, internal data of Node-Notifier available to the background process and dashboard.  
    I can't recommend editing anything in here as you can very easily break something (and it's all internal values so nothing exciting).  
    If you do want to edit, a JSON schema is attached to the file. This means an editor like [VS Code](https://code.visualstudio.com/) can give a nice visualization and completion help.
  
- `.notifier/notifications.json`  
    This file will be created once the first notification is sent.  
    It is a log file that contains the last `n` notifications (`n` is defined by the property `logging.notificationLogSize` in the file `config.js`).  
    Feel free to use the contents of this file for your own projects. You can find the JSON schema in `.vscode/schemas/notifications.json`
  
- `.notifier/cache_manifest.json`  
    This file will be created to maintain cached icons that have been downloaded from an external URL.  
    It really shouldn't be touched but it can safely be deleted to "refresh" icons and fix inconsistencies (TODO: verify that lol).
  
- `.notifier/.env`  
    This file contains your login data and possibly soon other private data. If needed, modify it with the login manager in the control panel.  
    The password is hashed, so even if the file is leaked, nobody can use it to gain access. Still try to adequately protect it though!

<br>

### Advanced configuration:
Node-Notifier contains an even deeper level of configuring; the internal settings file.  
You can find this file at [`src/settings.js`](./src/settings.js) and you can use it to have the finest possible level of control over Node-Notifier.

<br><br>


<br><br><br>


## REST API usage:
Node-Notifier comes with a REST API that is used to trigger desktop notifications.  
This section tells you how you can use it.  
  
If you use an IP address to send these requests to, make sure your router doesn't change the IP over time.  
If the client and server are running on the same device, you can use `127.0.0.1` or `localhost` (or `::1` for IPv6).

<br>

> ### Sending a notification:
> #### `POST /send`
> 
> <br>
> 
> This is the main endpoint, used to send a desktop notification on the device that Node-Notifier is running on.  
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
> | `[icon]` | A square icon to attach to the notification. Defaults to a placeholder icon on some operating systems if left empty.<br>This image either needs to be present on the system the Node-Notifier server runs on, or you can provide a URL here, which Node-Notifier will automatically download and cache.<br>An `assets` folder will be created at first startup, it is intended for storing both local and cached images. |
> | `[actions]` | Array of actions (buttons or dropdown, depending on OS) the user can select on the notification. Using this automatically enables `?waitForResult` |
> | `[timeout]` | How many seconds to wait before closing the notification automatically. Prioritised over `?waitForResult` - defaults to `10` if left empty. |
> 
> <details><summary><b>Full example (click to view)</b></summary>
> 
> ```json
> {
>     "title": "Door Bell",
>     "message": "Someone is at the door, open it?",
>     "actions": [
>         "Yes",
>         "No"
>     ],
>     "icon": "assets/door.png",
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
> > This is a value-less parameter that makes Node-Notifier wait until the user reacts on a notification or it times out.  
> > Also, it will make the API return some data on how the user interacted with the notification.  
> > Make sure your HTTP client waits long enough before getting timed out while the API waits for user interaction!  
> >   
> > Example usage:  
> > `POST /send?waitForResult`
> 
> <br><br>
> 
> **Possible response bodies:**
> 
> <details><summary>Base response (click to view)</summary>
> 
> ```json
> {
>     "error": false,
>     "message": "Notification was sent"
> }
> ```
> HTTP status code: `200`
> 
> <br></details>
> 
> 
> <details><summary>Response when using ?waitForResult (click to view)</summary>
> 
> ```json
> {
>     "error": false,
>     "message": "Hello, I am a success message",
>     "result": "Can be a string or null",
>     "type": "Describes the type of notification interaction",
>     "value": "Some other value, idk"
> }
> ```
> HTTP status code: `200`
> 
> <br></details>
> 
> 
> <details><summary>Errored response (click to view)</summary>
> 
> ```json
> {
>     "error": true,
>     "message": "Hello, I am an error message"
> }
> ```
> HTTP status code: `400`
> 
> <br></details>
> 
> 
> <details><summary>Unauthorized response (click to view)</summary><br>
> 
> If the API expects you to authorize with the admin login but you didn't provide it or it is wrong, you will get this response:  
>   
> ```json
> {
>     "error": true,
>     "message": "Node-Notifier requires you to authenticate before accessing this resource"
> }
> ```
> HTTP status code: `401`
> 
> <br></details>
> 
> <br>

<br><br><br>

## Troubleshooting:
You can try these troubleshooting steps if something doesn't work:

<br>

- Clear cache files
    > If you encounter issues using icon URLs (like the image being outdated) you can clear Node-Notifier's cache files:
    >   
    > Within the main directory which contains the package.json file, there should be a folder called `.notifier`  
    > (If you can't see it, your OS has hidden it by default. Please look up how to show hidden files and folders for your operating system and follow those steps.)  
    > This folder may contain the file `cache_manifest.json`, which you can delete to make Node-Notifier re-fetch all images.

<br>

- Reset the `config.yml` file
    > This config file contains values that you can tweak to configure Node-Notifier to your liking.  
    > If you need to reset it to its default values, just delete it. Even while Node-Notifier is running, it should automatically be regenerated after a second. If not, restart Node-Notifier.  
    > To permanently delete this file, you need to stop or delete the background process and exit the control panel, then try deleting again.

<br>

- Not autostarting after reboot
    > This could mean the pm2-installer Windows service or the systemd (or equivalent) hook on other OSes somehow didn't get registered.  
    > To fix this, make sure Node-Notifier is running and then, in a terminal without admin rights, run the commands `pm2 save` and `pm2 startup`

<br>

- Reinstall the background process
    > If the background process constantly shows its status as `errored` or `stopped` or is otherwise acting up, first try reading the background process log.  
    > To do this, grab the ID or name of the process in the "Manage PM2 process" menu and then run the command `pm2 logs id_or_name_here` in a terminal without admin rights.  
    >   
    > If the logs are inconclusive or you just want to try the good old "did you turn it off and back on again", do this:  
    >   
    > 1. Open Node-Notifier with `npm start`
    > 2. In the control panel, navigate to the "Manage PM2 process" menu
    > 3. Select "Delete process" and confirm with <kbd>Y</kbd>  
    >     Don't be scared, this process will **not** delete any data, it just reinstalls the pm2 process
    > 4. After it's finished...
    >     - If you're on Windows you need to exit your current terminal and start a new one with admin permissions (<kbd>WinKey</kbd> + <kbd>R</kbd>, enter `powershell` and press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Return</kbd>).  
    >         Now enter `npm start` and follow the prompts until you exit. Now go back to a normal terminal without admin permissions and enter `npm start` again.
    >     - On other operating systems, just enter `npm start` and you should be prompted to install

<br>

- Kill the pm2 daemon
    > If nothing else worked or you are getting the error `connect EPERM //./pipe/rpc.sock`, you can try these steps:  
    >   
    > 1. On Windows, open a terminal with administrator rights (<kbd>WinKey</kbd> + <kbd>R</kbd>, enter `powershell` and press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Return</kbd>).  
    >    On Linux and MacOS sudo or root usually isn't needed for this.  
    > 2. Navigate to the Node-Notifier folder which contains the package.json file with `cd path_here`
    > 3. Now enter the command `npm run fix`
    > 4. To correctly start up Node-Notifier again **it's important you exit the admin terminal if you're on Windows** and always use a normal terminal from now on, unless you are prompted for it.


<br><br><br>


## Disclaimers:
- The current version of Node-Notifier only supports HTTP.  
    Usually this is fine as long as all devices are part of the same network.  
    But still, a compromised network could allow third parties to read your requests.  
    So make sure you are not on a public network and aren't sending any important data.  
    If I feel like it and there's demand, I might add HTTPS support in the future.

- This software is provided "as is", without any warranty or liability.  
    If you notice something wrong, please [submit an issue](https://github.com/Sv443/Node-Notifier/issues/new/choose) and I'll try my best to take care of it.


<br><br>


## Dependencies:
Node-Notifier wouldn't have been possible without these dependencies:
- [axios](https://npmjs.com/package/axios)
- [dotenv](https://npmjs.com/package/dotenv)
- [eslint](https://npmjs.com/package/eslint)
- [express](https://npmjs.com/package/express)
- [fs-extra](https://npmjs.com/package/fs-extra)
- [import-fresh](https://npmjs.com/package/import-fresh)
- [kleur](https://npmjs.com/package/kleur)
- [nanotimer](https://npmjs.com/package/nanotimer)
- [node-notifier](https://npmjs.com/package/node-notifier)
- [node-watch](https://npmjs.com/package/node-watch)
- [open](https://npmjs.com/package/open)
- [pm2](https://npmjs.com/package/pm2)
- [pm2-installer](https://github.com/jessety/pm2-installer)
- [prompts](https://npmjs.com/package/prompts)
- [request-ip](https://npmjs.com/package/request-ip)
- [snyk](https://npmjs.com/package/snyk)
- [svcorelib](https://npmjs.com/package/svcorelib)
- [tcp-port-used](https://npmjs.com/package/tcp-port-used)
- [yaml](https://npmjs.com/package/yaml)


<br><br>


<div style="text-align:center;" align="center">

Made with ❤️ by [Sv443](https://github.com/Sv443)  
Like Node-Notifier? Please consider [supporting me](https://github.com/sponsors/Sv443)

</div>