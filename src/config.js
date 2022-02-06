const YAML = require("yaml");
const { readFileSync } = require("fs-extra");
const { resolve } = require("path");
const { default: watch } = require("node-watch");
const { reserialize } = require("svcorelib");


/** @typedef {import("./types").ConfigFile} ConfigFile */


const cfgYamlPath = resolve("./config.yml");

let daemonInitialized = false;

module.exports.cfg = readConfig();


/**
 * Reads the config.yml file and parses it into an object, then updates the export `cfg` with it and also returns it
 * @returns {ConfigFile}
 */
function readConfig()
{
    const cfgCont = readFileSync(cfgYamlPath);

    /** @type {ConfigFile} */
    const parsed = YAML.parse(cfgCont.toString());
    
    if(!daemonInitialized)
        initDaemon();

    return reserialize(parsed);
}

/**
 * Initializes the node-watch daemon on the config.yml file to automatically reload it whenever it is edited
 */
function initDaemon()
{
    if(daemonInitialized)
        return;

    const watcher = watch(cfgYamlPath, { delay: 500 });

    watcher.on("change", readConfig);

    daemonInitialized = true;
}
