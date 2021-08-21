const { unused } = require("svcorelib");
const express = require("express");

unused(express);


function init()
{
    return new Promise(async (res, rej) => {
        unused(rej);

        return res();
    });
}

module.exports = { init };
