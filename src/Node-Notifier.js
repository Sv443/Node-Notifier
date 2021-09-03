const pm2 = require("pm2");
const { colors } = require("svcorelib");

const cfg = require("../config");
const getDateTime = require("./getDateTime");

const col = colors.fg;


function init()
{
    pm2.connect((err) => {
        if(err)
            return console.error(`Error while connecting to pm2: ${err}`);

        pm2.start({
            name: "Node-Notifier",
            script: "./src/main.js"
        }, (err, processes) => {
            if(err)
                return console.error(`Error while starting process: ${err}`);

            const fProc = processes[0];
            const proc = fProc.pm2_env || fProc;

            console.clear();

            // TODO: maybe improve this
            console.log(`${getDateTime()}`);
            console.log(`\nHTTP server is listening on port ${cfg.server.port}`);
            console.log(`To access the landing page, please visit ${col.green}http://localhost:${cfg.server.port}${col.rst}\n`);

            console.log(`Created pm2 process '${proc.name}' with ID ${proc.pm_id}`);
            console.log("To automatically start Node-Notifier after reboot, install pm2 and use the command 'pm2 startup' or 'pm2 save'");
            console.log("To monitor Node-Notifier use the commands 'pm2 ls' and 'pm2 monit'");
            console.log(`To view Node-Notifier's log, use 'pm2 logs ${proc.pm_id}'\n`);

            console.log("This process will automatically exit after 30 seconds or you can just press CTRL+C");

            setTimeout(() => process.exit(0), 30000);
        });
    });
}

init();
