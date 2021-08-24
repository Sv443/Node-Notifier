const { unused } = require("svcorelib");
const express = require("express");

unused(express);


// TODO:
// listen for POST to send a notification
// listen for GET to serve a landing page / dashboard


function init()
{
    return new Promise(async (res, rej) => {
        unused(rej);

        return res();
    });
}

module.exports = { init };
