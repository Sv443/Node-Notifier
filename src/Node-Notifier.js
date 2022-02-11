// Main wrapped entrypoint & control panel

const pm2 = require("pm2");
const { allOfType, isArrayEmpty, filesystem, mapRange } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");
const prompt = require("prompts");
const importFresh = require("import-fresh");
const { exec } = require("child_process");
const kleur = require("kleur");
const { freemem } = require("os");

const { parseEnvFile, writeEnvFile, promptNewLogin } = require("./login");
const sendNotification = require("./sendNotification");
const error = require("./error");
const { printTitle, printLines, pause, pauseFor } = require("./cli");
const { getDateTimeFrom } = require("./getDateTime");
const { initDirs, setProperty, getProperty } = require("./files");

const packageJSON = require("../package.json");
const { cfg } = require("./config");
const settings = require("./settings");
const { readFile, rm } = require("fs-extra");
const { platform } = require("os");


//#SECTION types


/** @typedef {import("pm2").Proc} Proc */
/** @typedef {import("./types").StartupType} StartupType */
/** @typedef {import("./types").Stringifiable} Stringifiable */
/** @typedef {import("./types").LogNotificationObj} LogNotificationObj */
/** @typedef {LogNotificationObj[]} NotificationLog */


//#MARKER init


const { exit } = process;


async function init()
{
    console.log(kleur.gray("\nStarting up Node-Notifier..."));

    const localEnv = await parseEnvFile();

    await initDirs();

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
            console.log(kleur.red("\nCan't continue without admin user, exiting.\n"));
            return exit(0);
        }
    }

    const firstInstallDone = await getProperty("firstInstallDone");

    if(firstInstallDone !== true)
    {
        if(platform() === "win32")
        {
            // Install pm2-installer on Windows: https://github.com/jessety/pm2-installer

            process.stdout.write("\n");

            if(await isAdmin())
            {
                printLines([
                    "This seems to be your first install of Node-Notifier and this is also a Windows machine.",
                    "",
                    "Node-Notifier needs some special setup on Windows devices:",
                    "It needs to install pm2-installer, which will set up a Windows service that keeps Node-Notifier's background process alive.",
                    "Without this, the background process will completely exit if you restart your PC and you have to install Node-Notifier again each time."
                ], 1);

                const { cont } = await prompt({
                    type: "confirm",
                    name: "cont",
                    message: "Do you want to proceed with the installation?",
                    initial: true,
                });

                process.stdout.write("\n");

                if(cont)
                {
                    await setupWindowsStartup();

                    console.log(kleur.green("\n\npm2-installer was successfully set up.\n"));

                    await setProperty("firstInstallDone", true);

                    await pause("Press any key to continue...");
                }
                else
                {
                    console.log(kleur.yellow("Skipping installation of pm2-installer."));

                    await pauseFor(2000);
                }
            }
            else
            {
                printLines([
                    "Node-Notifier needs administrator rights when first starting up on Windows.",
                    "It needs them to set up a service that automatically revives the background process whenever you restart your PC.",
                    "So please start Node-Notifier again, but with administrator rights."
                ], 1);

                await pause("Press any key to exit...");

                exit(0);
            }
        }
        else
        {
            // startup hook install for Linux & Mac:

            process.stdout.write("\n");

            printLines([
                "This seems to be your first install of Node-Notifier.",
                "",
                "First up, please create the startup hook to automatically start up the background process whenever your PC restarts.",
                "You can skip this, but then you'd have to run Node-Notifier manually on each PC restart.",
            ], 1);

            const { cont } = await prompt({
                type: "confirm",
                name: "cont",
                message: "Do you want to set up the startup hook?",
                initial: true,
            });

            process.stdout.write("\n");

            if(cont)
            {
                console.log("\nSaving process list (1/2)...");
                await runCommand("npm run save"); // might need to replace with path to pm2 binary after packaging with pkg

                console.log("Creating startup hook (2/2)...");
                await runCommand("npm run startup");

                console.log(kleur.green("\n\nStartup hook successfully created."));

                await setProperty("firstInstallDone", true);

                await pause("Press any key to continue...");
            }
            else
            {
                console.log(kleur.yellow("Skipping startup hook setup."));

                await pauseFor(1500);
            }
        }
    }

    return initPm2();
}

