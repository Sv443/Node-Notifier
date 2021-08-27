<div style="text-align:center;" align="center">

# Node-Notifier
Open client that triggers desktop notifications through HTTP requests  
Intended to be used with [Sv443/ESP-Notifier](https://github.com/Sv443/ESP-Notifier) to send a desktop notification through an electrical button press

<br>

---

### [Changelog](./changelog.md#readme) &bull; [License (MIT)](./LICENSE.txt)

---

<br><br>

## Video Showcase:
[![TODO: image preview of video, click to open video in new tab](./.github/assets/video_showcase.png)](https://youtu.be/)

</div>

<br><br>

## Installation:
1. Install Node.js
2. Install pm2 if you want to enable autostart (`npm i -g pm2`)
3. Clone or download this repo
4. Open a terminal in the project directory
5. Start the process (`npm start`)
6. See if the service is online (visit http://127.0.0.1:8042/ in a browser)
7. Send requests to the server (see [sending requests section](#sending-requests))

<br><br>

## Sending Requests:
The IP addresses in this section are placeholders, instead you need to use the IP of the device Node-Notifier is running on.  
(Make sure the DHCP server in your router doesn't change this IP address).  
  
If the client and server are running on the same device, you can use `127.0.0.1` or `localhost`.

> ### Triggering a Notification:
> 
> `POST` &bull; `http://192.168.x.x:8042/send`
> 
> <br>
> 
> **Expected request body (JSON):**
> ```json
> {
>     "title": "My Notification",
>     "message": "Duis ex ipsum velit ea cillum laboris laborum ex consequat consectetur fugiat magna.",
>     "icon": "path/to/some/image.png"
> }
> ```
> Note that the image needs to be present on the system the Node-Notifier server runs on  
>   
> <br>
> 
> **Query parameters:**
> > `?waitForResult`  
> > This is a value-less parameter that makes Node-Notifier wait until the notification was reacted upon by the user or times out.  
> > Also, it will make the API return some data on how the user interacted with the notification.  
> > Make sure your HTTP client waits long enough before getting timed out while the API waits for user interaction!
> 
> <br>
> 
> > `?actions=Ok;Cancel`  
> > Semicolon-separated list of actions the user can choose between when the notification pops up.  
> > If this parameter is set, `?waitForResult` will automatically be set too.

<br><br>

## Disclaimer:
The current version of Node-Notifier only supports HTTP.  
Usually this is fine as long as all devices are part of the same network.  
But still, a compromised network could allow third parties to read your requests, so make sure you are not sending any important data.  
  
If I feel like it I might add HTTPS support in the future.

<br><br>

### Dependencies:
Node-Notifier wouldn't be possible without these libraries:
- [express](https://npmjs.com/package/express)
- [fs-extra](https://npmjs.com/package/fs-extra)
- [node-notifier](https://npmjs.com/package/node-notifier)
- [pm2](https://npmjs.com/package/pm2)
- [svcorelib](https://npmjs.com/package/svcorelib)


<br><br>
<div style="text-align:center;" align="center">

Made with ❤️ by [Sv443](https://github.com/Sv443)  
Like Node-Notifier? Please consider [supporting me](https://github.com/sponsors/Sv443)

</div>