import * as Binance from 'node-binance-api';

export class BinanceLib {
    public binance: any;

    constructor(apiKey: string, apiSecret: string, balanceUpdater, orderUpdater) {

        this.binance = new Binance().options({
            "APIKEY": apiKey,
            "APISECRET": apiSecret,
            "useServerTime": true,
            "reconnect": true
        });
        let balanceUpdate = (data) => {
            // console.log("Balance Update");
            for (let obj of data.B) {
                let {a: asset, f: available, l: onOrder} = obj;
                if (available == "0.00000000") continue;
                let assetData = {
                    asset: asset,
                    available: available
                }
                balanceUpdater(apiKey, assetData)
            }
        };
        let executionUpdate = (data) => {
            orderUpdater(apiKey, data);
        }
        this.binance.websockets.userData(balanceUpdate, executionUpdate);
    }

    public checkAPI() {
        return new Promise((resolve, reject) => {
            this.binance.allOrders("BTCUSDT", (error, orders, symbol) => {
                if (error) {
                    reject("APICHECKFAIL");
                } else {
                    resolve(true);
                }
            }, {limit: 1});
        });
    }

    public getBalance(asset) {
        return new Promise((resolve, reject) => {
            this.binance.balance((error, balances) => {
                if (error) reject(error);
                resolve(balances[asset]);
            });
        });

    }

    public cancelOrder(symbol: string, orderID: number) {
        return new Promise((resolve, reject) => {
            this.binance.cancel(symbol, orderID, function (error, json) {
                if (error)
                    reject(error);
                resolve(json);
            });
        });
    }

    public createOrder(symbol, amount, price) {
        return new Promise((resolve, reject) => {
            this.binance.sell(symbol, amount.toString(), price.toString()).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err)
            });
        });
    }
}