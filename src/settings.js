/**
 * Internal settings of Node-Notifier  
 *   
 * It's usually not necessary to change these settings, but I can't stop you so go ahead  
 * (Note that you can easily break something though)
 * @readonly
 */
const internalSettings = {
    /** pm2 settings - these settings need a deletion of the currently running pm2 process if changed */
    pm2: {
        /** Name of pm2 process */
        name: "Node-Notifier",
        /** Whether pm2 should wait until everything is initialized until it considers Node-Notifier ready */
        wait: true,
        /** Whether Node-Notifier's script files should be watched for changes to immediately restart the process so it can use the new files */
        watch: false,
    },
    /** Settings regarding the update checker */
    updateChecker: {
        /** Force disable update checker */
        enabled: true,
        /** Update check interval in milliseconds */
        interval: (1000 * 60 * 60 * 24),
        /** GitHub API URL for latest release */
        apiUrl: "https://api.github.com/repos/Sv443/Node-Notifier/releases/latest",
    }
};

module.exports = Object.freeze(internalSettings);
