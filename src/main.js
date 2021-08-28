const { filesystem, colors } = require("svcorelib");
const { resolve } = require("path");

const server = require("./server");
const error = require("./error");
const sendNotification = require("./sendNotification");

const packageJSON = require("../package.json");
const cfg = require("../config");

const col = colors.fg;

const initDirs = [ "assets" ];


async function init()
{
    console.log(`\n[${getDateTime()}] Starting up Node-Notifier v${packageJSON.version}...\n`);

    try
    {
        try
        {
            await filesystem.ensureDirs(initDirs);

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

function getDateTime()
{
    const pad = n => n < 10 ? `0${n}` : n.toString();

    const d = new Date();

    return `${pad(d.getFullYear())}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

init();
