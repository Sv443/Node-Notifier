const { allOfType, isEmpty, isArrayEmpty, unused, reserialize } = require("svcorelib");
const dotenv = require("dotenv");
const { createHash } = require("crypto");
const watch = require("node-watch").default;
const { Readable } = require("stream");

const error = require("./error");

const packageJson = require("../package.json");
const settings = require("./settings");


/** @typedef {import("svcorelib").Stringifiable} Stringifiable */
/** @typedef {import("express").Request} Request */
/** @typedef {import("express").Response} Response */
/** @typedef {import("./types").AuthObj} AuthObj */


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
        let stage = "reading locally stored auth file";

        try
        {
            const [ user, pass ] = getLocalAuth();

            if(allOfType([ user, pass ], "string") || isArrayEmpty([ user, pass ]) === true)
            {
                auth = Object.freeze([ user, pass ]);

                stage = "setting up daemon";

                watch("./.env", (e, name) => {
                    unused(e, name);
                    reloadAuth();
                });

                return res();
            }
            else
                return rej(new Error(`Error while initializing auth module, local auth is not available. Please run 'npm run password' to generate a new password in the password manager`));
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
    dotenv.config();

    const user = process.env["ADMIN_USER"] || undefined;
    const pass = process.env["ADMIN_PASS"] || undefined;

    auth = reserialize([ user, pass ]);
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
 * @param {Stringifiable} pass
 * @returns {string} Base64 encoded string, to convert to hex string use `Buffer.from("B64_STRING", "base64").toString("hex")`
 */
function hashPass(pass)
{
    let stage = "creating password hash";

    try
    {
        const hash = createHash("sha256");
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
        // to prevent password leaks through error messages
        err = (err.toString().includes(pass) ? "! (error hidden because it contained the password) !" : err);
        throw new Error(`Error while ${stage}: ${err}`);
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
