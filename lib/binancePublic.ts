import * as Binance from 'node-binance-api';

import {EventEmitter} from 'events';
import axios from "axios";

export class BinancePublicLib extends EventEmitter {
    public binance: any;
    public sender: any = (data) => {
        this.emit("orderBook", data)
    }

    constructor() {
        super();
        this.binance = new Binance();
    }

    public addTicker(symbol): void {
        this.binance.websockets.bookTickers(symbol, this.sender);
    }

    public exchangeInfo(symbol) {
        return new Promise((resolve, reject) => {
            axios.get('https://api.binance.com/api/v3/exchangeInfo?symbol=' + symbol)
                .then(response => {
                    resolve(response.data);
                });
        });
    }

    public roundPrice(price, tickSize) {
        return this.binance.roundTicks(price, tickSize);
    }

    public roundAmount(qty, stepSize) {
        return this.binance.roundStep(qty, stepSize);
    }
}