// Main internal / background process entrypoint

const { filesystem } = require("svcorelib");
const dotenv = require("dotenv");
const { resolve } = require("path");
const kleur = require("kleur");

const server = require("./server");
const error = require("./error");
const getDateTime = require("./getDateTime");
const { initDirs, setProperty } = require("./files");
const checkUpdate = require("./checkUpdate");
const auth = require("./auth");

const packageJSON = require("../package.json");
const settings = require("./settings");


/**
 * Starts the internal process of Node-Notifier
 */
async function init()
{
    const envPath = resolve("./.notifier/.env");
    if(await filesystem.exists(envPath))
        dotenv.config({ path: envPath });

    console.log(`\n${kleur.blue(`[${getDateTime(true)}]`)} Starting up Node-Notifier v${packageJSON.version}...\n`);

    try
    {
        try
        {
            await initDirs();

            await setProps();

            await auth.init();

            await server.init();

            await checkUpdate.init();
        }
        catch(err)
        {
            return error("Node-Notifier encountered an internal error", err, true);
        }

        // if wait is enabled and process is started as a fork, send "ready" signal
        if(settings.pm2.wait && typeof process.send === "function")
            process.send("ready"); // necessary when using `wait_ready: true` in pm2 config
    }
    catch(err)
    {
        return error("General error", err, true);
    }
}

async function setProps()
{
    await setProperty("version", packageJSON.version);
    await setProperty("lastStartup", new Date().getTime());
}

init();
