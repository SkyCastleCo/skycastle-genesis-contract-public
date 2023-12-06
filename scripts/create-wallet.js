const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
    const deployerWallet = ethers.Wallet.createRandom(); // Generate a random wallet
    const { address, privateKey } = deployerWallet;

    const walletData = {
        privateKey: privateKey,
        address: address,
    };

    const fileName = 'wallet-info.json';

    // Save the wallet data to a JSON file
    fs.writeFileSync(fileName, JSON.stringify(walletData, null, 2));

    console.log(`Please add Eth for Deployment.`, address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
