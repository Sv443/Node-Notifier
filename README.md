<div style="text-align:center;" align="center">

# Node-Notifier
Desktop client for [Sv443/ESP-Notifier](https://github.com/Sv443/ESP-Notifier) to trigger a desktop notification through an electrical button press

</div>

<br><br>

## Installation:
1. Install Node.js
2. Install pm2 (`npm i -g pm2`)
3. Clone or download this repo
4. Open a terminal in the project directory
5. Start the process with pm2 (`pm2 start --name="Node-Notifier" node -- .`)
6. See if the service is online (visit http://127.0.0.1:8042/)
7. Send a request to the server (see [sending requests section](#sending-requests))

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