const { colors } = require("svcorelib");
const dotenv = require("dotenv");

const server = require("./server");
const error = require("./error");
const getDateTime = require("./getDateTime");
const { initDirs, setProperty } = require("./files");
const checkUpdate = require("./checkUpdate");
const auth = require("./auth");

const packageJSON = require("../package.json");
const settings = require("./settings");

const col = colors.fg;


async function init()
{
    dotenv.config({ path: "./.notifier/.env" });

    console.log(`\n${col.blue}[${getDateTime(true)}]${col.rst} Starting up Node-Notifier v${packageJSON.version}...\n`);

    try
    {
        try
        {
            await initDirs();

            await setProperty("version", packageJSON.version);

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

init();
