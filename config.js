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
        /** TCP port to listen for requests on - default is 8042 */
        port: 8042,
        /** Duration in seconds after which a request will be timed out - default is 15 */
        timeout: 15,
        /** Cross Origin Resource Sharing settings - only needed if the server is called from a website - also see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS */
        cors: {
            /** Whether CORS should be enabled - default is true */
            enabled: true,
            /** Which origin to allow - default is "*" (allow all) - also see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin */
            allowOrigin: "*",
        }
    }
};

module.exports = Object.freeze(config);
