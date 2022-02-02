// Main wrapped entrypoint & control panel

const pm2 = require("pm2");
const { colors, allOfType, isArrayEmpty } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");
const importFresh = require("import-fresh");

const { parseEnvFile, writeEnvFile, promptNewLogin } = require("./login");
const sendNotification = require("./sendNotification");
const error = require("./error");
const { printTitle, printLines, pause } = require("./cli");

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
    // - regenerate .env file if it doesn't exist or is invalid

    const localEnv = await parseEnvFile();

    if(!allOfType([ localEnv["ADMIN_USER"], localEnv["ADMIN_PASS"] ], "string") || isArrayEmpty([ localEnv["ADMIN_USER"], localEnv["ADMIN_PASS"] ]) === true)
    {
        console.clear();

        printLines([
            "Node-Notifier needs to create an admin user, so you can access the dashboard and possibly enable HTTP authentication",
            "Please register the admin user below\n",
            "To edit or delete this data, choose \"manage login data\" in the main menu\n",
        ]);

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
            return res(proc);
        });
    });
}

/**
 * Gets called after the pm2 process has been created. It is also the main menu of the control panel.
 * @param {StartupType} startupType
 * @param {Error} err
 * @param {Proc} processes
 */
async function afterPm2Connected(startupType, err, processes)
{
    console.clear();

    if(err)
        return console.error(`Error while starting process: ${typeof err === "object" ? JSON.stringify(err) : (typeof err.toString === "function" ? err.toString() : err )}`);

    const fProc = processes[0];
    const proc = fProc.pm2_env || fProc;

    // console.log(`\n[${new Date().toLocaleString()}]\n\n`);
    // console.log(`Node-Notifier v${packageJSON.version} is ${startupType !== "stopped" ? `${col.green}running` : `${col.red}stopped`}${col.rst}\n\n`);

    printTitle("Control Panel", "Use this menu to manage Node-Notifier");

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
                title: `${col.yellow}Exit control panel${col.rst}`,
                value: 5,
            },
        ]
    });

    switch(optIndex)
    {
    case 0: // dashboard
        await open(`http://127.0.0.1:${cfg.server.port}/`);

        console.clear();

        console.log("\nOpening dashboard in your browser...");

        setTimeout(() => afterPm2Connected("idle", err, processes), 2000);
        break;

    case 1: // test notification
    {
        console.clear();

        console.log(`\n${col.cyan}Sending notification and waiting for response (close or otherwise interact with it)\n${col.rst}`);

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
            printLines([
                `${col.yellow}Notification timed out. Your OS might have blocked the notification or you just ignored it.${col.rst}\n`,
                "On Windows, check no app is in full screen and focus assist is turned off",
                "On Mac, check that 'terminal-notifier' isn't being blocked in the notification centre\n",
            ]);
        }
        else
        {
            printLines([
                `${col.green}Successfully sent desktop notification.${col.rst}`,
                `(Time until interaction: ${((new Date().getTime() - testNotifD) / 1000).toFixed(1)}s)\n`,
            ]);
        }

        await pause("Press any key to continue...");

        return afterPm2Connected("idle", err, processes);
    }
    case 2: // manage pm2 process
    {
        try
        {
            console.clear();

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
        process.stdout.write("\n");
    
        const { openMgr } = await prompt({
            type: "confirm",
            name: "openMgr",
            message: "Do you want to open the login manager? Doing so will close this process.",
            initial: true,
        });

        if(openMgr)
        {
            console.clear();
            return openLoginMgr(); // leaves prompt chain!
        }
        else
            afterPm2Connected("idle", undefined, processes);

        break;
    }
    case 4: // about
    {
        console.clear();

        printAbout(processes);
        break;
    }
    case 5: // exit
    default:
        exit(0);
    }
}

/**
 * Prints the "About Node-Notifier" dialog
 * @param {Proc} processes
 */
async function printAbout(processes)
{
    console.clear();

    printTitle("About", packageJSON.description);

    printLines([
        `Version:      ${packageJSON.version}`,
        `GitHub repo:  ${packageJSON.homepage}`,
        `Submit issue: ${packageJSON.bugs.url}/new/choose`,
        "",
        `Made by ${packageJSON.author.name} - ${packageJSON.author.url}`,
        "",
        `If you enjoy Node-Notifier, please consider supporting me: ${packageJSON.funding}`,
        "\n",
    ]);

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
                title: "Support development ⧉ ",
                value: 2
            },
            {
                title: `${col.yellow}Back to main menu${col.rst}`,
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
            open(`${packageJSON.bugs.url}/new/choose`);
    
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
            printTitle("Manage Process", "This menu is used to manage Node-Notifier's background process");

            printLines([
                `${col.blue}Background process info:${col.rst}`,
                `  - Name:   ${proc.name}`,
                `  - Status: ${proc.status}`,
                `  - ID:     ${proc.pm_id}`,
            ]);

            printLines([
                `\n${col.blue}External commands:${col.rst}`,
                "  - To list all processes use the command 'pm2 list'",
                "  - To automatically start Node-Notifier after system reboot use 'pm2 save' and 'pm2 startup'",
                "  - To monitor Node-Notifier use 'pm2 monit'",
                `  - To view the background process' console output use 'pm2 logs ${proc.name}'\n\n`,
            ]);

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
                        title: `${col.yellow}Back to main menu${col.rst}`,
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
