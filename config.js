/**
 * Configuration for Node-Notifier
 * @readonly This object can't be modified at runtime
 */
const config = {
    /** Notification settings */
    notifications: {
        /** Whether to add Node-Notifier's icon as a placeholder if no icon was provided in the request. Note that on some OSes there will be another placeholder if you disable this. */
        placeholderIconEnabled: true,
        /** Whether to send a notification when there's an update available for Node-Notifier. Updates are checked for at startup and then on 24 hour interval. */
        notificationOnUpdate: true,
    },
    /** HTTP server settings */
    server: {
        /** TCP port to listen for requests on - default is 8042 */
        port: 8042,
        /** Duration in seconds after which a request will be timed out - default is 15 */
        timeout: 15,
        /** If you are in a network that requires special proxy configuration, you can set it up here */
        proxy: {
            /** Whether your network requires special proxy configuration */
            enabled: false,
            /** Host / IP of the proxy server */
            host: "proxy.its-stuttgart.de",
            /** Port of the proxy server */
            port: 3128
        },
        /** Whether all clients need to provide authentication (the same you need to enter when visiting the dashboard) to interact with the server */
        requireAuthentication: true,
    },
    /** Settings regarding logging stuff to files */
    logging: {
        /** Whether to write all notifications to a log file at `.notifier/notifications.json` - log file will periodically be cleared */
        logNotifications: true,
        /** How many notifications should be kept in the log until the oldest is deleted - default is 30 */
        notificationLogSize: 30,
    },
};

module.exports = Object.freeze(config);
