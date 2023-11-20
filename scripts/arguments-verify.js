const { NODE_ENV, COUPON_PUBLIC_KEY } = require("../config");
const fs = require("fs");

let contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/genesis/metadata/";

const MAX_SUPPLY = 12000;
const TREASURY_RESERVE = 1200;

const lowerAdmin = JSON.parse(fs.readFileSync('wallet-info-lowerAdmin.json', 'utf-8'));
const mainAdminWallet = JSON.parse(fs.readFileSync('wallet-info-mainAdmin.json', 'utf-8'));

let lowerAdminPublicAddress = lowerAdmin.address;
let adminPublicAddress = mainAdminWallet.address;

if (!COUPON_PUBLIC_KEY) {
    throw new Error("COUPON_PUBLIC_KEY should be valid");
}
const couponPublicKey = COUPON_PUBLIC_KEY;

module.exports = [
    contractUri,
    MAX_SUPPLY,
    TREASURY_RESERVE,
    couponPublicKey,
    adminPublicAddress, //main account
    lowerAdminPublicAddress, //lower admin account
];