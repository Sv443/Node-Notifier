const pm2 = require("pm2");
const { colors, allOfType, isArrayEmpty } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");

const { parseEnvFile, writeEnvFile, promptNewLogin } = require("./login");

const packageJSON = require("../package.json");
const cfg = require("../config");
const settings = require("./settings");

/** @typedef {import("pm2").Proc} Proc */

const { exit } = process;

const col = colors.fg;


async function init()
{
    // TODO:
    // - ask to create password here, then write it to .env file
    // - regenerate .env file if it doesn't exist or is invalid

    const localEnv = await parseEnvFile();

    if(!allOfType([ localEnv["ADMIN_USER"], localEnv["ADMIN_PASS"] ], "string") || isArrayEmpty([ localEnv["ADMIN_USER"], localEnv["ADMIN_PASS"] ]) === true)
    {
        console.clear();

        console.log("Node-Notifier needs to create an admin user, so you can access the dashboard and possibly enable HTTP authentication");
        console.log("Please register the admin user below\n");
        console.log("Note: to edit or delete your login run the command 'npm run login-manager'\n");

        const [ user, pass ] = await promptNewLogin();

        localEnv["ADMIN_USER"] = user;
        localEnv["ADMIN_PASS"] = pass;

        const { saveChar } = await prompt({
            type: "confirm",
            name: "saveChar",
            message: "Do you want to save this login? Denying will close Node-Notifier.",
            initial: true,
        });

        if(saveChar)
            await writeEnvFile(localEnv);
        else
        {
            console.log(`\n${col.red}Can't continue without admin user, exiting.${col.rst}\n`);
            exit(0);
        }
    }

    pm2.connect((err) => {
        if(err)
            return console.error(`Error while connecting to pm2: ${err}`);

        pm2.start({
            name: settings.pm2.name,
            script: "./src/main.js",
            cwd: resolve("./"),
            max_restarts: 10,
            min_uptime: 5000,
            restart_delay: 500,
            wait_ready: settings.pm2.wait,
            watch: settings.pm2.watch,
        }, afterPm2Connected);
    });
}

/**
 * Gets called after the pm2 process has been created
 * @param {Error} err
 * @param {Proc|Proc[]} processes
 * @returns
 */
async function afterPm2Connected(err, processes)
{
    if(err)
        return console.error(`Error while starting process: ${err}`);

    const fProc = processes[0];
    const proc = fProc.pm2_env || fProc;

    console.log("\n\n\n\n\n\n");

    console.log(`\n${col.green}Started up Node-Notifier v${packageJSON.version} successfully in the background${col.rst}`);
    console.log(`The HTTP server is listening on port ${col.blue}${cfg.server.port}${col.rst}`);
    console.log(`Dashboard is available at http://127.0.0.1:${cfg.server.port}/\n`);

    console.log(`Created pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);
    console.log("    - To list all processes use the command 'pm2 list'");
    console.log("    - To automatically start Node-Notifier after system reboot use 'pm2 startup' or 'pm2 save'");
    console.log("    - To monitor Node-Notifier use 'pm2 monit'");
    console.log(`    - To view Node-Notifier's log use 'pm2 logs ${proc.pm_id}'\n\n`);
    
    const { index } = await prompt({
        type: "select",
        message: "Choose what to do:",
        name: "index",
        choices: [
            {
                title: "Open dashboard",
                value: 0
            },
            {
                title: "Finish Setup",
                value: 1
            },
        ]
    });

    process.stdout.write("\n");

    switch(index)
    {
    case 0: // dashboard
        await open(`http://127.0.0.1:${cfg.server.port}/`);

        console.clear();

        console.log("\nOpening dashboard...");

        setTimeout(() => afterPm2Connected(err, processes), 2000);
        break;

    case 1: // exit
    default:
        exit(0);
    }
}

init();
