const pm2 = require("pm2");
const { colors, pause } = require("svcorelib");
const { resolve } = require("path");
const open = require("open");

const packageJSON = require("../package.json");
const cfg = require("../config");
const settings = require("./settings");

const col = colors.fg;


function init()
{
    // TODO:
    // - ask to create password here, then write it to .env file
    // - regenerate .env file if it doesn't exist or is invalid

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
        }, async (err, processes) => {
            if(err)
                return console.error(`Error while starting process: ${err}`);

            const fProc = processes[0];
            const proc = fProc.pm2_env || fProc;

            console.clear();

            console.log(`\n${col.green}Started up Node-Notifier v${packageJSON.version} successfully${col.rst}`);
            console.log(`The HTTP server is listening on port ${col.blue}${cfg.server.port}${col.rst}\n`);

            console.log(`Created pm2 process ${col.blue}${proc.name}${col.rst} with ID ${col.blue}${proc.pm_id}${col.rst}`);
            console.log("    - To list all processes use the command 'pm2 list'");
            console.log("    - To automatically start Node-Notifier after system reboot use 'pm2 startup' or 'pm2 save'");
            console.log("    - To monitor Node-Notifier use 'pm2 monit'");
            console.log(`    - To view Node-Notifier's log use 'pm2 logs ${proc.pm_id}'\n\n`);

            const char = await pause(`> Press ${col.green}[D]${col.rst} to open the dashboard or something else to quit:`);

            if(char.toLowerCase() === "d")
                await open(`http://127.0.0.1:${cfg.server.port}/`);

            process.stdout.write("\n");

            process.exit(0);
        });
    });
}

init();
