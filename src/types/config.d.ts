/** The config.yml file, represented as an object */
export interface ConfigFile {
    /** Notification settings: */
    notifications: {
        /** Whether to add Node-Notifier's icon as a placeholder if no icon was provided in the request. Note that on some OSes there will be another placeholder if you disable this. */
        placeholderIconEnabled: boolean;
        /** Whether to send a notification when there's an update available. Updates are checked for at startup and then on 24 hour interval (by default - change in internal settings). */
        notificationOnUpdate: boolean;
    };
    /** Internal server / REST API settings: */
    server: {
        /** TCP port to listen for requests on - default is 8042 */
        port: number;
        /** Duration in seconds after which a request will time out - default is 15 */
        timeout: number;
        /** If you are in a network that requires special proxy configuration, you can set it up here: */
        proxy: {
            /** Whether your network requires special proxy configuration or not */
            enabled: boolean;
            /** Host or IP address of the proxy server */
            host: string;
            /** Port of the proxy server */
            port: number;
            /** Username (leave empty to disable proxy authentication) */
            user: string;
            /** Password (leave empty to disable proxy authentication) */
            pass: string;
        };
        /** Whether all clients need to provide authentication (the same you need to enter when visiting the dashboard) to interact with the server */
        requireAuthentication: boolean;
        /** Which request IPs can bypass authentication (make sure they are set to be static IPs in your router webinterface so no guest device accidentally gets one assigned!) */
        ipWhitelist: string[];
        /** Everything about the asset cache and automatic icon downloading from URLs: */
        assetCache: {
            /** After how many seconds of being in the cache a cached asset expires. Eventually it will be re-fetched when it is used the next time - default is 86400 (1 day) */
            entryExpiresAfter: number;
        };
    };
    /** Settings regarding logging: */
    logging: {
        /** Whether to write all notifications to a log file at `.notifier/notifications.json` - log file will periodically be cleared */
        logNotifications: boolean;
        /** How many notifications should be kept in the log until the oldest is deleted - default is 30 */
        notificationLogSize: number;
    }
}
