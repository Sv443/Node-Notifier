const express = require("express");
const { resolve } = require("path");
const { unused } = require("svcorelib");

const cfg = require("../config");
const error = require("./error");
const sendNotification = require("./sendNotification");


/** @typedef {import("./sendNotification").Notification} Notification */
/** @typedef {import("svcorelib").JSONCompatible} JSONCompatible */
/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */

/** @typedef {"GET"|"POST"} HttpMethod */
/**
 * @typedef {object} QueryObj
 * @prop {boolean} waitForResult
 * @prop {string[]} actions
 */


/** Placeholder icon path - relative to project root */
const placeholderIcon = "./www/favicon.png";

/** URLs that can be accessed with GET */
const getURLs = [ "/" ];
/** URLs that can be accessed with POST */
const postURLs = [ "/send" ];


const app = express();


/**
 * Initializes the express server
 * @returns {Promise<void, string>}
 */
function init()
{
    return new Promise(async (pRes, pRej) => {
        // serve static files
        app.use(express.static("www"));

        // use JSON middleware
        app.use(express.json());

        app.use((err, req, res, next) => {
            unused(req, next);

            return respondJSON(res, 400, {
                error: true,
                message: err.toString()
            });
        });

        // CORS & OPTIONS middleware
        app.use((req, res, next) => {
            const allowedHeaders = "GET,POST,HEAD";
            
            // CORS
            res.setHeader("Access-Control-Allow-Origin", "*"); // TODO: maybe set this? idk
            res.setHeader("Access-Control-Allow-Methods", allowedHeaders);

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

            console.log(`HTTP server is listening at http://127.0.0.1:${cfg.server.port}`);

            return pRes();
        });


        // on error
        listener.on("error", err => {
            error("Error while setting up express server", err);
            return pRej(err);
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
function incomingRequest(method, req, res, url)
{
    console.log(`Incoming ${method} request to '${url}'`);

    url = url.toLowerCase();

    switch(method)
    {
    case "GET":
        // serve landing page
        if(url === "/")
            res.sendFile(resolve("./www/index.html"));
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
        // POST /send
        if(url.startsWith("/send"))
            return sendNotificationRequest(req, res);
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

    const { title, message, icon } = req.body;

    (typeof title != "string") && invalidProps.push("title");
    (typeof title != "string") && invalidProps.push("message");

    if(invalidProps.length != 0)
    {
        return respondJSON(res, 400, {
            error: true,
            message: `Request body is missing the following ${invalidProps.length == 1 ? "property or it is" : "properties or they are"} invalid: ${invalidProps.join(", ")}`
        });
    }
    else
    {
        /** @type {Notification} */
        const iconProps = typeof icon === "string" ? {
            icon: resolve(icon),
            contentImage: resolve(icon),
        } : {
            icon: resolve(placeholderIcon),
            contentImage: resolve(placeholderIcon),
        };

        /** @type {Notification} Notification properties */
        const notifProps = {
            title,
            message,
            ...iconProps
        };


        const { waitForResult, actions } = parseParameters(req);

        let resultProps = {};
        let responseMessage = "";

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
function parseParameters(req)
{
    let waitForResult = false;
    let actions = [];

    if(typeof req.query === "object" && Object.keys(req.query).length > 0)
    {
        // ?waitForResult
        const qWaitForRes = (req.query["waitForResult"]) ? req.query["waitForResult"].toString() : undefined;

        waitForResult = (typeof qWaitForRes === "string" || qWaitForRes === "true" || qWaitForRes === "1" || qWaitForRes === "yes");


        // ?actions
        const qActions = req.query["actions"];

        const actionsRaw = ((req.query && typeof qActions === "string") ? qActions : null).trim();

        if(typeof actionsRaw === "string")
        {
            if(actionsRaw.includes(","))
                actions = actionsRaw.split(/,/g);
            else
                actions = [ actionsRaw ];

            waitForResult = true;
        }
    }

    return {
        waitForResult,
        actions
    };
}

module.exports = { init };
