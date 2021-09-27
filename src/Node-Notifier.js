const pm2 = require("pm2");
const { colors, allOfType, isArrayEmpty, unused } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");

const { parseEnvFile, writeEnvFile, promptNewLogin } = require("./login");
const sendNotification = require("./sendNotification");
const error = require("./error");

const packageJSON = require("../package.json");
const cfg = require("../config");
const settings = require("./settings");


/** @typedef {import("pm2").Proc} Proc */
/** @typedef {import("./types").StartupType} StartupType */
/** @typedef {import("./types").Stringifiable} Stringifiable */


const col = colors.fg;

const { exit } = process;


async function init()
{
    console.log("\nStarting up Node-Notifier...");

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

        pm2.list(async (err, procList) => {
            if(err)
                error("Error while listing pm2 processes", err, false);

            const oldProc = procList.find(proc => proc.name == settings.pm2.name);

            // restart & refresh old process if it exists, else create a new one
            if(oldProc)
                pm2.restart(oldProc.pm_id, (err, proc) => afterPm2Connected("restart", err, proc));
            else
                await startProc();
        });
    });
}

/**
 * Starts the pm2 process
 * @returns {Promise<Proc>}
 */
function startProc()
{
    return new Promise(res => {
        pm2.start({
            name: settings.pm2.name,
            script: "./src/main.js",
            cwd: resolve("./"),
            max_restarts: 10,
            min_uptime: 5000,
            restart_delay: 500,
            wait_ready: settings.pm2.wait,
            watch: settings.pm2.watch,
        }, (err, proc) => {
            afterPm2Connected("new", err, proc);
            res(proc);
        });
    });
}

/**
 * Gets called after the pm2 process has been created
 * @param {StartupType} startupType
 * @param {Error} err
 * @param {Proc} processes
 */
