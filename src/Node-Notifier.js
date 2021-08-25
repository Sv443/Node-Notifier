const { resolve } = require("path");

const server = require("./server");
const error = require("./error");
const sendNotification = require("./sendNotification");


/** @typedef {import("node-notifier/notifiers/notificationcenter").Notification} Notification */
/** @typedef {import("node-notifier").NotificationMetadata} NotificationMetadata */

/**
 * @typedef {object} SendNotifResult
 * @prop {string} result Result string
 * @prop {NotificationMetadata} meta Notification metadata object
 */

async function init()
{
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
            const { result, meta } = await sendNotification({
                icon: resolve("./assets/townly_icon.png"),
                contentImage: resolve("./assets/townly_icon.png"),
                title: "Title",
                message: "Message",
                closeLabel: "CloseLabel",
                dropdownLabel: "DropdownLabel2",
                actions: [ "Act1", "Act2" ],
                subtitle: "Subtitle",
                wait: true,
                reply: "Reply",
            });
        
            console.log(`Result: ${result}`);
            console.log(`Meta:\n${JSON.stringify(meta, undefined, 4)}`);
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
