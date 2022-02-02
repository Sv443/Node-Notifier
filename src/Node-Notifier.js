const pm2 = require("pm2");
const { colors, allOfType, isArrayEmpty } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");
const importFresh = require("import-fresh");

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
        console.log("To edit or delete this data, choose \"manage login data\" in the main menu\n");

        const [ user, pass ] = await promptNewLogin();

        localEnv["ADMIN_USER"] = user;
        localEnv["ADMIN_PASS"] = pass;

        process.stdout.write("\n");

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
            return exit(0);
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

    console.log(`[${new Date().toLocaleString()}]`);

    if(startupType === "new")
        console.log(`\n${col.green}Successfully started up${col.rst} Node-Notifier v${packageJSON.version} in the background`);
    else if(startupType === "restart")
        console.log(`\n${col.green}Successfully restarted${col.rst} the background process of Node-Notifier v${packageJSON.version}`);
    else if(startupType === "stopped")
        console.log(`\nThe background process of Node-Notifier v${packageJSON.version} ${col.yellow}is stopped${col.rst}`);
    else if(startupType === "idle")
        console.log(`\nThe background process of Node-Notifier v${packageJSON.version} ${col.green}is running${col.rst}`);



    if(startupType !== "stopped")
    {
        console.log(`\nThe HTTP server is listening on port ${col.blue}${cfg.server.port}${col.rst}`);
        console.log(`Dashboard is available at http://127.0.0.1:${cfg.server.port}/\n`);
    }

    if(startupType !== "stopped")
    {
        const startupTypeText = (startupType === "new" ? "Created" : (startupType === "restart" ? "Restarted" : "<idle>"));

        if(startupType === "idle")
            console.log(`pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst} is idling`);
        else
            console.log(`${startupTypeText} pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);

        console.log("  - To list all processes use the command 'pm2 list'");
        console.log("  - To automatically start Node-Notifier after system reboot use 'pm2 startup' or 'pm2 save'");
        console.log("  - To monitor Node-Notifier use 'pm2 monit'");
        console.log(`  - To view Node-Notifier's log use 'pm2 logs ${proc.pm_id}'`);
    }

    console.log("\n\n\n");

    console.log(`${col.green}Node-Notifier - Control Panel${col.rst}`);
    console.log("Use this menu to manage Node-Notifier\n");

    const { optIndex } = await prompt({
        type: "select",
        message: "Choose what to do",
        name: "optIndex",
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
                title: "Manage login data >",
                value: 3,
            },
            {
                title: "About Node-Notifier >",
                value: 4,
            },
            {
                title: "Finish",
                value: 5,
            },
        ]
    });

    process.stdout.write("\n");

    switch(optIndex)
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

        let testNotifD = new Date().getTime();

        const { meta } = await sendNotification({
            title: "Node-Notifier works!",
            message: `It's running in the background, waiting for requests on port ${cfg.server.port}`,
            icon: resolve("./www/favicon.png"),
            contentImage: resolve("./www/favicon.png"),
            requireInteraction: false,
            open: `http://localhost:${cfg.server.port}`,
            timeout: 10,
        });

        if(meta.action === "timedout")
        {
            console.log(`${col.yellow}Notification timed out. Your OS might have blocked the notification or you just ignored it.${col.rst}\n`);
            console.log("On Windows, check no app is in full screen and focus assist is turned off");
            console.log("On Mac, check that 'terminal-notifier' isn't being blocked in the notification centre\n");
        }
        else
        {
            console.log(`${col.green}Successfully sent desktop notification.${col.rst}`);
            console.log(`(Time until interaction: ${((new Date().getTime() - testNotifD) / 1000).toFixed(1)}s)\n`);
        }

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
    case 3: // login mgr
    {
        const { openMgr } = await prompt({
            type: "confirm",
            name: "openMgr",
            message: "Do you want to open the login manager? Doing so will close this process.",
            initial: true,
        });

        if(openMgr)
            openLoginMgr();
        else
            afterPm2Connected("idle", undefined, processes);

        break;
    }
    case 4: // about
    {
        printAbout(processes);
        break;
    }
    case 5: // exit
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
 * Opens the login manager
 */
function openLoginMgr()
{
    importFresh("./tools/login-manager");
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

                    console.log(`\n${col.green}Successfully restarted process '${newProc.name}'${col.rst}\n`);

                    setTimeout(() => {
                        afterPm2Connected("restart", undefined, [newProc || proc]);
                    }, 2000);
                });
                break;
            case 1: // delete
                {
                    console.log("\nIf you delete the pm2 process, Node-Notifier will no longer run in the background.");
                    console.log("Note that when starting up Node-Notifier, the background process will automatically be launched again.\n");

                    const { delProc } = await prompt({
                        type: "confirm",
                        message: "Are you sure you want to delete the process and exit?",
                        name: "delProc"
                    });

                    if(delProc)
                    {
                        pm2.delete(proc.pm_id, async (err, newProc) => {
                            if(err)
                                return rej(new Error(`Error while deleting process: ${err}`));

                            if(Array.isArray(newProc))
                                newProc = newProc[0];

                            console.log(`\n${col.red}Successfully deleted the process.${col.rst}\n`);

                            await pause("Press any key to exit...");

                            exit(0);
                        });
                    }
                    else
                    {
                        console.log(`\n\n${col.yellow}Canceled deletion.${col.rst}\n`);

                        await pause("Press any key to go back to the main menu...");

                        return afterPm2Connected("idle", undefined, [proc]);
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
