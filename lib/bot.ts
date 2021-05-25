import {BinancePublicLib} from "./binancePublic";
import {BinanceLib} from "./binance";
import {Database} from "./database";
import {LogClass, Log} from 'class-logger'
import {throttle} from 'throttle-debounce';

@LogClass()
export class Bot {
    public binancePublic;
    public database;
    public bots: object;
    public orderBook: object;
    public typeList: object;
    public accounts: object;
    public counter: number;
    public notifier;
    public botList: object;

    constructor(notifier) {
        this.typeList = {
            1: "TOP",
            2: "MIDDLE",
            3: "BOTTOM"
        };
        this.notifier = notifier;
        this.binancePublic = new BinancePublicLib();
        this.database = new Database();
        this.bots = {};
        this.accounts = {};
        this.orderBook = {};
        this.botList = {};
        this.updateBotList();
        this.setOrderBook();
        this.automation();
    }

    private symbolExist(symbol) {
        if (typeof this.orderBook[symbol] !== "undefined") {
            return true;
        } else {
            return false;
        }
    }

    @Log()
    private setOrderBook(): void {
        this.binancePublic.on("orderBook", (ticker) => {
            if (this.symbolExist(ticker['symbol'])) {
                if (this.orderBook[ticker['symbol']]['updateId'] < ticker['updateId']) {
                    this.orderBook[ticker['symbol']] = ticker;
                }
            } else {
                this.orderBook[ticker['symbol']] = ticker;
            }
        });
    }

    public getBotList() {
        return this.botList;
    }

    public updateBotList() {
        let botList: object = {};
        this.database.getBots().then((dbBots) => {
            for (let index in dbBots) {
                let dbBot = dbBots[index];
                botList[dbBot['id']] = {
                    alive: false,
                    symbol: dbBot['symbol'],
                    accountID: dbBot['account_id'],
                    type: dbBot['type'],
                    orders: false,
                    accountName: dbBot['accountName'],
                }
            }
            for (let botID in this.bots) {
                let bot = this.bots[botID];
                botList[botID] = {
                    alive: bot.alive,
                    symbol: bot.symbol,
                    accountID: bot.accountID,
                    type: bot.type,
                    orders: bot.orders,
                    accountName: bot.accountName,
                }
            }
            this.botList = botList;
        });
    }

    @Log()
    public stop(botID: number) {
        if (typeof this.bots[botID] !== "undefined") {
            let bot = this.bots[botID];
            this.notifier(1, bot.symbol + " bot completed!");
            this.bots[botID].alive = false;
            delete this.bots[botID];
            this.updateBotList();
            return true;
        }
        return false;
    }

    @Log()
    public create(values) {
        if (typeof this.accounts[values["apiKey"]] === "undefined") {
            let balanceUpdate = (apiKey, data) => {
                for (let botID in this.bots) {
                    let bot = this.bots[botID];
                    if (bot.apiKey == apiKey && bot.baseAsset == data.asset) {
                        bot.baseBalance = data.available;
                    }
                }
            }
            let orderUpdate = (apiKey, data) => {
                for (let botID in this.bots) {
                    let bot = this.bots[botID];
                    let symbol = bot.symbol;
                    if (bot.apiKey == apiKey && symbol == data.s) {
                        if (data.e == "executionReport") {
                            if (typeof bot.orders[data.i] !== "undefined") {
                                bot.orders[data.i].logs.push(data);
                                bot.orders[data.i].status = data.X;
                                bot.orders[data.i].symbol = symbol;
                                bot.orders[data.i].binanceOrderID = data.i;
                                bot.orders[data.i].price = data.p;
                                bot.orders[data.i].amount = data.q;
                                bot.orders[data.i].executedAmount = data.z;
                            }
                            if (data.X == "NEW") {
                                this.database.addOrder(bot.botID, data.i, symbol, "SELL", data.p, data.q, data.z, data.X)
                                this.notifier(1, "New Order for bot: " + bot.botID + " Price: " + data.p + " Amount: " + data.q);
                            } else {
                                this.database.updateOrder(data.i, data.X, data.z);
                            }
                            if (data.X == "FILLED") {
                                this.stop(bot.botID);
                            }
                            this.updateBotList();
                        }
                    }
                }
            }
            this.accounts[values["apiKey"]] = new BinanceLib(values["apiKey"], values["apiSecret"], balanceUpdate, orderUpdate);
        }
        let binanceLib = this.accounts[values["apiKey"]];
        if (!this.symbolExist(values["symbol"])) {
            this.binancePublic.addTicker(values["symbol"]);
        }
        // if (typeof this.bots[values["symbol"]] === "undefined") {
        //TODO: buraya bir şeyler düşün.
        let priceTickSize;
        let lotStepSize;
        let minQty;
        this.binancePublic.exchangeInfo(values["symbol"]).then(data => {
            priceTickSize = parseFloat(data.symbols[0].filters[0]["tickSize"]);
            lotStepSize = parseFloat(data.symbols[0].filters[2]["stepSize"]);
            minQty = parseFloat(data.symbols[0].filters[2]["minQty"]);
            let currentBaseBalance = binanceLib.getBalance(data.symbols[0].baseAsset);
            currentBaseBalance.then((baseBalance) => {
                if (parseFloat(baseBalance['available']) > minQty) {
                    this.database.createBot(values["symbol"], values["accountID"], values["type"]).then((botID) => {
                        this.bots[botID] = {
                            accountID: values["accountID"],
                            botID: botID,
                            apiKey: values["apiKey"],
                            type: values["type"],
                            symbol: values["symbol"],
                            accountName: values["accountName"],
                            priceTickSize: priceTickSize,
                            lotStepSize: lotStepSize,
                            binanceLib: binanceLib,
                            lastPrice: false,
                            baseAsset: data.symbols[0].baseAsset,
                            quoteAsset: data.symbols[0].quoteAsset,
                            baseBalance: baseBalance,
                            alive: true,
                            orders: {},
                        }
                        this.counter++;
                        this.notifier(1, "Bot started " + values["symbol"] + " Bot ID: " + botID);
                        this.updateBotList();
                    });
                } else {
                    this.notifier(2, data.symbols[0].baseAsset + " balance must be higher than minQty requirement.");
                    this.updateBotList();
                }
            });
        });
        // } else {
        //     this.notifier(2, "Already have alive bot for " + values["symbol"] + " symbol.");
        //     this.updateBotList();
        // }
    }

