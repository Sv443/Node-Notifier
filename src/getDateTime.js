/**
 * Returns the current date and time in the format `yyyy/mm/dd - hh:mm:ss`
 * @param {boolean} [milliseconds=false] Whether to add milliseconds at the end (in format `yyyy/mm/dd - hh:mm:ss.ms`)
 * @returns {string}
 */
function getDateTime(milliseconds)
{
    if(milliseconds !== true)
        milliseconds = false;

    const d = new Date();

    let dtString = `${pad(d.getFullYear())}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    if(milliseconds)
        dtString += `.${padL(d.getMilliseconds())}`;

    return dtString;
}

/**
 * Adds leading 0 to numbers that are smaller than 10
 * @example pad(1); // returns "01"
 * @example pad(11); // returns "11"
 * @param {number} n
 * @returns {string}
 */
function pad(n)
{
    return n < 10 ? `0${n}` : n.toString();
}

/**
 * Adds leading 00 to numbers that are smaller than 100 and adds leading 0 to numbers < 10.  
 * @example pad(1);   // returns "001"
 * @example pad(11);  // returns "011"
 * @example pad(111); // returns "111"
 * @param {number} n
 * @returns {string}
 */
function padL(n)
{
    if(n < 10)
        return `00${n}`;

    return n < 100 ? `0${n}` : n.toString();
}

module.exports = getDateTime;
module.exports.getDateTime = getDateTime;
module.exports.pad = pad;
module.exports.padL = padL;
