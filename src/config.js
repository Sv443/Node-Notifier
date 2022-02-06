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
    // Update with:
    // const fs = require("fs-extra"), zlib = require("zlib");
    // fs.writeFileSync("./config_enc.txt", zlib.brotliCompressSync(fs.readFileSync("./config.yml")).toString("base64"));

    const rawCfg = Buffer.from("G4UIAIyUbq5Qkg9z+3aW6Z38SCvYrmtqbS5QQH/0W1lYXiuXSg2oEQun2rs9ubTKHNTwS2kSy7PMMzMQwAJBnIjTvZ4MKvalNBsId3OMDUGPsH+v7/S84qUyCV0k2fZA2cOlD379bVpa5dafT+aP/h7MpL4gy5TyFuFWNmWRhMZmkXZfMjqy2VwuMRJj96crQLHHoIq0KKKwmmpsuzxNs0U3XkH4/2y7RtkpF6dScm5i+9bA8/X9c9lGbMcSpR71BMptozPamJ87gzH0B+PsTlxTJBojLEMZgDxUTENwm2qkooLHL/Gucz45AzNVrgC0Tnuox27oMLKoJeK1cn1wttHzdpbta4vKa4yyiEv+fm4SBHByL/xnjCBJqzPT/GrLOo+ePw8fLuWq/1eBnl6OHzAxj14+GNt5+HSNs1n/JLZ9l8Baj/1hR3Gi01MuKiuLa63SURUjuLGiHXrnz05A8G9312F/eaS4rLDxiGmKy9tqhE+shGqVd/vZV3j0IhEegPcYOjSt8kGs4JdAGQRM6NXHfVmhVaIRp4geBFW6jvrIWju9fKhBZGZFXVSZiAVA15rB+N/G/N+jiJAf3as/tOptF0wy957jxuq9Tf/+mj+I3KyGHqbD40z0Kp/Pxv/MDRYEofVwsHatczHdQF9rbrK4jEILbSgWPEvK/NDD8ECEptjD+vJBC22UHePjwQQ4o4AZLGSx1fUQp2gvzky4kOdaGaIwL6OCJ9AglIG1fBjQI0riu1aUrf1PD+YE4F3XThwrf2J4IwBgOG5k2qZtOsbqj98Z+7VZfUmYMXfX/oh0oY64wG26yE4bfeE9oyt2glJ4grrWr083sCx2W8d3qs94lFrsVWNbBuYUQkKZxF7zUH/uFqEgJ6bmOvdz3iPwE9W6Kns7rMricAKQpR7lEfD4NfRtGzMHxfbzoAplcwY+CXSHGRU4s6p2X+KyLRy7n2eM3EdRXMoP0PmQu4Su4IIQozJoV7BWbpnGVlD231g/a8w13zDmeXKss5AZOJUFgdmAPVOt2L0LAYS++JojFGAoDPjpSx3MLU+4HheZF+lZBc9mg9WNur9yi/0XH91ZCQOxGM0J", "base64");

    const decodedConfig = brotliDecompressSync(rawCfg).toString();

    return decodedConfig;
}

module.exports.cfg = readConfig();
