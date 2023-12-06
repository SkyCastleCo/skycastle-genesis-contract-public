const { ethers } = require("hardhat");
const fs = require("fs");
const { generateKeyPair } = require('../services/KeyService');
const { SEPOLIA_ALCHEMY_API_KEY, MAINNET_ALCHEMY_API_KEY } = require("../config");

async function main() {

    console.log("Starting deployment script.");

    // uncomment if mainnet is required.
    // const provider = new ethers.AlchemyProvider("homestead", MAINNET_ALCHEMY_API_KEY);
    const provider = new ethers.AlchemyProvider("sepolia", SEPOLIA_ALCHEMY_API_KEY);
    console.log(SEPOLIA_ALCHEMY_API_KEY);

    let deployerWallet = null;
    try {
        deployerWallet = JSON.parse(fs.readFileSync('wallet-info.json', 'utf-8'));
    } catch (error) {
        throw new Error("Deployer Wallet not found. Please run `node create-wallet.js`")
    }

    const { address, privateKey } = deployerWallet;

    const walletSigner = new ethers.Wallet(privateKey, provider);

    let lowerAdmin = null;
    let mainAdminWallet = null;

    try {
        mainAdminWallet = JSON.parse(fs.readFileSync('wallet-info-mainAdmin.json', 'utf-8'));
        lowerAdmin = JSON.parse(fs.readFileSync('wallet-info-lowerAdmin.json', 'utf-8'));
    } catch (error) {
        console.log("No Lower Admin / Main Admin json wallet files found. Will Create them.");
    }

    if (!mainAdminWallet) {
        mainAdminWallet = createDevWallet('mainAdmin');
    }
    if (!lowerAdmin) {
        lowerAdmin = createDevWallet('lowerAdmin');
    }

    let lowerAdminPublicAddress = lowerAdmin.address;
    let adminPublicAddress = mainAdminWallet.address;

    let contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/genesis/metadata/";

    const MAX_SUPPLY = 12000;
    const TREASURY_RESERVE = 1200;

    let couponKeyPair = null;

    try {
        couponKeyPair = JSON.parse(fs.readFileSync('coupon-keypair.json', 'utf-8'));
    } catch (error) {
        console.log("Keypair NotFound. Will Create them.");
    }

    if (couponKeyPair == null) {
        couponKeyPair = generateCouponKeyPair();
    }

    const couponPublicKey = couponKeyPair.public;

    const genesisNFTContract = await ethers.getContractFactory("SCAIGenesis");

    console.log('Deploying to Blockchain now..');

    const genesisNftContractDeployment = await genesisNFTContract.connect(walletSigner).deploy(
        contractUri,
        MAX_SUPPLY,
        TREASURY_RESERVE,
        couponPublicKey,
        adminPublicAddress,
        lowerAdminPublicAddress, //ops account
    );

    const results = await genesisNftContractDeployment.waitForDeployment();

    console.log("NFT contract deployed at address:", await results.getAddress());
}

function createDevWallet(type) {
    const deployerWallet = ethers.Wallet.createRandom(); // Generate a random wallet
    const { address, privateKey } = deployerWallet;
    const walletData = {
        privateKey: privateKey,
        address: address,
    };
    const fileName = `wallet-info-${type}.json`;
    // Save the wallet data to a JSON file
    fs.writeFileSync(fileName, JSON.stringify(walletData, null, 2));

    return walletData;
}

function generateCouponKeyPair() {
    const keypair = generateKeyPair();
    const fileName = `coupon-keypair.json`;
    // Save the wallet data to a JSON file
    fs.writeFileSync(fileName, JSON.stringify(keypair, null, 2));
    return keypair;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
