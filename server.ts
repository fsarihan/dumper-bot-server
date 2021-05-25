import 'reflect-metadata'
import {Bot} from "./lib/bot";
import {Accounts} from "./lib/accounts";
import {Database} from "./lib/database";
import * as Express from 'express';
import {setConfig} from 'class-logger'

const database = new Database();
const app = Express();
let http = require("http").Server(app);
let io = require("socket.io")(http, {
    cors: {
        methods: ["GET", "POST"]
    }
});
let notifier = (type: number, message: string) => {
    if (type) {
        let typeList = {
            1: "success",
            2: "error",
            3: "warning",
            4: "info"
        }
        io.emit('notification', {type: typeList[type], msg: message});
    }
    // logger(message);
}
const logger = (...args) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const mSeconds = date.getMilliseconds();
    const timestamp = (day + "/" + month + "/" + year + " - " + hours + "." + minutes + ":" + seconds + ":" + mSeconds + "!.!.");
    const log = `${timestamp}: ${args}`;
    database.insertLog(log);
    io.emit("logs", log);

}
setConfig({
    log: logger,
    logError: logger,
})
let bots = new Bot(notifier);
let accounts = new Accounts();
let accountList = accounts.get();
http.listen(7575, () => {
});
let botList = {};
let createBot = (data) => {
    let apiKey = "";
    let apiSecret = "";
    let accountName = "";
    accountList = accounts.get();
    for (let i in accountList) {
        let acc = accountList[i];
        if (acc['status'] == 1 && acc['id'] == data.accountID) {
            apiKey = acc['apiKey'];
            apiSecret = acc['apiSecret'];
            accountName = acc['name'];
        }
    }
    if (apiKey !== "") {
        let values = {
            apiKey: apiKey,
            apiSecret: apiSecret,
            accountID: data.accountID,
            accountName: accountName,
            symbol: data.symbol,
            type: parseInt(data.type)
        }
        bots.create(values);
    }
};
setInterval(() => {
    if (botList !== bots.getBotList()) {
        botList = bots.getBotList();
        io.emit('botList', botList);
    }
}, 100);
io.on("connection", function (socket: any) {
    socket.on('botList', () => {
        io.emit('botList', botList);
    });
    socket.on('createBot', (data) => {
        createBot(data);
    });
    socket.on('stopBot', (data) => {
        let botID = data.botID;
        bots.stop(botID);
    });
    socket.on('reRunBot', (data) => {
        let botID = data.botID;
        let botData = botList[botID];
        if (botData.alive == false) {
            createBot(botData);
        }
    });

    socket.on('addAccount', (data) => {
        accounts.add(data).then(() => {
            notifier(1, "Account created!")
            io.emit('addAccountRedirect', "ping");
            accountList = accounts.get();
        });
    });
    socket.on('deleteAccount', (data) => {
        let accountID = data.id;
        accounts.delete(accountID).then(() => {
            notifier(1, "Account deleted!")
            io.emit('accountList', accounts.get());
            accountList = accounts.get();
        });
    });
    socket.on('getAccounts', () => {
        io.emit('accountList', accounts.get());
    });

});

console.log("INFO:", "Started! v0.001", Date.now())



