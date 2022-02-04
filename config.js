/**
 * This is the user configuration for Node-Notifier.  
 *   
 * Contrary to the internal settings at `./src/settings.js`, this config file is supposed to be more user oriented (that doesn't mean user friendly lol).
 */
const config = {
    /** Notification settings */
    notifications: {
        /** Whether to add Node-Notifier's icon as a placeholder if no icon was provided in the request. Note that on some OSes there will be another placeholder if you disable this. */
        placeholderIconEnabled: true,
        /** Whether to send a notification when there's an update available. Updates are checked for at startup and then on 24 hour interval (by default - change in internal settings). */
        notificationOnUpdate: true,
    },
    /** HTTP server / REST API settings */
    server: {
        /** TCP port to listen for requests on - default is 8042 */
        port: 8042,
        /** Duration in seconds after which a request will time out - default is 15 */
        timeout: 15,
        /** If you are in a network that requires special proxy configuration, you can set it up here */
        proxy: {
            /** Whether your network requires special proxy configuration or not */
            enabled: false,
            /** Host or IP address of the proxy server */
            host: "proxy.mydomain.com",
            /** Port of the proxy server */
            port: 3128,
        },
        /** Whether all clients need to provide authentication (the same you need to enter when visiting the dashboard) to interact with the server */
        requireAuthentication: true,
        /** Which request IPs can bypass authentication */
        ipWhitelist: [
            "127.0.0.1",
            "::1",
        ],
        /** Everything about the asset cache and automatic icon downloading from URLs */
        assetCache: {
            /** After how many seconds of being in the cache a cached asset expires. Eventually it will be re-fetched when it is used the next time - default is 86400 (1 day) */
            entryExpiresAfter: 86400,
        }
    },
    /** Settings regarding logging */
    logging: {
        /** Whether to write all notifications to a log file at `.notifier/notifications.json` - log file will periodically be cleared */
        logNotifications: true,
        /** How many notifications should be kept in the log until the oldest is deleted - default is 30 */
        notificationLogSize: 30,
    },
};

module.exports = Object.freeze(config);
