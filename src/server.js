const express = require("express");
const { resolve } = require("path");
const { unused, allOfType } = require("svcorelib");
const { platform } = require("os");
const portUsed = require("tcp-port-used").check;

const cfg = require("../config");
const error = require("./error");
const { getAllProperties, setProperty } = require("./files");
const sendNotification = require("./sendNotification");
const logNotification = require("./logNotification");

/** @typedef {import("node-notifier/notifiers/notificationcenter").Notification} Notification */
/** @typedef {import("svcorelib").JSONCompatible} JSONCompatible */
/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */
/** @typedef {import("./types").HttpMethod} HttpMethod */
/** @typedef {import("./types").QueryObj} QueryObj */


/** Placeholder icon path - relative to project root */
const placeholderIconPath = "./www/favicon.png";

/** URLs that can be accessed with GET */
const getURLs = [ "/", "/int/getProperties" ];
/** URLs that can be accessed with POST */
const postURLs = [ "/send", "/int/setProperty" ];


const app = express();


/**
 * Initializes the express server
 * @returns {Promise<void, string>}
 */
function init()
{
    return new Promise(async (pRes, pRej) => {
        if(await portUsed(cfg.server.port))
            return pRej(new Error(`Error while initializing HTTP server: Port ${cfg.server.port} is already in use. Please kill the process using the port or change the port in 'config.js' to a different number`));

        // serve static files
        app.use(express.static("www"));

        // use JSON middleware
        app.use(express.json());

        app.use((err, req, res, next) => {
            unused(req, next);

            if(typeof err === "string" || err instanceof Error)
            {
                return respondJSON(res, 400, {
                    error: true,
                    message: `General error in HTTP server: ${err.toString()}`
                });
            }
        });

        // CORS & OPTIONS middleware
        app.use((req, res, next) => {
            const allowedHeaders = "GET,POST,HEAD,OPTIONS";
            
            // CORS
            if(cfg.server.cors.enabled)
            {
                res.setHeader("Access-Control-Allow-Origin", cfg.server.cors.allowOrigin);
                res.setHeader("Access-Control-Allow-Methods", allowedHeaders);
            }

            // OPTIONS
            if(req.method === "OPTIONS")
            {
                res.setHeader("Allow", allowedHeaders);
                res.writeHead(200, { "Content-Type": "text/plain; charset=UTF-8" });
                res.end(allowedHeaders);

                return;
            }

            next();
        });


        // listen on URLs defined above
        const listener = app.listen(cfg.server.port, () => {
            for(const url of getURLs)
                app.get(url, (req, res) => incomingRequest("GET", req, res, url));
            for(const url of postURLs)
                app.post(url, (req, res) => incomingRequest("POST", req, res, url));

            return pRes();
        });


        // on error
        listener.on("error", err => {
            error("Error while setting up express server", err);
            return pRej(err instanceof Error ? err : new Error(err));
        });
    });
}

/**
 * Called whenever a client's request is received
 * @param {HttpMethod} method
 * @param {Request} req
 * @param {Response} res
 * @param {string} url Lowercase request URL
 */
async function incomingRequest(method, req, res, url)
{
    console.log(`Incoming ${method} request to '${url}'`);

    url = url.toLowerCase();

    switch(method)
    {
    case "GET":
        // serve dashboard
        if(url === "/")
            res.sendFile(resolve("./www/index.html"));

        if(url === "/int/getproperties")
            return respondJSON(res, 200, (await getAllProperties()));

        break;

    case "POST":
        return parseRequest(req, res, url);

    default:
        return respondJSON(res, 405, {
            error: true,
            message: `Method '${method}' is not allowed - use GET or POST`
        });
    }    
}

/**
 * Sends a JSON object to a client
 * @param {Response} res
 * @param {number} statusCode
 * @param {JSONCompatible} jsonObj
 */
function respondJSON(res, statusCode = 500, jsonObj)
{
    statusCode = parseInt(statusCode);
    if(isNaN(statusCode))
        statusCode = 500;

    if(typeof jsonObj !== "string")
        jsonObj = JSON.stringify(jsonObj, undefined, 4);

    res.writeHead(statusCode, { "Content-Type": "application/json; charset=UTF-8" });
    res.end(jsonObj);
}

/**
 * Called whenever the server recieves a client request with a request body
 * @param {Request} req
 * @param {Response} res
 * @param {string} url
 */
