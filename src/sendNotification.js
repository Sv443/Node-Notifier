const { notify } = require("node-notifier");


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

module.exports = sendNotification;
