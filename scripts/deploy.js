const { ethers } = require("hardhat");
const fs = require("fs");
const { GetParameterCommand, SSMClient } = require("@aws-sdk/client-ssm");
const { SSM_ALCHEMY_API_KEY_NAME, NODE_ENV, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BLOCKCHAIN_NET, COUPON_PUBLIC_KEY } = require("../config");

async function main() {

    console.log("Starting deployment script.");

    const input = {
        Name: SSM_ALCHEMY_API_KEY_NAME, // required
        WithDecryption: true,
    };
    const command = new GetParameterCommand(input);

    let ssmClient;
    if (NODE_ENV === "local") {
        ssmClient = new SSMClient({
            "credentials": {
                "accessKeyId": AWS_ACCESS_KEY_ID,
                "secretAccessKey": AWS_SECRET_ACCESS_KEY,
            },
            "region": AWS_REGION
        });
    } else {
        ssmClient = new SSMClient({ region: AWS_REGION });
    }

    const response = await ssmClient.send(command);

    if (!response.Parameter.Value) {
        throw new Error("Parameter Value invalid");
    }

    const provider = new ethers.AlchemyProvider(BLOCKCHAIN_NET, response.Parameter.Value);

    const deployerWallet = JSON.parse(fs.readFileSync('wallet-info.json', 'utf-8'));
    const { address, privateKey } = deployerWallet;

    const walletSigner = new ethers.Wallet(privateKey, provider);

    let lowerAdmin = null;
    let mainAdminWallet = null;

    try {
        mainAdminWallet = JSON.parse(fs.readFileSync('wallet-info-mainAdmin.json', 'utf-8'));
        lowerAdmin = JSON.parse(fs.readFileSync('wallet-info-lowerAdmin.json', 'utf-8'));
    } catch (error) {
        console.log("No Lower Admin / Main Admin json wallet files found. Will Create them if (env = development) ");
    }

    if (NODE_ENV === 'development') {
        if (!mainAdminWallet) {
            mainAdminWallet = createDevWallet('mainAdmin');
        }
        if (!lowerAdmin) {
            lowerAdmin = createDevWallet('lowerAdmin');
        }
    }

    let lowerAdminPublicAddress = lowerAdmin.address;
    let adminPublicAddress = mainAdminWallet.address;

    let contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/genesis/metadata/";

    const MAX_SUPPLY = 12000;
    const TREASURY_RESERVE = 1200;

    if (!COUPON_PUBLIC_KEY) {
        throw new Error("COUPON_PUBLIC_KEY should be valid");
    }
    const couponPublicKey = COUPON_PUBLIC_KEY;

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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
