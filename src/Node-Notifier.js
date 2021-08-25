const pm2 = require("pm2");


function init()
{
    pm2.connect((err) => {
        if(err)
            return console.error(`Error while connecting to pm2: ${err}`);

        pm2.start({
            name: "Node-Notifier-Test",
            script: "./src/main.js"
        }, (err, processes) => {
            if(err)
                return console.error(`Error while starting process: ${err}`);

            const proc = processes[0];

            console.log(`Created pm2 process '${proc.name}' with ID ${proc.pm_id}`);
            console.log("To automatically start Node-Notifier after reboot please use the command 'pm2 save'");
        });
    });
}

init();
