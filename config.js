/**
 * Configuration for Node-Notifier
 * @readonly This object can't be modified at runtime
 */
const config = {
    /** Notification settings */
    notifications: {
        /** Whether to send a notification when Node-Notifier starts up */
        startupNotificationEnabled: false,
    },
    /** HTTP server settings */
    server: {
        /** TCP port to listen for requests on */
        port: 8042,
        /** Duration in seconds after which a request will be timed out */
        timeout: 10,
    }
};

module.exports = Object.freeze(config);
