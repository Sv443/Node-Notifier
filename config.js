const config = {
    notifications: {
        startupNotificationEnabled: true, // send notification on startup
    },
    server: {
        port: 8042,
        timeout: 5 // in seconds
    }
};

module.exports = Object.freeze(config);