//#MARKER pm2 stuff

/**
 * Connects to the pm2 daemon, grabs Node-Notifier's process and then passes it on to the control panel
 */
function initPm2()
{
    pm2.connect((err) => {
        if(err)
            return console.error(`Error while connecting to pm2: ${err}`);

        pm2.list(async (err, procList) => {
            if(err)
                error("Error while listing pm2 processes", err, false);

            const proc = procList.find(pr => pr.name === settings.pm2.name);

            if(proc)
                afterPm2Connected("idle", undefined, proc);
            else
                await startProc();
        });
    });
}

/**
 * Returns the Node-Notifier pm2 process
 * @returns {Promise<Proc>}
 */
function getPm2Proc()
{
    return new Promise((res, rej) => {
        pm2.list(async (err, procList) => {
            if(err)
                return rej(err instanceof Error ? err : new Error(err.toString()));

            const proc = procList.find(pr => pr.name === settings.pm2.name);

            return res(proc);
        });
    });
}

/**
 * Uses [pm2-installer](https://github.com/jessety/pm2-installer) to set up pm2 startup on Windows
 * @returns {Promise<void, number>}
 */
function setupWindowsStartup()
{
    return new Promise(async (res, rej) => {
        try
        {
            const pm2InstPath = "./pm2-installer/";

            console.log("\nInstalling pm2-installer (this could take a while)...\n");

            console.log("Configuring pm2-installer (1/3)...");
            await runCommand("npm run configure", pm2InstPath);

            console.log("Configuring PowerShell policy (2/3)...");
            await runCommand("npm run configure-policy", pm2InstPath);

            console.log("Setting up pm2-installer (3/3)...");
            await runCommand("npm run setup", pm2InstPath);

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Call to remove any changes made by [pm2-installer](https://github.com/jessety/pm2-installer)
 * @param {number} firstStep
 * @param {number} maxSteps
 */
function removeWindowsStartup(firstStep = 1, maxSteps = 2)
{
    return new Promise(async (res, rej) => {
        try
        {
            const pm2InstPath = "./pm2-installer/";

            console.log(`Reverting pm2-installer configuration (${firstStep}/${maxSteps})...`);
            await runCommand("npm run deconfigure", pm2InstPath);

            console.log(`Removing pm2-installer (${firstStep + 1}/${maxSteps})...`);
            await runCommand("npm run remove", pm2InstPath);

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Runs a shell command. Resolves void if exit code = 0, else rejects with an error or the exit code.
 * @param {string} command
 * @param {string} [cwd]
 * @returns {Promise<void, (Error | number)>}
 */
function runCommand(command, cwd)
{
    return new Promise(async (res, rej) => {
        const cp = exec(command, {
            ...(cwd ? { cwd } : {}),
            windowsHide: true,
        }, (err) => {
            err && rej(err);
        });

        cp.on("exit", (code) => {
            if(code === 0)
                return res();

            return rej(code);
        });
    });
}

/**
 * Starts the pm2 process
 * @returns {Promise<void>}
 */
function startProc()
{
    return new Promise(res => {
        pm2.start({
            name: settings.pm2.name,
            script: "./src/main.js",
            cwd: resolve("./"),
            max_restarts: settings.pm2.maxRestartAttempts,
            min_uptime: 5000,
            restart_delay: settings.pm2.restartDelay,
            wait_ready: settings.pm2.wait,
            watch: settings.pm2.watch,
        }, (err, proc) => {
            afterPm2Connected("new", err, proc);
            return res();
        });
    });
}

/**
 * [Windows only] Checks if the process has admin rights  
 * Stolen from [sindresorhus/is-admin](https://github.com/sindresorhus/is-admin) since it uses ES imports & exports and I don't
 * @throws {Error} if platform is not 'win32'
 * @returns {Promise<boolean>}
 */
function isAdmin()
{
    return new Promise(async (res, rej) => {
        if(platform() !== "win32")
            return rej(new Error(`Unsupported platform '${platform()}', expected 'win32'`));

        try
        {
            await runCommand(`fsutil dirty query ${process.env.systemdrive}`);
            return res(true);
        }
        catch(err)
        {
            if(err.code === "ENOENT")
            {
                try
                {
                    await runCommand("fltmc");
                    return res(true);
                }
                catch(err)
                {
                    return res(false);
                }
            }

            return res(false);
        }
    });
}


//#MARKER UI


//#SECTION control panel


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
    /** @type {Proc} */
    const proc = fProc.pm2_env || fProc;

    // console.log(`\n[${new Date().toLocaleString()}]\n\n`);
    // console.log(`Node-Notifier v${packageJSON.version} is ${startupType !== "stopped" ? `${col.green}running` : `${col.red}stopped`}${col.rst}\n\n`);

    printTitle("Node-Notifier - Control Panel", "Use this menu to manage Node-Notifier");

    const procStat = proc.status;
    const procStatCol = procStat === "online" ? kleur.green : (procStat === "stopped" ? kleur.red : kleur.yellow);

    const { optIndex } = await prompt({
        type: "select",
        message: "Choose what to do",
        name: "optIndex",
        choices: [
            {
                title: `Open dashboard${kleur.reset("")} ↗`,
                value: 0
            },
            {
                title: "Send test notification",
                value: 1
            },
            {
                title: `Manage PM2 process${kleur.reset("")} ${kleur.gray("[")}${procStatCol(procStat)}${kleur.gray("]")}${kleur.reset("")} >`,
                value: 2
            },
            {
                title: `Show notification log${kleur.reset("")} >`,
                value: 3,
            },
            {
                title: `About Node-Notifier${kleur.reset("")} >`,
                value: 4,
            },
            {
                title: `Manage login data${kleur.reset("")} >`,
                value: 5,
            },
            {
                title: kleur.yellow("Exit control panel"),
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

        printTitle("Test Notification");

        await pauseFor(300);

        console.log(`Sent notification and waiting for response ${kleur.cyan("(close or otherwise interact with it)")}\n`);

        let testNotifD = new Date().getTime();

        const { meta } = await sendNotification({
            title: "Node-Notifier works",
            message: "Click me!",
            icon: resolve("./www/favicon.png"),
            contentImage: resolve("./www/favicon.png"),
            requireInteraction: true,
            // open: `http://localhost:${cfg.server.port}`,
            timeout: 20,
        });

        if(meta.action === "timedout")
        {
            const plat = platform();

            const osName = plat === "win32" ? "Windows" : (plat === "darwin" ? "MacOS" : "Your OS");

            const lns = [ kleur.yellow(`Notification timed out. ${osName} might have blocked the notification or you just ignored it.\n`) ];

            if(plat === "win32")
            {
                lns.push("Check no app is in full screen and focus assist is turned off (no moon on the notifications icon at the far right of the task bar).");
                lns.push("To turn it off, right-click the notifications icon in the task bar, then select 'Off' under 'Focus assist'. Then, please try again.");
            }
            else if(plat === "darwin")
                lns.push("Check that 'terminal-notifier' is allowed in the 'notification centre' of the system preferences.");
            else
                lns.push("Check that 'growl' isn't blocked in your specific operating system's notification manager.");

            printLines(lns);
        }
        else
        {
            printLines([
                kleur.green("Successfully sent desktop notification.\n"),
                kleur.gray(`(Time until interaction: ${((new Date().getTime() - testNotifD) / 1000).toFixed(1)}s)`),
            ]);
        }

        await pause("\n\nPress any key to continue...");

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
            message: "Do you want to open the login manager? Doing so will close the control panel.",
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

//#SECTION about

/**
 * Prints the "About Node-Notifier" dialog
 * @param {Proc} processes
 */
async function printAbout(processes)
{
    console.clear();

    printTitle("About Node-Notifier", packageJSON.description);

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
                title: `Open GitHub repo${kleur.reset("")} ↗`,
                value: 0
            },
            {
                title: `Submit an issue${kleur.reset("")} ↗`,
                value: 1
            },
            {
                title: `Support development${kleur.reset("")} ↗`,
                value: 2
            },
            {
                title: kleur.yellow("Back to main menu"),
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

            console.log(kleur.green("\nOpened the link in your browser."));

            setTimeout(() => printAbout(processes), 3000);
        }
    });
}

//#SECTION login manager

/**
 * Opens the login manager
 */
function openLoginMgr()
{
    importFresh("./tools/login-manager");
}

//#SECTION process manager

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
            console.log(kleur.gray("Loading process info..."));

            await pauseFor(100);

            const pr = await getPm2Proc();

            const descProc = () => new Promise((res, rej) => {
                pm2.describe(settings.pm2.name, (err, procDesc) => {
                    if(err)
                        return rej(err);
                    return res(procDesc[0]);
                });
            });

            const prDesc = await descProc();

            const statColMap = {
                "online": kleur.green,
                "launching": kleur.blue,
                "stopped": kleur.red,
                "crashed": kleur.magenta,
            };

            const statusCol = st => statColMap[st](st);


            console.clear();

            printTitle("Manage Process", "This menu is used to manage Node-Notifier's background process");

            const stat = prDesc.pid === 0 ? "stopped" : "online";

            const ramUsage = parseFloat(mapRange(pr.monit.memory, 0, freemem(), 0, 100).toFixed(2));
            const ramUsageMiB = pr.monit.memory / 1.049e+6;

            const ramCol = ramUsageMiB < 75 ? kleur.green : (ramUsageMiB < 150 ? kleur.yellow : kleur.red);

            printLines([
                kleur.blue("Background process info:"),
                `│ Process: ${kleur.yellow(pr.name)} ${kleur.gray(`[${kleur.yellow(pr.pm_id)}]`)}`,
                `│ Status:  ${statusCol((pr.status || prDesc.status || "online") !== "online" ? pr.status : stat)}`,
                `│ Memory:  ${stat === "online" ? ramCol(`${ramUsage}%`) : kleur.gray("0%")} ${kleur.gray(`(${stat === "online" ? ramUsageMiB.toFixed(1) : 0} MiB)`)}`,
                `│ PWD:     ${(pr.env ?? pr.pm2_env)?.PWD ?? `most likely ${process.cwd()}`}`,
            ]);

            printLines([
                kleur.blue("\nPM2 commands:"),
                "│ To list all processes use the command 'pm2 list'",
                "│ To automatically start Node-Notifier after system reboot use 'pm2 save' and 'pm2 startup'",
                "│ To monitor Node-Notifier use 'pm2 monit'",
                `│ To view the background process' console output use 'pm2 logs ${settings.pm2.name}'\n\n`,
            ]);

            const choices = [];

            if(stat === "online")
            {
                choices.push({
                    title: `Restart process${kleur.reset("")} ${kleur.yellow("↻")}`,
                    value: 0,
                });
            }

            [
                {
                    title: stat === "online" ? `Stop process${kleur.reset("")} ${kleur.red("ϴ")}` : `Start process${kleur.reset("")} ${kleur.green("►")}`,
                    value: 1,
                },
                {
                    title: `Delete process${kleur.reset("")} ${kleur.magenta("X")}`,
                    value: 2,
                },
                {
                    title: kleur.yellow("Back to main menu"),
                    value: 3,
                },
            ].forEach(ch => choices.push(ch));

            const { index } = await prompt({
                type: "select",
                message: "Choose what to do",
                name: "index",
                choices,
            });

            switch(index)
            {
            case 0: // restart
                pm2.restart(proc.pm_id, (err, newProc) => {
                    if(err)
                        return rej(new Error(`Error while restarting process: ${err}`));

                    if(Array.isArray(newProc))
                        newProc = newProc[0];

                    console.log(kleur.green(`\nSuccessfully restarted process '${newProc.name}'\n`));

                    setTimeout(() => {
                        manageProcessPrompt(newProc || proc);
                    }, 1000);
                });
                break;
            case 1: // stop / start
                if(stat === "online")
                {
                    pm2.stop(proc.pm_id, (err, newProc) => {
                        if(err)
                            return rej(err instanceof Error ? err : new Error(`Error while stopping process: ${err}`));
                        
                        if(Array.isArray(newProc))
                            newProc = newProc[0];

                        console.log(kleur.yellow(`\nSuccessfully stopped process '${newProc.name}'\n`));

                        setTimeout(() => {
                            manageProcessPrompt(newProc || proc);
                        }, 1000);
                    });
                }
                else
                {
                    console.log(kleur.green("\nStarting process..."));

                    await pauseFor(1000);

                    return startProc();
                }
                break;
            case 2: // delete
                {
                    console.clear();

                    console.log("\nIf you delete the pm2 process, Node-Notifier will no longer run in the background.");
                    console.log("Note that when starting up Node-Notifier, the background process will automatically be launched again.\n");

                    const { delProc } = await prompt({
                        type: "confirm",
                        message: "Are you sure you want to delete the process and exit?",
                        name: "delProc"
                    });

                    if(delProc)
                    {
                        const plat = platform();

                        console.log(`\nDeleting pm2 process (1/${plat === "win32" ? 4 : 2})...`);

                        pm2.delete(proc.pm_id, async (err, newProc) => {
                            if(err)
                                return rej(new Error(`Error while deleting process: ${err}`));

                            if(Array.isArray(newProc))
                                newProc = newProc[0];

                            if(plat === "win32")
                                await removeWindowsStartup(2, 4);

                            console.log(`Adjusting properties.json (${plat === "win32" ? "4/4" : "2/2"})...`);

                            await setProperty("firstInstallDone", false);

                            console.log(kleur.red("\nSuccessfully deleted the process.\n"));

                            await pause("Press any key to exit...");

                            exit(0);
                        });
                    }
                    else
                    {
                        console.log(kleur.yellow("\n\nCanceled deletion.\n"));

                        await pause("Press any key to go back to the main menu...");

                        return afterPm2Connected("idle", undefined, [proc]);
                    }
                }
                break;
            case 3: // main menu
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

//#SECTION notification log

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
        notifsPerPage = Math.min(Math.round((process.stdout.rows - 16) / 7), 5);

    if(notifsPerPage == Infinity || isNaN(notifsPerPage) || notifsPerPage < 1)
        notifsPerPage = 1;

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


    const pipe = kleur.gray("│");

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

        notifLines.push(`#${idx + 1} ${kleur.gray(`• [${getDateTimeFrom(notif.timestamp, true)}]`)}`);

        return notifLines.join("\n");
    };

    const maxPage = Math.max(Math.ceil(notifications.length / notifsPerPage) - 1, 0);

    if(page > maxPage)
        return notificationLog(procs, maxPage, notifsPerPage);

    const printPageLine = (short) => {
        const pageTxt = `${kleur.cyan().underline(page + 1)} of ${maxPage + 1}`;
        if(short)
            console.log(`Page [${pageTxt}] ${kleur.gray("• Timestamp format: [yyyy/mm/dd - hh:mm:ss.ms]")}\n`);
        else
            console.log(`Page [${pageTxt}] - showing ${kleur.cyan().underline(`${notifsPerPage}`)} per page - ${notifications.length} notification${notifications.length == 1 ? "" : "s"} in total - sorted latest first\n`);
    };

    let printNotifs = "\n";

    const pageFact = page === 0 ? 0 : page * notifsPerPage;

    for(let i = pageFact; i < pageFact + notifsPerPage; i++)
    {
        if(i >= notifications.length)
            break;

        printNotifs += `${getFormattedNotification(notifications[i], i)}\n\n`;
    }


    await pauseFor(30); // slow down consecutive presses (user holding down key)

    console.clear();

    printTitle("Notification Log", "This is a log of the last notifications that have been sent.\nUse the keys at the bottom to navigate.");

    printPageLine();

    console.log(printNotifs);

    printPageLine(true);


    const bull = kleur.gray("•");

    const key = await pause(`${kleur.cyan("[← →]")} Navigate Pages ${bull} ${kleur.cyan("[+ -]")} Adjust Page Size ${bull} ${kleur.cyan("[c]")} Clear ${bull} ${kleur.cyan("[x]")} Exit`);

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
            console.log(kleur.yellow("\nSuccessfully deleted all notifications."));

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

//#MARKER call init

init();
