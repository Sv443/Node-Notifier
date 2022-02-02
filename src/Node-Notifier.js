// Main wrapped entrypoint & control panel

const pm2 = require("pm2");
const { colors, allOfType, isArrayEmpty, filesystem } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");
const importFresh = require("import-fresh");

const { parseEnvFile, writeEnvFile, promptNewLogin } = require("./login");
const sendNotification = require("./sendNotification");
const error = require("./error");
const { printTitle, printLines, pause, pauseFor } = require("./cli");

const packageJSON = require("../package.json");
const cfg = require("../config");
const settings = require("./settings");
const { readFile, rm } = require("fs-extra");



/** @typedef {import("pm2").Proc} Proc */
/** @typedef {import("./types").StartupType} StartupType */
/** @typedef {import("./types").Stringifiable} Stringifiable */
/** @typedef {import("./types").LogNotificationObj} LogNotificationObj */
/** @typedef {LogNotificationObj[]} NotificationLog */


const col = { ...colors.fg, gray: "\x1b[90m" };

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
 * @param {Proc[]|Proc} processes
 */
async function afterPm2Connected(startupType, err, processes)
{
    console.clear();

    if(err)
        return console.error(`Error while starting process: ${typeof err === "object" ? JSON.stringify(err) : (typeof err.toString === "function" ? err.toString() : err )}`);

    const fProc = Array.isArray(processes) ? processes[0] : processes;
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
                title: "Show notification log >",
                value: 3,
            },
            {
                title: "About Node-Notifier >",
                value: 4,
            },
            {
                title: "Manage login data >",
                value: 5,
            },
            {
                title: `${col.yellow}Exit control panel${col.rst}`,
                value: 6,
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
            // open: `http://localhost:${cfg.server.port}`,
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
    case 3: // notification log
    {
        console.clear();

        notificationLog(processes);
        break;
    }
    case 4: // about
    {
        console.clear();

        printAbout(processes);
        break;
    }
    case 5: // login mgr
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
    case 6: // exit
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
        let openLink;

        switch(idx)
        {
        case 0: // GH repo
            openLink = packageJSON.homepage;
            break;
        case 1: // GH issue
            openLink = `${packageJSON.bugs.url}/new/choose`;
            break;
        case 2: // GH sponsor
            openLink = packageJSON.funding;
            break;
        default:
        case 3: // back
            return afterPm2Connected("idle", undefined, processes);
        }

        if(openLink)
        {
            open(openLink);

            console.log(`\n${col.green}Opened the link in your browser.${col.rst}`);

            setTimeout(() => printAbout(processes), 3000);
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

const notifLogPath = resolve("./.notifier/notifications.json");

/**
 * Shows the notification log
 * @param {Proc[]} procs
 * @param {number} [page]
 * @param {number} [notifsPerPage]
 */
async function notificationLog(procs, page, notifsPerPage)
{
    const noNotifs = async () => {
        console.log("There are no logged notifications, go send some and come back!\n");
        await pause("Press any key to go back to the control panel...");

        return afterPm2Connected("idle", undefined, procs);
    };

    if(!(await filesystem.exists(notifLogPath)))
        return noNotifs();

    notifsPerPage = parseInt(notifsPerPage);
    if(isNaN(notifsPerPage))
        notifsPerPage = 5;

    page = parseInt(page);
    if(isNaN(page))
        page = 0;

    const notificationsRaw = await readFile(notifLogPath);
    /** @type {NotificationLog} */
    const notifications = JSON.parse(notificationsRaw.toString());

    if(notifications.length < 1)
        return noNotifs();

    // sort latest first
    notifications.sort((a, b) => b.timestamp - a.timestamp);

    if(notifications.length < notifsPerPage)
        notifsPerPage = notifications.length;


    const pipe = `${col.gray}│${col.rst}`;

    /**
     * @param {LogNotificationObj} notif
     * @param {number} idx
     */
    const getFormattedNotification = (notif, idx) => {
        const notifLines = [
            `${pipe} Title:    ${notif.title}`,
            `${pipe} Message:  ${notif.message}`,
        ];

        if(notif.icon)
            notifLines.push(`${pipe} Icon:     ${notif.icon}`);
        if(Array.isArray(notif.actions))
            notifLines.push(`${pipe} Actions:  ${Array.isArray(notif.actions) ? notif.actions.join(", ") : "(none)"}`);
        if(notif.wait === true)
            notifLines.push(`${pipe} Waited for interaction: yes`);

        notifLines.push(`${col.blue}#${idx + 1}${col.rst}${col.gray} • ${new Date(notif.timestamp).toLocaleString()}]${col.rst}`);

        return notifLines.join("\n");
    };

    const maxPage = Math.max(Math.ceil(notifications.length / notifsPerPage) - 1, 0);

    if(page > maxPage)
        return notificationLog(procs, maxPage, notifsPerPage);

    const printPageLine = (short) => {
        const pageTxt = `${page + 1} of ${maxPage + 1}`;
        if(short)
            console.log(`Page ${pageTxt}\n`);
        else
            console.log(`${col.green}Page ${pageTxt}${col.rst} - showing ${col.green}${notifsPerPage} per page${col.rst} - ${notifications.length} notification${notifications.length == 1 ? "" : "s"} in total - sorted latest first\n`);
    };

    let printNotifs = "\n";

    const pageFact = page === 0 ? 0 : page * notifsPerPage;

    for(let i = pageFact; i < pageFact + notifsPerPage; i++)
    {
        if(i >= notifications.length)
            break;

        printNotifs += `${getFormattedNotification(notifications[i], i)}\n\n`;
    }


    await pauseFor(30); // slow down consecutive presses

    console.clear();

    printTitle("Notification Log", "This is a log of the last notifications that have been sent.\nUse the keys at the bottom to navigate.");

    printPageLine();

    console.log(printNotifs);

    printPageLine(true);


    const key = await pause(`${col.cyan}[← →]${col.rst} Navigate Pages • ${col.cyan}[+ -]${col.rst} Adjust Page Size • ${col.cyan}[c]${col.rst} Clear • ${col.cyan}[x]${col.rst} Exit`);

    switch(key.name || key.sequence)
    {
    case "+":
        if(maxPage > 0)
            notifsPerPage++;
        if(notifsPerPage > 30)
            notifsPerPage = 30;
        break;
    case "-":
        notifsPerPage--;
        if(notifsPerPage < 1)
            notifsPerPage = 1;
        break;
    case "left":
        page--;
        if(page < 0)
            page = 0;
        break;
    case "right":
        page++;
        if(page >= maxPage)
            page = maxPage;
        break;
    case "c":
    {
        if(key.ctrl)
            return afterPm2Connected("idle", undefined, procs);

        console.clear();

        const { confirm } = await prompt({
            type: "confirm",
            name: "confirm",
            message: `Do you really want to delete all ${notifications.length} logged notifications?`,
            initial: false,
        });

        if(confirm)
        {
            await rm(notifLogPath);
            console.log(`\n${col.yellow}Successfully deleted all notifications.${col.rst}`);

            let to = setTimeout(() => afterPm2Connected("idle", undefined, procs), 8000);

            await pause("Press any key (or wait 8s) to return to the menu...");

            clearTimeout(to);

            return afterPm2Connected("idle", undefined, procs);
        }
        else
        {
            console.log("\nNot deleting notifications.\n");

            return setTimeout(() => notificationLog(procs, page, notifsPerPage), 2000);
        }
    }
    case "x":
        return afterPm2Connected("idle", undefined, procs);
    default:
        return notificationLog(procs, page, notifsPerPage);
    }

    return notificationLog(procs, page, notifsPerPage);
}

init();
