# Node-Notifier - Changelog

<br>

### Version History:

- **[1.0.0](#100)**

<br>

### Planned Features:
- Enable downloading images from a URL (and cache them locally)
- Add custom pm2 meters so custom values can be displayed in `pm2 desc <id/name>` and `pm2 monit`
- Add video example to the [readme](./README.md#video-showcase)
  
To suggest more, please [open an issue](https://github.com/Sv443/Node-Notifier/issues/new)

<br><br>

---

<br><br>


## 1.0.0
**The initial release**  
  
- Added HTTP backend that listens for these requests:
    - `GET /` to view the dashboard
    - `POST /send` to send a desktop notification
        - `?waitForResult` to make the API wait for an interaction with the notification
        - `?actions` to have a set of actions the user can select
        - Optionally requires basic auth, to not allow unknown clients to trigger notifications
        - Optionally set whitelisted IPs that don't need to provide auth (make sure they are static IPs so no guest device accidentally gets one assigned!)
        - TODO: Automatic downloading and caching of icon URLs
- Added dashboard page TODO: that displays Node-Notifier's status and notifications
    - TODO: verify Dashboard is password protected
- Added pm2 wrapper so the service runs in the background
- Added config file at `./config.js`
- Added update checker TODO: verify works
    - Update instructions in dashboard
    - Desktop notification if update available
- Added menus:
    - Process manager
    - Notification log
    - Login manager


<br><br>


### [EOF]
