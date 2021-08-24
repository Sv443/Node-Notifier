const { notify } = require("node-notifier");
const { resolve } = require("path");
const server = require("./server");


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
        await server.init();

        try
        {
            const { result, meta } = await sendNotification({
                icon: resolve("./assets/townly_icon.png"),
                contentImage: resolve("./assets/townly_icon.png"),
                title: "Title2",
                message: "Message2",
                closeLabel: "CloseLabel2",
                dropdownLabel: "DropdownLabel2",
                actions: [ "Act1", "Act2" ],
                subtitle: "Subtitle2",
                wait: true,
                reply: "Reply2",
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
        error("General error", err, true);
    }
}

/**
 * Sends a desktop notification
 * @param {Notification} notification Notification object
 * @returns {Promise<SendNotifResult, (Error|string)>} Resolves with an object containing a result string and a meta object, rejects with an error object or string
 */
function sendNotification(notification)
{
    return new Promise(async (res, rej) => {
        notify(notification, (err, result, meta) => {
            if(err)
                return rej(err);

            return res({ result, meta });
        });
    });
}

/**
 * Logs an error to the console
 * @param {string} message Error message
 * @param {Error|string} err Error instance or string
 * @param {boolean} [fatal=false] Set to `true` to kill the process after sending the error message
 */
function error(message, err, fatal = false)
{
    if(typeof message !== "string")
        throw new TypeError(`Message has to be of type string but got ${typeof message} instead`);

    if(typeof err !== "string" || !(err instanceof Error))
        throw new TypeError(`Err has to be an instance of the Error class or a string but got ${typeof err} instead`);

    if(fatal !== true)
        fatal = false;


    process.stdout.write("\n\n");
    if(typeof err === "string")
        process.stdout.write(`${message}: ${err}`);
    else if(err instanceof Error)
    {
        process.stdout.write(`${message}: ${err.message}\n`);
        process.stdout.write(err.stack);
    }
    process.stdout.write("\n");


    fatal && process.exit(1);

    return;
}

init();
