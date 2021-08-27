# Node-Notifier - Changelog

<br>

### Version History:

- **[1.0.0](#100)**

<br>

### Planned Features:
- Enable downloading images from a URL (and cache them locally)
  
To suggest more, please [open an issue](https://github.com/Sv443/Node-Notifier/issues/new)

<br><br>

---

<br><br>

## 1.0.0
**The initial release**  
  
- Added HTTP backend that listens for these requests:
    - `GET /` to view a landing page
    - `POST /send` to send a desktop notification
        - `?waitForResult` to make the API wait for an interaction with the notification
        - `?actions` to have a set of actions the user can select
- Added pm2 wrapper so the service runs in the background
- Added config file at `./config.js`
- Added video example

<br><br><br>

<div style="text-align:center;" align="center">

### [EOF]

</div>