async function parseRequest(req, res, url)
{
    if(req.body === undefined || (req.body && req.body.length < 1))
    {
        return respondJSON(res, 400, {
            error: true,
            message: "No request data was received"
        });
    }

    try
    {
        if(url === "/send")
            return sendNotificationRequest(req, res);

        if(url === "/int/setproperty")
        {
            try
            {
                const key = req.body["key"];
                const value = req.body["value"];

                if(typeof key === "undefined" || typeof value === "undefined")
                {
                    return respondJSON(res, 400, {
                        error: true,
                        message: "Properties 'key' and/or 'value' are missing or invalid"
                    });
                }

                await setProperty(key, value);

                return respondJSON(res, 200, {
                    error: false,
                    message: "Successfully set property"
                });
            }
            catch(err)
            {
                return respondJSON(res, 500, {
                    error: true,
                    message: `Error while setting property: ${err}`
                });
            }
        }
    }
    catch(err)
    {
        return respondJSON(res, 400, {
            error: true,
            message: `Error while parsing request body: ${err.toString()}`
        });
    }
}

/**
 * Called when a request to '/send' is received
 * @param {Request} req
 * @param {Response} res
 */
async function sendNotificationRequest(req, res)
{
    const invalidProps = [];

    const { title, message, icon, actions, timeout } = req.body;

    (typeof title !== "string") && invalidProps.push("title");
    (typeof message !== "string") && invalidProps.push("message");
    (typeof icon !== "undefined" && typeof icon != "string") && invalidProps.push("icon");
    (typeof actions !== "undefined" && (!Array.isArray(actions) || !allOfType(actions, "string"))) && invalidProps.push("actions");
    (typeof timeout !== "undefined" && (typeof timeout !== "number" || timeout < 1)) && invalidProps.push("timeout");

    if(invalidProps.length > 0)
    {
        return respondJSON(res, 400, {
            error: true,
            message: `Request body is missing the following ${invalidProps.length === 1 ? "property or it is" : "properties or they are"} invalid: ${invalidProps.join(", ")}`
        });
    }
    else
    {
        /** @type {Notification} */
        const iconProps = typeof icon === "string" ? {
            icon: resolve(icon),
            contentImage: resolve(icon),
        } : getDefaultIconProps();


        let timeoutInt = typeof timeout === "number" ? parseInt(timeout) : null;

        /** @type {Notification} */
        const timeoutProps = (timeoutInt && !isNaN(timeoutInt) && timeoutInt > 0) ? {
            timeout: timeoutInt
        } : {};


        const { waitForResult } = getQueryParams(req);


        /** @type {string[]|undefined} */
        const parsedActions = (Array.isArray(actions) && allOfType(actions, "string")) ? actions : undefined;

        /** @type {Notification} */
        const actionProps = (parsedActions && parsedActions.length > 0) ? { actions: parsedActions, wait: true } : {};


        let resultProps = {};
        let responseMessage = "";


        /** @type {Notification} Notification properties */
        const notifProps = {
            title,
            message,
            ...timeoutProps,
            ...actionProps,
            ...iconProps,
        };

        if(waitForResult)
        {
            try
            {
                const { result, meta } = await sendNotification(notifProps);

                resultProps = {
                    result: result || null,
                    type: meta.activationType,
                    value: meta.activationValue
                };
                responseMessage = "Successfully sent desktop notification and got a result";
            }
            catch(err)
            {
                return respondJSON(res, 400, {
                    error: true,
                    message: `Error while sending desktop notification: ${err}`
                });
            }
        }
        else
        {
            sendNotification(notifProps).catch(unused);
            responseMessage = "Sent desktop notification";
        }


        // log notification
        try
        {
            if(cfg.logging.logNotifications)
                await logNotification(notifProps);
        }
        catch(err)
        {
            error("Error while logging notification", err);
        }


        return respondJSON(res, 200, {
            error: false,
            message: responseMessage,
            ...resultProps
        });
    }
}

/**
 * Parses query parameters of a request
 * @param {Request} req
 * @returns {QueryObj}
 */
function getQueryParams(req)
{
    let waitForResult = false;


    if(typeof req.query === "object" && Object.keys(req.query).length > 0)
    {
        // ?waitForResult
        const qWaitForRes = (req.query["waitForResult"]) ? req.query["waitForResult"].toString() : undefined;

        waitForResult = (typeof qWaitForRes === "string" || qWaitForRes === "true" || qWaitForRes === "1" || qWaitForRes === "yes");
    }


    return {
        waitForResult
    };
}

/**
 * Returns the default icon properties of a notification.  
 * Does checks for OS, because some notification binaries come with their own placeholders.
 * @returns {Partial<Notification>}
 */
function getDefaultIconProps()
{
    if(!cfg.notifications.placeholderIconEnabled)
        return {};

    const plat = platform();

    let needsPlaceholder = true;

    if(plat === "darwin") // MacOS
        needsPlaceholder = false;

    return needsPlaceholder ? {
        icon: resolve(placeholderIconPath),
        contentImage: resolve(placeholderIconPath),
    } : {};
}

module.exports = { init };