    private automation() {

        let loop = throttle(350, true, async () => {
            this.counter = 0;
            for (let botID in this.bots) {
                let bot = this.bots[botID];
                let symbol = bot.symbol;
                if (bot.alive && this.symbolExist(symbol)) {
                    let orderBook = this.orderBook[symbol];
                    let targetPrice = () => {
                        if (parseFloat(orderBook["bestAsk"]) !== parseFloat(bot['lastPrice'])) {
                            switch (bot.type) {
                                case 1:
                                    return this.binancePublic.roundPrice((parseFloat(orderBook["bestAsk"]) - bot.priceTickSize), bot.priceTickSize);
                                    //TOP Lowest Sell Price’ın en küçük hanesinden 1 birim eksiltir.
                                    break;
                                case 2:
                                    return this.binancePublic.roundPrice((parseFloat(orderBook["bestBid"]) + parseFloat(orderBook["bestAsk"])) / 2, bot.priceTickSize);
                                    //MIDDLE Lowest Sell Price ile Highest Buy Price toplanır çıkan sonuç 2’ye bölünür
                                    break;
                                case 3:
                                    return this.binancePublic.roundPrice(parseFloat(orderBook["bestBid"]) + bot.priceTickSize, bot.priceTickSize);
                                    //BOTTOM Highest Buy Price’ı 1 tık arttıracağız.
                                    break;
                            }
                        } else {
                            return parseFloat(bot['lastPrice']);
                        }

                    }
                    let targettedPrice = targetPrice().toString();
                    let createOrder = (symbol, amount, price) => {
                        return new Promise((resolve, reject) => {
                            bot.binanceLib.createOrder(symbol, amount, price).then((orderDetail) => {
                                bot['orderID'] = orderDetail.orderId
                                bot['lastPrice'] = price;
                                bot['orders'][orderDetail.orderId] = {
                                    orderID: orderDetail.orderId,
                                    status: "",
                                    logs: []
                                };
                                this.counter++;
                                resolve(true);
                            }).catch((err) => {
                                if (err.body === '{"code":-1013,"msg":"Invalid quantity."}' || err.body === '{"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}') {
                                    this.notifier(2, err.body);
                                    this.stop(bot.botID);
                                } else {
                                    console.log(err.body);
                                }
                                this.notifier(false, err.body);
                                this.stop(bot.botID);
                                // reject(err.body);
                            });
                        });

                    }
                    if (parseFloat(bot['lastPrice']) !== parseFloat(targettedPrice)) {
                        if (!bot['lastPrice']) {
                            let amount = this.binancePublic.roundAmount(parseFloat(bot.baseBalance.available), bot.lotStepSize.toString());
                            await createOrder(symbol, amount, targettedPrice);
                        } else {
                            //Daha önceden order oluşturulmuş.
                            bot.binanceLib.cancelOrder(symbol, bot['orderID']).then(async (data) => {
                                let amount = this.binancePublic.roundAmount(parseFloat(data.origQty) - parseFloat(data.executedQty), bot.lotStepSize.toString());
                                await createOrder(symbol, amount, targettedPrice);
                            }).catch((err) => {
                                this.notifier(false, err);
                                if (err.body == '{"code":-2011,"msg":"Unknown order sent."}') {
                                    //tamamlanmış.
                                    this.stop(bot.botID);
                                }
                            });
                        }
                    } else {
                        this.counter++;
                    }
                } else {
                    if (bot.alive) {
                        this.counter++;
                        let botCount = Object.keys(this.bots).length;
                        let timeout = 250 * (botCount + 1);
                        setTimeout(interval, timeout);
                    }
                }
            }
        });

        let interval = () => {
            let botCount = Object.keys(this.bots).length;
            if (this.counter > 0) {
                let timeout = 150 * (botCount + 1);
                setTimeout(loop, timeout);
                setTimeout(interval, timeout + 100);
            } else {
                let timeout = 150 * (botCount + 1);
                setTimeout(interval, timeout);
            }
        }
        setTimeout(loop, 2000);
        setTimeout(interval, 2250);
    }
}