const axios = require("axios").default;
const semver = require("semver");
const { unused } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");

const sendNotification = require("./sendNotification");
const { setProperty, getProperty } = require("./files");

const packageJson = require("../package.json");
const settings = require("./settings");
const cfg = require("../config");


/**
 * Initializes the update checker
 * @returns {Promise<void, (Error | string)>}
 */
function init()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(settings.updateChecker.enabled)
            {
                setInterval(() => {
                    checkUpdate().catch(unused);
                }, settings.updateChecker.interval);

                checkUpdate().catch(unused);
            }

            return res();
        }
        catch(err)
        {
            return rej(`Error while checking for an update: ${err}`);
        }     
    });
}

/**
 * Checks for an update and optionally sends a notification
 * @returns {Promise<void, (Error | string)>}
 */
function checkUpdate()
{
    return new Promise(async (res, rej) => {
        try
        {
            /** @type {import("axios").AxiosResponse} */
            let result;

            try
            {
                /** @type {import("axios").AxiosRequestConfig} */
                const axCfg = cfg.server.proxy.enabled ? {
                    proxy: {
                        host: cfg.server.proxy.host,
                        port: cfg.server.proxy.port,
                    }
                } : undefined;
                
                result = await axios.get(settings.updateChecker.apiUrl, axCfg);
            }
            catch(err)
            {
                if(err.response.status === 404)
                    return res(); // no releases available
            }            

            if(result.status < 200 || result.status >= 300)
                return rej(`Update check error: GitHub API returned with status ${result.status} - ${result.statusText}`);

            if(!result.data || typeof result.data["tag_name"] !== "string")
                return rej("Update check error: Received unexpected data from GitHub API");


            const latestVer = semver.parse(result.data["tag_name"]);

            if(semver.lt(packageJson.version, latestVer))
            {
                // update is available

                await setProperty("latestRemoteVersion", latestVer.version);
                await setProperty("needsUpdate", true);

                /** @type {boolean} */
                const remindUpdate = await getProperty("remindUpdate");

                if(cfg.notifications.notificationOnUpdate && remindUpdate)
                {
                    const dashUrl = `http://127.0.0.1:${cfg.server.port}/`;

                    const { meta } = await sendNotification({
                        title: "Node-Notifier Update",
                        message: "An update is available for Node-Notifier.\nClick to open the dashboard for more info.",
                        icon: resolve("./www/favicon.png"),
                        contentImage: resolve("./www/favicon.png"),
                        wait: true,
                        timeout: 30,
                    });

                    if(meta.activationType === "contentsClicked" || meta.activationType === "actionClicked")
                        await open(dashUrl);
                }
            }
            else if(semver.eq(packageJson.version, latestVer))
            {
                await setProperty("latestRemoteVersion", latestVer.version);
                await setProperty("needsUpdate", false);
            }

            return res();
        }
        catch(err)
        {
            return rej(`Update check: Error while sending request to GitHub API: ${err}`);
        }
    });
}

module.exports = { init };
