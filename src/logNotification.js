const { writeFile, readFile } = require("fs-extra");
const { resolve } = require("path");
const { filesystem } = require("svcorelib");

const cfg = require("../config");


/** @typedef {import("./sendNotification").Notification} Notification */

/**
 * @typedef {object} LogNotification
 * @prop {string} title
 * @prop {string} message
 * @prop {string} icon
 * @prop {string[]} actions
 * @prop {boolean} wait
 * @prop {number} timestamp
 */


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
                await writeFile(notificationLogPath, "[]");
            }

            const { actions, icon, message, title, wait } = notification;

            /** @type {LogNotification} */
            const logNotification = {
                title: title || null,
                message: message || null,
                icon: icon || null,
                actions: actions || null,
                wait: wait || null,
                timestamp: Date.now(),
            };

            action = "reading notification file";
            
            const fileContent = await readFile(notificationLogPath);
            
            action = "parsing notification file";
            
            /** @type {LogNotification[]} */
            const parsed = JSON.parse(fileContent.toString());

            if(parsed.length >= cfg.logging.notificationLogSize)
            {
                action = "removing oldest log entry";
                parsed.splice(0, 1);
            }

            const newLogContent = [ ...parsed, logNotification ];

            action = "writing notification file";

            await writeFile(notificationLogPath, JSON.stringify(newLogContent, undefined, 4));

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
