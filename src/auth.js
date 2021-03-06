const { allOfType, isEmpty, isArrayEmpty, reserialize, filesystem } = require("svcorelib");
const dotenv = require("dotenv");
const { createHash } = require("crypto");
const { getClientIp } = require("request-ip");
const { default: watch } = require("node-watch");
const { writeFile } = require("fs-extra");

const { cfg } = require("./config");

/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */


/** @type {string[]} Stores the local auth of the user (item 0 = username, item 1 = password hash) - instantiated after init & reloaded automatically */
let auth = [];


//#SECTION init & other

/**
 * Initializes the auth module
 * @returns {Promise<void, Error>}
 */
function init()
{
    return new Promise(async (res, rej) => {
        let stage = "ensuring './.notifier/.env' exists";

        try
        {
            if(!(await filesystem.exists("./.notifier/.env")))
                await writeFile("./.notifier/.env", "");

            stage = "reading locally stored auth file";

            const login = [...getLocalAuth()];

            if(allOfType(login, "string") && isArrayEmpty(login) === false)
            {
                auth = reserialize(login);

                stage = "setting up daemon";

                // Node-Notifier is intended to run 24/7 so if the login info changes, it needs to be reloaded on the fly
                watch("./.notifier/.env")
                    .on("change", reloadAuth);

                return res();
            }
            else
                return rej(new Error("Error while initializing auth module, local auth is not available. Please run 'npm run login-mgr' to generate a new password in the login manager"));
        }
        catch(err)
        {
            return rej(new Error(`Error in auth module while ${stage}: ${err}`));
        }
    });
}

/**
 * Returns the local auth, either from the loaded environment on the process object, or through dotenv
 * @returns {string[]} First item is the user, second item the password hash
 */
function getLocalAuth()
{
    if(Object.keys(auth).length == 0)
        reloadAuth();

    const resAuth = reserialize(auth); // new reference

    return [ ...resAuth ];
}

/**
 * Reloads the current local authorization (.env file)
 */
function reloadAuth()
{
    try
    {
        dotenv.config({ path: "./.notifier/.env" });

        const user = process.env["ADMIN_USER"] || null;
        const pass = process.env["ADMIN_PASS"] || null;

        auth = reserialize([ user, pass ]);
    }
    catch(err)
    {
        throw new Error(`Couldn't reload local authentication: ${err}`);
    }
}

//#SECTION server stuff

/**
 * Checks if a user has valid authorization
 * @param {Request} req
 * @returns {boolean}
 */
function hasAuth(req)
{
    try
    {
        if(isWhitelisted(getClientIp(req)))
            return true;

        const authB64 = (req.headers.authorization || "").split(" ")[1] || "";

        if(isEmpty(authB64))
            return false;

        const [ user, pass ] = Buffer.from(authB64, "base64").toString().split(":");

        const [ locUser, hash ] = getLocalAuth();

        return (user === locUser && passwordMatches(pass, hash));
    }
    catch(err)
    {
        throw new Error(`Error while checking login: ${err}`);
    }
}

/**
 * Tell a client (and their browser) they need to provide authentication
 * @param {Response} res
 */
function respondRequireAuth(res)
{
    res.set("WWW-Authenticate", "Basic realm=\"Node-Notifier\"");
    res.status(401).send({
        error: true,
        message: "Node-Notifier requires you to authenticate before accessing this resource"
    });
}

//#SECTION password stuff

/**
 * Hashes a password with sha512 and returns a base64 string
 * @param {Stringifiable} pass
 * @returns {string} Base64 encoded string, to convert to hex string use `Buffer.from("B64_STRING", "base64").toString("hex")`
 */
function hashPass(pass)
{
    let stage = "creating password hash";

    try
    {
        const hash = createHash("sha512");
        hash.setEncoding("base64");

        stage = "writing to password hash";

        hash.write(pass.toString());

        stage = "reading password hash";

        hash.end();

        const result = hash.read().toString();

        return result;
    }
    catch(err)
    {
        // to prevent possible password leaks through error messages
        const err2 = (err.toString().includes(pass) ? "(error hidden because it contained the password, ref: 'auth.js:hashPass()')" : err);
        throw new Error(`Error while ${stage}: ${err2}`);
    }
}

/**
 * Checks if `pass` matches a `hash`
 * @param {string} pass
 * @param {string} hash
 * @returns {boolean}
 */
function passwordMatches(pass, hash)
{
    if(pass === hash)
        return true;

    if(hashPass(pass) === hash)
        return true;

    return false;
}

/**
 * Checks if an IP is whitelisted in the config
 * @param {string} ip
 * @returns {boolean}
 */
function isWhitelisted(ip)
{
    return cfg.server.ipWhitelist.includes(ip);
}

module.exports = {
    init,
    hasAuth,
    respondRequireAuth,
    hashPass,
    isWhitelisted,
};
