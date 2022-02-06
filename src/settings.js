/**
 * These are the internal settings of Node-Notifier.  
 *   
 * It's usually not necessary to change these settings, but I can't stop you so go ahead.  
 * (Note that you can easily break something though)
 */
const internalSettings = {
    /** pm2 settings - these settings need a deletion of the currently running pm2 process if changed ( pm2 del <id or name> ) */
    pm2: {
        /** Name of pm2 process */
        name: "Node-Notifier",
        /** Whether pm2 should wait until everything is initialized until it considers Node-Notifier ready (not really sure what exactly that means but eh) */
        wait: false,
        /** Whether Node-Notifier's script files should be watched for changes to immediately restart the process so it can use the new files */
        watch: false,
        /** Maximum attempts of starting up the background process if it crashes */
        maxRestartAttempts: 2,
        /** Delay in milliseconds between restart attempts after a crash */
        restartDelay: 1000,
    },
    /** Settings regarding the update checker */
    updateChecker: {
        /** Can be used to force disable the update checker */
        enabled: true,
        /** Update check interval in milliseconds, default is 24 hours - represented as (1000ms * 60s * 60m * 24h) */
        interval: (1000 * 60 * 60 * 24),
        /** GitHub API URL for fetching latest release */
        apiUrl: "https://api.github.com/repos/Sv443/Node-Notifier/releases/latest",
    },
    /** Settings regarding the dashboard at http://127.0.0.1:8042/ */
    dashboard: {
        /** TODO: reimplement: Whether the dashboard needs authentication to be accessed */
        needsAuth: true,
    },
    /** Internal server settings */
    server: {
        /** Accepted MIME types when trying to download and cache an asset and a mapping to their file extension */
        dlCacheMimeTypes: [
            {
                mime: "image/png",
                ext: "png",
            },
            {
                mime: "image/jpeg",
                ext: "jpg",
            },
            {
                mime: "image/gif",
                ext: "gif",
            },
            {
                mime: "image/vnd.microsoft.icon",
                ext: "ico",
            },
        ],
        /** Interval of node-watch daemons */
        daemonInterval: 500,
    }
};

module.exports = Object.freeze(internalSettings);
