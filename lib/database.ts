import * as mysql from 'mysql';

require('dotenv').config();
import {LogClass, Log} from 'class-logger'

@LogClass()
export class Database {
    public connection: any;

    public constructor() {
        this.connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
        this.connection.on('error', function (err) {
            this.connection.connect();
        });
    }

    public dateTime() {
        return new Date();
    }

    public insertLog(log: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO logs SET ?', {
                log: log,
                created_at: this.dateTime()
            }, function (error, results) {
                if (!error) {
                    resolve(results['insertId']);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public updateOrder(binanceOrderID, status, executedAmount) {
        return new Promise((resolve, reject) => {
            this.connection.query('UPDATE orders SET status = "' + status + '", executed_amount = "' + executedAmount + '" WHERE binance_order_id = "' + binanceOrderID + '"', function (error, results) {
                if (!error) {
                    resolve(results.changedRows);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public addOrder(botID: number, orderID: number, symbol: string, type: string, price: number, amount: number, executedAmount: number, status: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO orders SET ?', {
                bot_id: botID,
                binance_order_id: orderID,
                symbol: symbol,
                type: type,
                price: price,
                amount: amount,
                executed_amount: executedAmount,
                status: status,
                created_at: this.dateTime()
            }, function (error, results) {
                if (!error) {
                    resolve(results['insertId']);
                } else {
                    reject(error);
                }
            });
        });
    }

    // @Log()
    // public getOrders() {
    //     return new Promise((resolve, reject): any => {
    //         this.connection.query('SELECT *, order_statuses.name as status_name FROM orders LEFT JOIN order_statuses ON orders.status = order_statuses.id ORDER BY orders.id ASC;', function (error, results) {
    //             if (!error) {
    //                 resolve(results);
    //             } else {
    //                 reject(error);
    //             }
    //         });
    //     });
    // }

    @Log()
    public addAccount(name: string, apiKey: string, apiSecret: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO accounts SET ?', {
                name: name,
                apiKey: apiKey,
                apiSecret: apiSecret,
                status: 1,
                created_at: this.dateTime()
            }, function (error, results) {
                if (!error) {
                    resolve(results['insertId']);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public getAccounts() {
        return new Promise((resolve, reject): any => {
            this.connection.query('SELECT * FROM accounts WHERE status != 0;', function (error, results) {
                if (!error) {
                    resolve(results);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public deleteAccount(accountID: number) {
        return new Promise((resolve, reject) => {
            this.connection.query('UPDATE accounts SET status = 0 WHERE id = ' + accountID, function (error, results) {
                if (!error) {
                    resolve(results.changedRows);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public getBots(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query('SELECT bots.id, bots.symbol, bots.account_id, bots.type, bots.created_at, accounts.name as accountName FROM bots LEFT JOIN accounts on bots.account_id = accounts.id;', function (error, results) {
                if (!error) {
                    resolve(results);
                } else {
                    reject(error);
                }
            });
        });
    }

    @Log()
    public createBot(symbol: string, account_id: number, type: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO bots SET ?', {
                symbol: symbol,
                account_id: account_id,
                type: type,
                created_at: this.dateTime()
            }, function (error, results) {
                if (!error) {
                    resolve(results['insertId']);
                } else {
                    reject(error);
                }
            });
        });
    }

}