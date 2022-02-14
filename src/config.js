const YAML = require("yaml");
const { readFileSync, existsSync, writeFileSync } = require("fs-extra");
const { resolve } = require("path");
const { default: watch } = require("node-watch");
const { reserialize } = require("svcorelib");
const { brotliDecompressSync } = require("zlib");
const settings = require("./settings");


/** @typedef {import("./types").ConfigFile} ConfigFile */


const cfgYamlPath = resolve("./config.yml");

let daemonInitialized = false;

/**
 * Reads the config.yml file and parses it into an object, then updates the export `cfg` with it and also returns it
 * @returns {ConfigFile}
 */
function readConfig()
{
    if(!existsSync(cfgYamlPath))
        writeFileSync(cfgYamlPath, getCfgTemplate());

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

    const watcher = watch(cfgYamlPath, { delay: settings.server.daemonInterval });

    watcher.on("change", readConfig);

    daemonInitialized = true;
}

/**
 * Returns the config template YAML file
 * @returns {string}
 */
function getCfgTemplate()
{
    // Update from './config.yml' with the command 'npm run enc-conf'

    const template = `\
        G1EJAIyUbq5QkoFutmeZrlBRTLK92+Tok5fQWKXfysLy+l9LF+jColy8vffLtZLaFUFl8LtLPUccpSofLVAZTHQ5Urwp+PbnthgIunXMDcGIsH+vbmnWskY6xN4kWc9A
        qcJHc6Hx5bhKVqK8dH7U12QmdgUi03PWIxyVSxaRb3QVae9HzZ7ZrJT3KAmxp7QBbJwx6J2iroMwnCgcu/x5IRZtWQtOP9w+6rIMCKZcnnL/+Nbg56O7p6aPWMuSpLrT
        EWRunZ0RY33uGoxhPJis7iR7ijhDhG0orWBDwiQfbCcKBW/g8bd4j19UPQNd2ewANCo0ssfUrDGzKOLhGgYRMFvheTIt961F+yvMsnCn/N+ZQ+DB9h13X0KElNQ2M5ZX
        I/d69Hx9cH+RrqzPCbp8PrrHwjx8+WD05OGdFa7N+p3MiwICaxlVmNo4ztMdxhsrzb1WhSgnI7Dxnd5o8is/JtD2HhKqcmPjosXBIzoFLm+rAr7wSmSt/d1+9RUpvYiE
        JjANs0YXNU9kBf8wMwMzeHHq4a4M0cukIVLCPYSpCnW0R172nYv7FkQRVpgipwlZAOsaUVh6Y+d/z0UI/ITe1X0v76agKbMJ/SCz0cJUyKP1lqSIiPXbhdFdw3WWimcW
        ceGHfgiWRQWM+cSK2Unx99cFI+ihjIDqZoBxF80epmiOhFS7BBhcOrWbrdFSHSeOZibNXR0idOlIuYhXBLleyiHEMdBF0oQZCIwAAKisJrLBevoZskX9wLc2U0Gu16fR
        xb3KgFX5qHGHEUCDyrK1KcdEpdk1IxeRaTOeN0eSCX+vUqy9VsDV5xnrrJo+qhXTnjcjF6JBWrXYepgqyv2I4jXxDlp+kDqe4zm+tVR8Sek/w/bHM2rMe4jfA220dxs4
        zRsGxRjX70snjAOAR7myvUYvj9cQQ3ajoweocD6kFvlhZ1ufl+WQCP4FR9RB/jupqcl/75M5aLfHNJrsyFZto+1Is5xMjQDwM8dyMMJDSeR5mPqot8/3LUD8kNUEydMJ
        NUqsWbsN/NqjHkfZ+7tDyaMbX6kuhLJj4zBBLygQyLM0wIbeNtI1jWOtzL6weuWQswzUYlV0jMog2CybmsBs7ZaImbGz8wSwXfFbwSCMaWLATb8GJZJ/m6k5nvU6Pt9D
        6CHb8Nr32OuI6uIrndaWEIpqRgA=\
    `;

    const serEncTempl = template.split(/\n/gm).map(l => l.trim()).join("");

    const rawCfg = Buffer.from(serEncTempl, "base64");

    const decodedConfig = brotliDecompressSync(rawCfg).toString();

    return decodedConfig;
}

module.exports.cfg = readConfig();
