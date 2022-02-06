const { writeFile, readFile } = require("fs-extra");
const { resolve } = require("path");
const { filesystem } = require("svcorelib");

const { setProperty } = require("./files");

const { cfg } = require("./config");

/** @typedef {import("node-notifier/notifiers/notificationcenter").Notification} Notification */
/** @typedef {import("./types").LogNotificationObj} LogNotificationObj */


/**
 * Logs a notification to the notifications.json file
 * @param {Notification} notification
 * @returns {Promise<void, (Error | string)>}
 */
function logNotification(notification)
{
    return new Promise(async (res, rej) => {
        let action = "ensuring notification log exists";

        try
        {
            const notificationLogPath = resolve("./.notifier/notifications.json");

            if(!(await filesystem.exists(notificationLogPath)))
            {
                action = "creating notification file";
                await writeFile(notificationLogPath, JSON.stringify([], undefined, 4));
            }

            const { actions, icon, message, title, wait } = notification;

            /** @type {LogNotificationObj} */
            const logNotification = {
                title: title || null,
                message: message || null,
                icon: icon || null,
                actions: actions || null,
                wait: wait || false,
                timestamp: Date.now(),
            };

            action = "reading notification file";
            
            const fileContent = await readFile(notificationLogPath);
            
            action = "parsing notification file";
            
            /** @type {LogNotificationObj[]} */
            const parsed = JSON.parse(fileContent.toString());

            if(parsed.length >= cfg.logging.notificationLogSize)
            {
                action = "removing oldest log entry";
                parsed.splice(0, 1);
            }

            action = "Updating properties.json";

            await setProperty("lastNotification", Date.now());

            action = "writing notification to log file";

            await writeFile(notificationLogPath, JSON.stringify([ ...parsed, logNotification ], undefined, 4));

            action = "(done)";

            return res();
        }
        catch(err)
        {
            return rej(new Error(`LogNotification: Error while ${action}: ${err}`));
        }
    });
}

module.exports = logNotification;
