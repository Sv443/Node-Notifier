const { colors } = require("svcorelib");
const { resolve } = require("path");

const server = require("./server");
const error = require("./error");
const sendNotification = require("./sendNotification");

const packageJSON = require("../package.json");
const cfg = require("../config");

const col = colors.fg;


/** @typedef {import("node-notifier/notifiers/notificationcenter").Notification} Notification */
/** @typedef {import("node-notifier").NotificationMetadata} NotificationMetadata */

/**
 * @typedef {object} SendNotifResult
 * @prop {string} result Result string
 * @prop {NotificationMetadata} meta Notification metadata object
 */

async function init()
{
    console.log(`\n${col.blue}Node-Notifier v${packageJSON.version}${col.rst}\n`);

    try
    {
        try
        {
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
                    requireInteraction: false
                });
                // const { result, meta } = await sendNotification({
                //     icon: resolve("./www/favicon.png"),
                //     contentImage: resolve("./www/favicon.png"),
                //     title: "Title",
                //     message: "Message",
                //     closeLabel: "CloseLabel",
                //     dropdownLabel: "DropdownLabel2",
                //     actions: [ "Act1", "Act2" ],
                //     subtitle: "Subtitle",
                //     wait: true,
                //     reply: "Reply",
                // });
            
                // console.log(`Result: ${result}`);
                // console.log(`Meta:\n${JSON.stringify(meta, undefined, 4)}`);
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
