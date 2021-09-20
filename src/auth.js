const { allOfType, isEmpty, isArrayEmpty, FolderDaemon, unused, reserialize } = require("svcorelib");
const dotenv = require("dotenv");
const { createHash } = require("crypto");

const error = require("./error");

const packageJson = require("../package.json");
const settings = require("./settings");


/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */
/** @typedef {import("./types").AuthObj} AuthObj */


/** @type {AuthObj} Stores the local auth of the user - instantiated after init & reloaded automatically */
let auth = {};


//#SECTION init & other

/**
 * Initializes the auth module
 * @returns {Promise<void, Error>}
 */
function init()
{
    return new Promise(async (res, rej) => {
        let stage = "reading locally stored auth file";

        try
        {
            const [ user, pass ] = getLocalAuth();

            if(allOfType([ user, pass ], "string") || isArrayEmpty([ user, pass ]) === true)
            {

                auth = Object.freeze({ user, pass });

                stage = "setting up daemon";

                const fd = new FolderDaemon("./", {
                    whitelist: [ ".env" ],
                    updateInterval: 2000,
                });

                fd.onChanged((err) => {
                    if(err)
                        return error("Error while detecting changes in FolderDaemon", err, false);

                    reloadAuth();
                });

                return res();
            }
            else
                return rej(new Error(`Error while initializing auth module, local auth is not available. Please run 'npm start' again to create the '.env' file`));
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
    if(!allOfType([ !process.env["DASHBOARD_USER"], !process.env["DASHBOARD_PASS"] ], "string"))
        reloadAuth();

    const { user, pass } = auth;

    return [ user, pass ];
}

/**
 * Reloads the current local authorization (.env file)
 */
function reloadAuth()
{
    dotenv.config();

    const [ user, pass ] = [ process.env["DASHBOARD_USER"], process.env["DASHBOARD_PASS"] ];

    auth = Object.freeze({ user, pass });
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
        if(!settings.dashboard.needsAuth)
            return true;

        const authB64 = (req.headers.authorization || "").split(" ")[1] || "";

        if(isEmpty(authB64))
            return false;

        const [ user, pass ] = Buffer.from(authB64, "base64").toString().split(":");

        const [ locUser, hash ] = getLocalAuth();

        return ((user === locUser) && passwordMatches(pass, hash));
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
    res.set("WWW-Authenticate", "Basic realm=\"Node-Notifier Dashboard\"");
    res.status(401).send(`Node-Notifier v${packageJson.version} - Authentication required.`);
}

//#SECTION password stuff

/**
 * Hashes a password with sha512 and returns a base64 string
 * @param {string} pass
 * @returns {string} Base64 encoded string, to decode use `Buffer.from(B64_STRING, "base64").toString("utf8")`
 */
function hashPass(pass)
{
    try
    {
        const hash = createHash("sha512");
        hash.update(Buffer.from(pass));
        return hash.digest("base64");
    }
    catch(err)
    {
        // to prevent password leaks through error messages
        err = (err.toString().includes(pass) ? "" : err);
        throw new Error(`Error while hashing password: ${err}`);
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

module.exports = {
    init,
    hasAuth,
    respondRequireAuth,
    hashPass,
};
