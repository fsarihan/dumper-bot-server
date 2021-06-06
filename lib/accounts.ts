import {Database} from "./database";

export class Accounts {

    public accounts;
    public database;

    constructor() {
        this.database = new Database();
        this.database.getAccounts().then((accounts) => {
            this.accounts = accounts;
        });
    }


    public add(data) {
        return new Promise((resolve, reject) => {
            this.database.addAccount(data['name'], data['apiKey'], data['apiSecret']).then((accountID) => {
                resolve(accountID);
                this.accounts.push({
                    id: accountID,
                    name: data['name'],
                    apiKey: data['apiKey'],
                    apiSecret: data['apiSecret'],
                    status: 1
                });
            });
        });
    }


    public delete(accountID) {
        return new Promise((resolve, reject) => {
            this.database.deleteAccount(accountID).then(() => {
                this.database.getAccounts().then((accounts) => {
                    this.accounts = accounts;
                    resolve(true);
                });
            });
        });
    }

    public get() {
        return this.accounts;
    }
}