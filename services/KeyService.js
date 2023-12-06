// Simple script to generate a pair of public/private keys
// Ref: https://betterprogramming.pub/handling-nft-presale-allow-lists-off-chain-47a3eb466e44

const { privateToAddress } = require("ethereumjs-utils");
const { ethers } = require("ethers");
const crypto = require("crypto");

const generateKeyPair = () => {
    const pvtKey = crypto.randomBytes(32);
    const pvtKeyString = pvtKey.toString("hex");
    const pubKeyString = ethers.getAddress(privateToAddress(pvtKey).toString("hex"));

    return {
        public: pubKeyString,
        private: pvtKeyString
    };
};

const validateKeyPair = (public, private) => {
    const privateKeyBuffer = Buffer.from(private, "hex");
    const pubKeyString = ethers.getAddress(privateToAddress(privateKeyBuffer).toString("hex"));

    return (ethers.getAddress(public) === ethers.getAddress(pubKeyString));
};

module.exports = {
    generateKeyPair,
    validateKeyPair,
};
