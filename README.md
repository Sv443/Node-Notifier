<div style="text-align:center;" align="center">

# Node-Notifier
Desktop client for [Sv443/ESP-Notifier](https://github.com/Sv443/ESP-Notifier) to trigger a desktop notification through an electrical button press

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

> ### Triggering a Notification:
> 
> `POST` &bull; `http://1.2.3.4:8042/send`
> 
> Expected request body (JSON):
> ```json
> {
>     "foo": "bar"
> }
> ```

<br><br>

## Disclaimer:
The current version of Node-Notifier only supports HTTP.  
Usually this is fine as long as all devices are part of the same network.  
But still, a compromised network could allow third parties to read your requests, so make sure you are not sending any important data.  
  
If I feel like it I might add HTTPS support in the future.
