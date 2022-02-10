// dev tool to generate an encoded config template for ./src/config.js - getCfgTemplate()

const { readFile } = require("fs-extra");
const { resolve } = require("path");
const { brotliCompress } = require("zlib");
const kleur = require("kleur");

const { printTitle, pauseForMicroS } = require("../cli");

const { exit } = process;


const cfgPath = resolve("./config.yml");

async function run()
{
    try
    {
        printTitle("Config Encoding", [
            `This script encodes the config file at ${kleur.yellow("./config.yml")} with Brotli and base64.`,
            "This is so that the default config template can be packed together with the script.",
            "",
            `Copy the variable below and replace it in ${kleur.yellow("./src/config.js")} in the function ${kleur.green("getCfgTemplate")}():`
        ]);

        const fileBuf = await readFile(cfgPath);
        const compressed = await compress(fileBuf);

        const result = compressed.toString("base64");

        // console.log(kleur.green("Encoded config:\n"));

        const chars = result.split("");
        let i = 0;

        console.log(`${kleur.cyan("const")} ${kleur.blue("template")} ${kleur.red("=")} ${kleur.yellow("`")}${kleur.cyan("\\")}`);

        process.stdout.write("    ");

        for await(const ch of chars)
        {
            i++;

            process.stdout.write(ch);
            i % Math.floor(process.stdout.columns / 1.5) === 0 && process.stdout.write("\n    ");

            i % Math.floor(process.stdout.columns / 20) === 0 && await pauseForMicroS(1500);
        }

        console.log(`${kleur.cyan("\\")}\n${kleur.yellow("`")};`);

        process.stdout.write("\n");

        console.log(`Length: ${result.length} ch\n`);

        return exit(0);
    }
    catch(err)
    {
        console.error(`${kleur.red("Error:")}\n${err instanceof Error ? err.stack : err.toString()}`);

        return exit(1);
    }
}

/**
 * Compresses the Buffer `buf` with brotli and returns the new Buffer
 * @param {Buffer} buf
 * @returns {Promise<Buffer>}
 */
function compress(buf)
{
    return new Promise((res, rej) => {
        brotliCompress(buf, (err, result) => {
            if(err)
                return rej(err);
            return res(result);
        });
    });
}

run();
