const { colors } = require("svcorelib");
const { resolve } = require("path");

const server = require("./server");
const error = require("./error");
const sendNotification = require("./sendNotification");
const getDateTime = require("./getDateTime");
const { initDirs } = require("./files");

const packageJSON = require("../package.json");
const cfg = require("../config");

const col = colors.fg;


async function init()
{
    console.log(`\n${col.blue}[${getDateTime(true)}]${col.rst} Starting up Node-Notifier v${packageJSON.version}...\n`);

    try
    {
        try
        {
            await initDirs();

            await server.init();
        }
        catch(err)
        {
            return error("Error while initializing express server", err, true);
        }

        try
        {
            if(cfg.notifications.startupNotificationEnabled)
            {
                await sendNotification({
                    title: "Node-Notifier is running",
                    message: `The HTTP server is listening on port ${cfg.server.port}`,
                    icon: resolve("./www/favicon.png"),
                    contentImage: resolve("./www/favicon.png"),
                    requireInteraction: false,
                    open: `http://localhost:${cfg.server.port}`,
                    timeout: 6,
                });
            }
        }
        catch(err)
        {
            return error("Error while sending notification", err, true);
        }
    }
    catch(err)
    {
        return error("General error", err, true);
    }
}

init();
