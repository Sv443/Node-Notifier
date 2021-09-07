const pm2 = require("pm2");
const { colors } = require("svcorelib");
const { resolve } = require("path");

const packageJSON = require("../package.json");
const cfg = require("../config");
const settings = require("./settings");

const col = colors.fg;


function init()
{
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
        }, (err, processes) => {
            if(err)
                return console.error(`Error while starting process: ${err}`);

            const fProc = processes[0];
            const proc = fProc.pm2_env || fProc;

            console.clear();

            console.log(`\nStarted up Node-Notifier v${packageJSON.version} successfully`);

            console.log(`The HTTP server is listening on port ${col.green}${cfg.server.port}${col.rst}`);
            console.log(`To access the landing page, please visit ${col.blue}http://localhost:${cfg.server.port}/${col.rst}\n`);

            console.log(`Created pm2 process ${col.green}${proc.name}${col.rst} with ID ${col.green}${proc.pm_id}${col.rst}`);
            console.log("    - To list all processes use the command 'pm2 list'");
            console.log("    - To automatically start Node-Notifier after reboot, install pm2 and use 'pm2 startup' or 'pm2 save'");
            console.log("    - To monitor Node-Notifier use 'pm2 monit'");
            console.log(`    - To view Node-Notifier's log use 'pm2 logs ${proc.pm_id}'\n`);

            console.log("This process will automatically exit after 30 seconds (or you can just press CTRL+C)");

            setTimeout(() => process.exit(0), 30000);
        });
    });
}

init();