async function afterPm2Connected(startupType, err, processes)
{
    if(err)
        return console.error(`Error while starting process: ${typeof err === "object" ? JSON.stringify(err) : (typeof err.toString === "function" ? err.toString() : err )}`);

    const fProc = processes[0];
    const proc = fProc.pm2_env || fProc;

    console.log("\n\n\n\n\n\n");

    if(startupType === "new")
        console.log(`\n${col.green}Successfully started up Node-Notifier v${packageJSON.version} in the background${col.rst}`);
    else if(startupType === "restart")
        console.log(`\n${col.green}Successfully restarted the background process of Node-Notifier v${packageJSON.version}${col.rst}`);
    else if(startupType === "stopped")
        console.log(`\n${col.yellow}The background process of Node-Notifier v${packageJSON.version} is stopped${col.rst}`);
    else if(startupType === "idle")
        console.log(`\n${col.green}The background process of Node-Notifier v${packageJSON.version} is running${col.rst}`);



    if(startupType !== "stopped")
    {
        console.log(`The HTTP server is listening on port ${col.blue}${cfg.server.port}${col.rst}`);
        console.log(`Dashboard is available at http://127.0.0.1:${cfg.server.port}/\n`);
    }

    if(startupType !== "stopped")
    {
        if(startupType === "new")
            console.log(`Created pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);
        else if(startupType === "restart")
            console.log(`Restarted pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);
        else if(startupType === "idle")
            console.log(`Background pm2 process: ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);

        console.log("    - To list all processes use the command 'pm2 list'");
        console.log("    - To automatically start Node-Notifier after system reboot use 'pm2 startup' or 'pm2 save'");
        console.log("    - To monitor Node-Notifier use 'pm2 monit'");
        console.log(`    - To view Node-Notifier's log use 'pm2 logs ${proc.pm_id}'\n\n`);
    }

    const { index } = await prompt({
        type: "select",
        message: "Choose what to do",
        name: "index",
        choices: [
            {
                title: "Open dashboard ⧉ ",
                value: 0
            },
            {
                title: "Send test notification",
                value: 1
            },
            {
                title: "Manage background process >",
                value: 2
            },
            {
                title: "About Node-Notifier >",
                value: 3,
            },
            {
                title: "Finish",
                value: 4
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

        setTimeout(() => afterPm2Connected("idle", err, processes), 2000);
        break;

    case 1: // test notification
    {
        console.clear();

        console.log(`\n${col.cyan}Sending notification and waiting for response (close or click it)\n${col.rst}`);

        const { meta } = await sendNotification({
            title: "Node-Notifier works!",
            message: `It is now running in the background.\nThe API listens on port ${cfg.server.port}.`,
            icon: resolve("./www/favicon.png"),
            contentImage: resolve("./www/favicon.png"),
            requireInteraction: false,
            open: `http://localhost:${cfg.server.port}`,
            timeout: 10,
        });

        if(meta.action === "timedout")
        {
            console.log(`${col.yellow}Notification timed out. Your OS might have blocked the notification (or you just ignored it).${col.rst}\n`);
            console.log("On Windows, check no app is in full screen and focus assist is turned off");
            console.log("On Mac, check that 'terminal-notifier' isn't being blocked in the notification centre\n");
        }
        else
            console.log(`${col.green}Successfully sent desktop notification.${col.rst}\n`);

        await pause("Press any key to continue...");

        return afterPm2Connected("idle", err, processes);
    }
    case 2: // manage pm2 process
    {
        try
        {
            await manageProcessPrompt(proc);
        }
        catch(err)
        {
            error("Error in process manager prompt", err, true);
        }
        break;
    }
    case 3: // about
    {
        printAbout(processes);
        break;
    }
    case 4: // exit
    default:
        exit(0);
    }
}

/**
 * Pauses the stdin stream until the user presses any key
 * @param {Stringifiable} message Message to display - 1 whitespace is added at the end automatically
 * @returns {Promise<number>} Resolves with key code - resolves -1 if there was an error extracting the key code
 */
function pause(message)
{
    process.stdout.write(`${message.toString()} `);

    return new Promise(res => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", key => {
            process.stdin.pause();
            process.stdin.setRawMode(false);
            process.stdout.write("\n");
            try
            {
                return res(parseInt(key[0]));
            }
            catch(err)
            {
                return res(-1);
            }
        });
    });
}

/**
 * Prints the "About Node-Notifier" dialog
 * @param {Proc} processes
 */
async function printAbout(processes)
{
    console.clear();

    console.log(`Node-Notifier - ${packageJSON.description}`);
    console.log(`Version: ${packageJSON.version}\n`);

    console.log(`GitHub repo:     ${packageJSON.homepage}`);
    console.log(`Submit an issue: ${packageJSON.bugs.url}/new\n`);

    console.log(`Made by ${packageJSON.author.name}`);
    console.log(`${packageJSON.author.url}\n`);

    console.log(`If you enjoy Node-Notifier, please consider supporting me: ${packageJSON.funding}`);

    console.log("\n");

    prompt({
        type: "select",
        name: "idx",
        message: "Choose what to do",
        choices: [
            {
                title: "Open GitHub repo ⧉ ",
                value: 0
            },
            {
                title: "Submit an issue ⧉ ",
                value: 1
            },
            {
                title: "Support me ⧉ ",
                value: 2
            },
            {
                title: "Back to main menu",
                value: 3
            }
        ]
    }).then(({ idx }) => {
        switch(idx)
        {
        case 0: // GH repo
            open(packageJSON.homepage);
    
            return printAbout(processes);
    
        case 1: // GH issue
            open(`${packageJSON.bugs.url}/new`);
    
            return printAbout(processes);

        case 2: // GH sponsor
            open(packageJSON.funding);
    
            return printAbout(processes);
    
        case 3: // back
        default:
            return afterPm2Connected("idle", undefined, processes);
        }
    });
}

/**
 * The prompt that manages the pm2 process
 * @param {Proc} proc
 * @returns {Promise<void, Error>}
 */
function manageProcessPrompt(proc)
{
    return new Promise(async (res, rej) => {
        try
        {
            const { index } = await prompt({
                type: "select",
                message: "Choose what to do",
                name: "index",
                choices: [
                    {
                        title: "Restart process",
                        value: 0
                    },
                    {
                        title: "Delete process",
                        value: 1
                    },
                    {
                        title: "Back to main menu",
                        value: 2
                    },
                ]
            });

            switch(index)
            {
            case 0: // restart
                pm2.restart(proc.pm_id, (err, newProc) => {
                    if(err)
                        return rej(new Error(`Error while restarting process: ${err}`));

                    if(Array.isArray(newProc))
                        newProc = newProc[0];

                    console.log(`Successfully restarted process '${newProc.name}'\n`);

                    setTimeout(() => {
                        manageProcessPrompt(newProc || proc).catch(err => unused(err));
                    }, 2000);
                });
                break;
            case 1: // delete
                {
                    console.log("\nIf you delete your pm2 process, Node-Notifier will no longer run in the background");
                    console.log("Note that when starting up Node-Notifier, the background process will be launched again\n");

                    const { delProc } = await prompt({
                        type: "confirm",
                        message: "Are you sure you want to delete the pm2 process and exit Node-Notifier?",
                        name: "delProc"
                    });

                    if(delProc)
                    {
                        pm2.delete(proc.pm_id, (err, newProc) => {
                            if(err)
                                return rej(new Error(`Error while deleting process: ${err}`));

                            if(Array.isArray(newProc))
                                newProc = newProc[0];

                            console.log("Successfully deleted the process. Exiting.\n");

                            setTimeout(() => {
                                exit(0);
                            }, 2000);
                        });
                    }
                }
                break;
            case 2: // main menu
            default:
                return afterPm2Connected("idle", undefined, [proc]);
            }

            res();
        }
        catch(err)
        {
            return rej(new Error(`Error in process manager: ${err}`));
        }
    });
}

init();
