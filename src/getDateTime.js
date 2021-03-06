/**
 * Returns the current date and time in the format `yyyy/mm/dd - hh:mm:ss`
 * @param {boolean} [milliseconds=false] Whether to add milliseconds at the end (in format `yyyy/mm/dd - hh:mm:ss.ms`)
 * @returns {string}
 */
function getDateTime(milliseconds)
{
    return getDateTimeFrom(new Date(), milliseconds);
}

/**
 * Returns the datetime string of the provided `date` in the format `yyyy/mm/dd - hh:mm:ss`
 * @param {Date|number} date Timestamp number or Date instance
 * @param {boolean} [milliseconds=false] Whether to add milliseconds at the end (in format `yyyy/mm/dd - hh:mm:ss.ms`)
 */
function getDateTimeFrom(date, milliseconds)
{
    if(!(date instanceof Date) && typeof date != "number")
        throw new TypeError("Can't resolve datetime of invalid date");

    const d = new Date(date);

    let dtString = `${pad(d.getFullYear())}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    if(milliseconds)
        dtString += `.${padL(d.getMilliseconds())}`;

    return dtString;
}

/**
 * Adds leading 0 to numbers that are smaller than 10
 * @example pad(1); // returns "01"
 * @example pad(12); // returns "12"
 * @param {number} n
 * @returns {string}
 */
function pad(n)
{
    return n < 10 ? `0${n}` : n.toString();
}

/**
 * Adds leading 00 to numbers that are smaller than 100 and adds leading 0 to numbers < 10.  
 * @example padL(1);   // returns "001"
 * @example padL(12);  // returns "012"
 * @example padL(123); // returns "123"
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
module.exports.getDateTimeFrom = getDateTimeFrom;
module.exports.pad = pad;
module.exports.padL = padL;
