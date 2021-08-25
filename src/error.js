/**
 * Logs an error to the console
 * @param {string} message Error message
 * @param {Error|string} err Error instance or string
 * @param {boolean} [fatal=false] Set to `true` to kill the process after sending the error message
 */
function error(message, err, fatal = false)
{
    if(typeof message !== "string")
        throw new TypeError(`Message has to be of type string but got ${typeof message} instead`);

    if(typeof err !== "string" || !(err instanceof Error))
        throw new TypeError(`Err has to be an instance of the Error class or a string but got ${typeof err} instead`);

    if(fatal !== true)
        fatal = false;


    process.stdout.write("\n\n");
    if(typeof err === "string")
        process.stdout.write(`${message}: ${err}`);
    else if(err instanceof Error)
    {
        process.stdout.write(`${message}: ${err.message}\n`);
        process.stdout.write(err.stack);
    }
    process.stdout.write("\n");


    fatal && process.exit(1);

    return;
}

module.exports = error;
