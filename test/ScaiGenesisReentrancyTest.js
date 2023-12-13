const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CouponStatus } = require('../enum');
const CouponService = require('../services/CouponService');
const { generateKeyPair } = require('../services/KeyService');
const MAX_SUPPLY = 200;
const TREASURY_RESERVATION = 50;

const MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE = "Max public mints per wallet reached";
const COUPON_ALLOCATION_EXCEEDED = 'Allocation Exceeded';

describe("ScaiGenesisReentrancyTest", function () {
    async function deployGenesisContractFixture() {
        const [owner, hacker, adminAccount, opsAccount, otherAccount, financeAccount, lowerAdminAccount, airdropAccount] = await ethers.getSigners();
        const keypair = generateKeyPair();
        const CouponServiceInstance = new CouponService(keypair.public, keypair.private);
        const genesisContract = await ethers.getContractFactory("SCAIGenesis");
        const genesisAttackPresalePurchaseBatchContract = await ethers.getContractFactory("MaliciousPresalePurchaseBatchContract");
        const genesisAttackPresalePurchaseContract = await ethers.getContractFactory("MaliciousPresalePurchaseContract");
        const genesisAttackPublicPurchaseBatchContract = await ethers.getContractFactory("MaliciousPublicPurchaseBatchContract");
        const genesisAttackPublicPurchaseContract = await ethers.getContractFactory("MaliciousPublicPurchaseContract");

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

        const genesisAttackPresalePurchaseAttack = await genesisAttackPresalePurchaseContract.connect(hacker).deploy(
            genesisContractDeployed.target
        );

        const genesisAttackPresalePurchaseBatchAttack = await genesisAttackPresalePurchaseBatchContract.connect(hacker).deploy(
            genesisContractDeployed.target
        );

        const genesisAttackPublicPurchaseBatchAttack = await genesisAttackPublicPurchaseBatchContract.connect(hacker).deploy(
            genesisContractDeployed.target
        );

        const genesisAttackPublicPurchaseAttack = await genesisAttackPublicPurchaseContract.connect(hacker).deploy(
            genesisContractDeployed.target
        );

        return {
            genesisContractDeployed,
            genesisAttackPresalePurchaseAttack,
            genesisAttackPresalePurchaseBatchAttack,
            genesisAttackPublicPurchaseBatchAttack,
            genesisAttackPublicPurchaseAttack,
            couponSigner,
            owner,
            adminAccount,
            opsAccount,
            otherAccount,
            hacker,
            lowerAdminAccount,
            financeAccount,
            contractUri,
            keypair,
            CouponServiceInstance,
            airdropAccount
        };
    }
    describe("During Minting: ", function () {
        describe("presalePurchase", function () {
            it("should block malicious contract from being able to buy more than coupon limit tokens", async () => {
                    const {
                        genesisContractDeployed,
                        genesisAttackPresalePurchaseAttack,
                        hacker,
                        lowerAdminAccount,
                        CouponServiceInstance
                    } = await loadFixture(deployGenesisContractFixture);

                    const couponLimit = 1;

                    const coupon = CouponServiceInstance.generateCoupon(genesisAttackPresalePurchaseAttack.target, 1, couponLimit);
                    await
                        genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(
                            true
                        );
                    await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
                    await hacker.sendTransaction(
                        { to: genesisAttackPresalePurchaseAttack.target, value: ethers.parseEther("100") }
                    );

                    await expect(genesisAttackPresalePurchaseAttack.connect(hacker).buyNFT(
                        coupon.r,
                        coupon.s,
                        coupon.v,
                        {
                            gasLimit: 3000000
                        }
                    )).to.be.revertedWith(COUPON_ALLOCATION_EXCEEDED);

                    const hackerContractBalance = await genesisContractDeployed.balanceOf(
                        genesisAttackPresalePurchaseAttack.target
                    )
                    console.log("GenesisScai balance of Hacker Contract:", hackerContractBalance);
                });
        });

        describe("presalePurchaseBatch", function () {
            it("should block malicious contract from being able to buy more than coupon limit tokens", async () => {
                const {
                        genesisContractDeployed,
                        genesisAttackPresalePurchaseBatchAttack,
                        hacker,
                        lowerAdminAccount,
                        CouponServiceInstance
                    } = await loadFixture(deployGenesisContractFixture);

                    const couponLimit = 5;

                    const coupon = CouponServiceInstance.generateCoupon(genesisAttackPresalePurchaseBatchAttack.target, 1, couponLimit);
                    await
                        genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    await
                        genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
                    await hacker.sendTransaction({
                        to: genesisAttackPresalePurchaseBatchAttack.target,
                        value: ethers.parseEther("100")
                    });

                    await expect(genesisAttackPresalePurchaseBatchAttack.connect(hacker).buyNFT(
                        coupon.r,
                        coupon.s,
                        coupon.v,
                        {
                            gasLimit: 10000000
                        }
                    )).to.be.revertedWith(COUPON_ALLOCATION_EXCEEDED);

                    let hackerContractBalance = await genesisContractDeployed.balanceOf(genesisAttackPresalePurchaseBatchAttack.target);
                    console.log("GenesisScai balance of Hacker Contract:", hackerContractBalance);
                    expect(hackerContractBalance).to.be.lessThanOrEqual(couponLimit);
                }
            );
        });

        describe("publicPurchaseBatch", function () {
            it("should block malicious contract from being able to buy more than address limit tokens", async () => {
                const {
                    genesisContractDeployed,
                    genesisAttackPublicPurchaseBatchAttack,
                    hacker,
                    lowerAdminAccount,
                } = await loadFixture(deployGenesisContractFixture);

                const maxMintPerWallet = await genesisContractDeployed.allowedPublicMintTokenCount();

                await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(ethers.parseEther("0.0025"));
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                await hacker.sendTransaction({
                    to: genesisAttackPublicPurchaseBatchAttack.target,
                    value: ethers.parseEther("100")
                });

                await expect(genesisAttackPublicPurchaseBatchAttack.connect(hacker).buyNFT(
                    {
                        value: ethers.parseEther("0.0025"),
                        gasLimit: 10000000
                    }
                )).to.be.revertedWith(MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE);

                let hackerContractBalance = await genesisContractDeployed.balanceOf(genesisAttackPublicPurchaseBatchAttack.target)

                expect(hackerContractBalance).to.be.lessThanOrEqual(maxMintPerWallet);

                console.log("GenesisScai balance of Hacker Contract:", hackerContractBalance);
            });
        })

        describe("publicPurchase", function () {
            it("should block malicious contract from being able to buy more than address limit tokens", async () => {
                const {
                    genesisContractDeployed,
                    genesisAttackPublicPurchaseAttack,
                    hacker,
                    lowerAdminAccount,
                } = await loadFixture(deployGenesisContractFixture);

                const maxMintPerWallet = await genesisContractDeployed.allowedPublicMintTokenCount();
                await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(ethers.parseEther("0.0025"));
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                await hacker.sendTransaction({
                    to: genesisAttackPublicPurchaseAttack.target,
                    value: ethers.parseEther("100")
                });
                await expect(genesisAttackPublicPurchaseAttack.connect(hacker).buyNFT(
                    {
                        value: ethers.parseEther("0.0025"),
                        gasLimit: 10000000
                    }
                )).to.be.revertedWith(MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE);

                let hackerContractBalance = await genesisContractDeployed.balanceOf(genesisAttackPublicPurchaseAttack.target)

                console.log("GenesisScai balance of Hacker Contract:", hackerContractBalance);

                expect(hackerContractBalance).to.be.lessThanOrEqual(maxMintPerWallet);

            });
        })
    });
});