const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CouponType } = require('../enum');
const CouponService = require('../services/CouponService');
const { generateKeyPair } = require('../services/KeyService');

const MAX_SUPPLY = 3000;
const TREASURY_RESERVATION = 1200;
const BATCH_MINT_SIZE = 7;
const MINT_PRICE = 0.025;

describe("SCAIGenesisGasTests", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployGenesisContractFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, adminAccount, lowerAdminAccount, otherAccount] = await ethers.getSigners();
        const keypair = generateKeyPair();
        const CouponServiceInstance = new CouponService(keypair.public, keypair.private);
        const genesisContract = await ethers.getContractFactory("SCAIGenesis");
        const contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/metadata/genesis/";
        const couponSigner = keypair.public;

        const genesisContractDeployed = await genesisContract.connect(owner).deploy(
            contractUri,
            MAX_SUPPLY,
            TREASURY_RESERVATION,
            couponSigner,
            adminAccount.address,
            lowerAdminAccount.address
        );

        return {
            genesisContractDeployed,
            couponSigner,
            owner,
            adminAccount,
            lowerAdminAccount,
            otherAccount,
            contractUri,
            keypair,
            CouponServiceInstance,
        };
    }

    describe("Public Purchases Batches", function () {
        it(`Mint ${BATCH_MINT_SIZE * 100} Tokens via Public Purchases to get an Estimate of Gas`, async function() {
            const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            await genesisContractDeployed.connect(lowerAdminAccount).setAllowedPublicMintTokenCount(1500);
            const mintPrice = (MINT_PRICE * BATCH_MINT_SIZE).toFixed(5);

            for (let c = 0; c < 100; c++) {
                const mintTransaction = await genesisContractDeployed.connect(owner).publicPurchaseBatch(
                    BATCH_MINT_SIZE,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther(mintPrice)
                    }
                );
    
                const receipt = await mintTransaction.wait();
    
                for (let i = 0; i < BATCH_MINT_SIZE; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
    
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }
            }
        });
    })

    describe("Presale Purchases Batches", function () {
        it(`Mint ${BATCH_MINT_SIZE * 100} Tokens via Presale Purchases to get an Estimate of Gas`, async function() {
            const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1005);
            const mintPrice = (MINT_PRICE * BATCH_MINT_SIZE).toFixed(5);

            for (let c = 0; c < 100; c++) {
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1, //coupon number
                    1005,
                    BATCH_MINT_SIZE,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther(mintPrice) // correct value
                    }
                );
    
                const receipt = await mintTransaction.wait();
    
                for (let i = 0; i < BATCH_MINT_SIZE; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
    
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }
            }
        });
    })

    describe("Airdrops Batches", function () {
        it(`Mint ${BATCH_MINT_SIZE * 100} Tokens via Presale Purchases to get an Estimate of Gas`, async function() {
            const { genesisContractDeployed, lowerAdminAccount, owner } = await loadFixture(deployGenesisContractFixture);
            for (let c = 0; c < 100; c++) {
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    owner.address,
                    BATCH_MINT_SIZE,
                    {
                        gasLimit: 3000000,
                    }
                );
    
                const receipt = await mintTransaction.wait();
    
                for (let i = 0; i < BATCH_MINT_SIZE; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
    
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }
            }
        });
    })

    describe("Treasury Batches", function () {
        it(`Mint ${BATCH_MINT_SIZE * 100} Tokens via Presale Purchases to get an Estimate of Gas`, async function() {
            const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            for (let c = 0; c < 100; c++) {
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                    owner.address,
                    BATCH_MINT_SIZE,
                    {
                        gasLimit: 3000000,
                    }
                );
    
                const receipt = await mintTransaction.wait();
    
                for (let i = 0; i < BATCH_MINT_SIZE; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
    
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }
            }
        });
    })
});
