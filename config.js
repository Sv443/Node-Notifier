const config = {
    notifications: {
        startupNotificationEnabled: false, // send notification on startup
    },
    server: {
        port: 8042,
        timeout: 10 // in seconds
    }
};

module.exports = Object.freeze(config);