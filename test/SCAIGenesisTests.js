const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CouponStatus } = require('../enum');
const CouponService = require('../services/CouponService');
const { generateKeyPair } = require('../services/KeyService');

// Error Messages
const INSUFFICIENT_VALUE_SENT_CUSTOM_ERROR_MESSAGE = "InsufficientValueSent";
const INVALID_COUPON_CUSTOM_ERROR_MESSAGE = "InvalidCoupon";
const WAIT_FOR_PRIVATE_PURCHASE_TO_OPEN = "PrivatePurchaseNotOpen";
const MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE = "MaxMintReachedForPublicWallet";
const ALLOCATION_EXCEED_ERROR_MESSAGE = "AllocationExceeded";
const EXCEEDED_BATCH_MINT_SIZE_AT_ONE_GO_ERROR_MESSAGE = "BatchMintSizeExceeded";
const NO_MORE_SALE_NFTS_LEFT = "NoMoreTokensLeft";
const TREASURY_RESERVATION_ALLOCATION_EXCEEDED = "TreasuryReservationAllocationExceeded";
const WAIT_FOR_PUBLIC_PURCHASE_TO_OPEN = "PublicPurchaseNotOpen";
const NOT_OWNER_OF_CONTRACT_ERROR = "Ownable: caller is not the owner";
const CONTRACT_ALREADY_LOCKED_ERROR = "ContractAlreadyLocked";

const CONTRACT_NAME = "Sky Castle Companions - Genesis";
const CONTRACT_SYMBOL = "SCAIG";
const ROYALTY_BPS = 1000;
const SALE_PRICE = "0.025";
const MAX_SUPPLY = 200;
const TREASURY_RESERVATION = 50;
const allowedPublicMintTokenCount = 10;
const multipleMintLimitPerTransaction = 7;

describe("SCAIGenesisTests", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployGenesisContractFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, adminAccount, opsAccount, otherAccount, financeAccount, lowerAdminAccount, airdropAccount] = await ethers.getSigners();
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
            opsAccount,
            otherAccount,
            lowerAdminAccount,
            financeAccount,
            contractUri,
            keypair,
            CouponServiceInstance,
            airdropAccount
        };
    }

    describe("Deployment", function () {

        // check default variables initialized correctly
        it("Should set the right owner", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.owner()).to.equal(owner.address);
        });

        it("Should initialize isPublicPurchaseOpened to false", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.isPublicPurchaseOpened()).to.equal(false);
        });

        it("Should set the right mintPrice", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.mintPrice())
                .to.equal(ethers.parseEther("0.025"));
        });

        it(`should have limit allowed public mint token to ${allowedPublicMintTokenCount}`, async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.allowedPublicMintTokenCount()).to.equal(allowedPublicMintTokenCount);
        });
        // end of check for default variables initialized correctly

        // check for constructor functions initializing variables correctly
        it("Should base uri to correctly", async function () {
            const { genesisContractDeployed, contractUri } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.contractURI()).to.equal(`${contractUri}contractMetadata.json`);
        });

        it("should set operator filtering to false", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.operatorFilteringEnabled()).to.equal(false);
        })

        it("Should set the right owner for DEFAULT_ADMIN_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, owner.address)).to.equal(true);
        });

        it("Should set the right owner of DEFAULT_ADMIN_ROLE to the Default Admin Role itself in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            expect(await genesisContractDeployed.getRoleAdmin(DEFAULT_ADMIN_ROLE)).to.equal(defaultAdminRole);
        });

        it("Should set the adminAccount to be DEFAULT_ADMIN_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, adminAccount, owner } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, adminAccount.address)).to.equal(true);

        });

        it("Should have admin account and owner account to be DEFAULT_ADMIN_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, adminAccount, owner } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, adminAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, owner.address)).to.equal(true);
        });

        it("Should set the right owner for PAUSE_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const PauseRole = await genesisContractDeployed.PAUSE_ROLE();
            const hasPauseRole = await genesisContractDeployed.hasRole(
                PauseRole,
                lowerAdminAccount.address
            );
            expect(hasPauseRole).to.equal(true);
        });

        it("Should set the right owner for MINT_OPS_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            const hasMintOpsRole = await genesisContractDeployed.hasRole(
                MintOpsRole,
                lowerAdminAccount.address
            );
            expect(hasMintOpsRole).to.equal(true);
        });

        it("Should set the right GENERAL_OPS_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            const hasGeneralOpsRole = await genesisContractDeployed.hasRole(
                generalOpsRole,
                lowerAdminAccount.address
            );
            expect(hasGeneralOpsRole).to.equal(true);
        });

        it("Should set the right AIRDROP_ROLE in AccessControl Of OpenZeppelin", async function () {

            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            const hasAirdropRole = await genesisContractDeployed.hasRole(
                airdropRole,
                lowerAdminAccount.address
            );
            expect(hasAirdropRole).to.equal(true);
        });

        it("Should set the right PAUSE_MINT_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const PauseMintRole = await genesisContractDeployed.PAUSE_MINT_ROLE();
            const hasPauseMintRole = await genesisContractDeployed.hasRole(
                PauseMintRole,
                lowerAdminAccount.address
            );
            expect(hasPauseMintRole).to.equal(true);
        });

        it("Should reject Owner as the owner for GENERAL_OPS_ROLE in AccessControl Of OpenZeppelin", async function () {

            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const GeneralOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            const hasGeneralOpsRole = await genesisContractDeployed.hasRole(
                GeneralOpsRole,
                owner.address
            );
            expect(hasGeneralOpsRole).to.equal(false);
        });

        it("Should reject Owner as the owner for PAUSE_MINT_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const PauseMintRole = await genesisContractDeployed.PAUSE_MINT_ROLE();
            const isPauseMintRole = await genesisContractDeployed.hasRole(
                PauseMintRole,
                owner.address
            );
            expect(isPauseMintRole).to.equal(false);
        });

        it("Should reject Owner as the owner for MINT_OPS_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            const hasMintOpsRole = await genesisContractDeployed.hasRole(
                MintOpsRole,
                owner.address
            );
            expect(hasMintOpsRole).to.equal(false);
        });

        it("Should reject Owner as the owner for PAUSE_ROLE in AccessControl Of OpenZeppelin", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const PauseRole = await genesisContractDeployed.PAUSE_ROLE();
            const hasPauseRole = await genesisContractDeployed.hasRole(
                PauseRole,
                owner.address
            );
            expect(hasPauseRole).to.equal(false);
        });
        // end of check for constructor functions initializing variables correctly

        // Test Alternate Error Handlings
        it("Should fail if max supply given is an incorrect value", async function () {
            // We don't use the fixture here because we want a different deployment
            const genesisContract = await ethers.getContractFactory("SCAIGenesis");
            const contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/metadata/genesis/";
            const couponSigner = "0x0E367d1785106bD6cFa589FD50a146ac76B0f62d";
            const [owner, adminAccount, lowerAdminAccount] = await ethers.getSigners();
            const genesisContractToBeDeployed = await expect(genesisContract.connect(owner).deploy(
                contractUri,
                12001,
                TREASURY_RESERVATION,
                couponSigner,
                adminAccount.address,
                lowerAdminAccount.address
            )).to.be.reverted;
        });

        // Test Alternate Error Handlings
        it("Should fail if treasury mint supply given is an incorrect value", async function () {
            // We don't use the fixture here because we want a different deployment
            const genesisContract = await ethers.getContractFactory("SCAIGenesis");
            const contractUri = "https://public-accessibles.s3.amazonaws.com/skycastle/metadata/genesis/";
            const couponSigner = "0x0E367d1785106bD6cFa589FD50a146ac76B0f62d";
            const [owner, adminAccount, lowerAdminAccount] = await ethers.getSigners();
            const genesisContractToBeDeployed = await expect(genesisContract.connect(owner).deploy(
                contractUri,
                MAX_SUPPLY,
                1201,
                couponSigner,
                adminAccount.address,
                lowerAdminAccount.address
            )).to.be.reverted;
        });

        it("should have correct ERC-721 name", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.name()).to.equal(CONTRACT_NAME);
        });

        it("should have correct ERC-721 symbol", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);
            expect(await genesisContractDeployed.symbol()).to.equal(CONTRACT_SYMBOL);
        });

        it("should have royalty amount set", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            const someTokenID = 17;
            const salePrice = ethers.parseEther(SALE_PRICE);
            const [address, amount] = await genesisContractDeployed.royaltyInfo(someTokenID, salePrice.toString());
            expect(address).to.equal(owner.address);

            const expectedRoyaltyCollectionAmount = parseFloat(salePrice.toString()) * (ROYALTY_BPS / 10000);
            expect(amount).to.equal(expectedRoyaltyCollectionAmount);
        });

        it(`should have limit allowed public mint token set to new amount`, async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setAllowedPublicMintTokenCount(2);
            expect(await genesisContractDeployed.allowedPublicMintTokenCount()).to.equal(2);
        });

        it("should support ERC-721, ERC-165 and ERC-2981 interfaces", async function () {
            const { genesisContractDeployed } = await loadFixture(deployGenesisContractFixture);

            const expectedInterfaces = [
                "0x01ffc9a7", // ERC-165
                "0x80ac58cd", // ERC-721
                "0x2a55205a", // ERC-2981
            ];
            for (const iface of expectedInterfaces) {
                expect(await genesisContractDeployed.supportsInterface(iface)).to.be.true;
            }
        });
    });

    describe("Minting", function () {
        describe("publicPurchase", function () {
            it("Should revert with the right error if publicPurchase is called when isPublicPurchaseOpened = false", async function () {
                const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(false);
                await expect(genesisContractDeployed.publicPurchase({
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025")
                })).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    WAIT_FOR_PUBLIC_PURCHASE_TO_OPEN
                );
            });

            it("Should revert with the right error if publicPurchase is called and the value sent is wrong.", async function () {
                const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await expect(genesisContractDeployed.publicPurchase({
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.01") // error value
                })).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    INSUFFICIENT_VALUE_SENT_CUSTOM_ERROR_MESSAGE
                );
            });

            it("Should revert and NOT mint a Genesis token when contract is paused", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await genesisContractDeployed.connect(lowerAdminAccount).pause();
                await expect(genesisContractDeployed.connect(otherAccount).publicPurchase(
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025"),
                    })
                ).to.be.revertedWith(
                    "Pausable: paused"
                );
            });

            it("Should mint a Genesis token when public purchase is opened", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                const mintTransaction = await genesisContractDeployed.publicPurchase({
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025")
                });
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }
                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
            });

            // tied to allowedPublicMintTokenCount
            it("Should Reject the 11th Mint Genesis token due to the Max Mint Per Public Wallet Scenario", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                // mint up to allowedPublicMintTokenCount
                for (let i = 0; i < allowedPublicMintTokenCount; i++) {
                    const mintTransaction = await genesisContractDeployed.publicPurchase({
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025")
                    });
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }

                await expect(genesisContractDeployed.publicPurchase({
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                })).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE
                );
            });

            it("Should be able to mint a Genesis token if when mint price is set to 0", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchase(
                    {
                        gasLimit: 3000000
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
            });

            it(`Should have no repeating token ids in 100 Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                // so that we can test 100 mints
                await genesisContractDeployed.connect(lowerAdminAccount).setAllowedPublicMintTokenCount(100);

                const tokenIdArray = [];
                for (let i = 0; i < 100; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchaseBatch(
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                expect(tokenIdArray.length).to.equal(100);
            });
        })

        describe("publicPurchaseBatch", function () {
            it("Should revert with the right error if publicPurchaseBatch is called when isPublicPurchaseOpened = false", async function () {
                const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(false);
                await expect(genesisContractDeployed.publicPurchaseBatch(
                    1,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025")
                    }
                )).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    WAIT_FOR_PUBLIC_PURCHASE_TO_OPEN
                );
            });

            it("Should revert with the right error if publicPurchase is called and the value sent is wrong.", async function () {
                const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await expect(genesisContractDeployed.publicPurchaseBatch(2, {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.04999") // error value
                })).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    INSUFFICIENT_VALUE_SENT_CUSTOM_ERROR_MESSAGE
                );
            });

            it("Should revert and NOT mint a Genesis token when contract is paused", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await genesisContractDeployed.connect(lowerAdminAccount).pause();
                await expect(genesisContractDeployed.connect(otherAccount).publicPurchaseBatch(
                    2,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05"),
                    })
                ).to.be.revertedWith(
                    "Pausable: paused"
                );
            });

            it("Should mint a Genesis token when public purchase is opened", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                const mintTransaction = await genesisContractDeployed.publicPurchaseBatch(
                    1,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025")
                    }
                );
                const receipt = await mintTransaction.wait();
                // why any? related to https://github.com/ethers-io/ethers.js/issues/487#issuecomment-1722195086
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }
                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
            });

            it("Should mint a batch of 5 genesis tokens when public purchase is opened", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                // 5 mints
                const mintTransaction = await genesisContractDeployed.connect(owner).publicPurchaseBatch(
                    5,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.125")
                    }
                );

                const receipt = await mintTransaction.wait();

                for (let i = 0; i < 5; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }
            });

            // tied to allowedPublicMintTokenCount
            it("Should Reject the 11th Mint Genesis token due to the Max Mint Per Public Wallet Scenario", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                const mintsThatWillBeValid = 10;

                // 7 mints
                const mintTransaction = await genesisContractDeployed.connect(owner).publicPurchaseBatch(
                    multipleMintLimitPerTransaction,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.175")
                    }
                );

                const receipt = await mintTransaction.wait();

                for (let i = 0; i < multipleMintLimitPerTransaction; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }

                const mintTransaction2 = await genesisContractDeployed.connect(owner).publicPurchaseBatch(
                    (mintsThatWillBeValid % multipleMintLimitPerTransaction),
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.075")
                    }
                );

                const receipt2 = await mintTransaction2.wait();

                for (let i = 0; i < (mintsThatWillBeValid % multipleMintLimitPerTransaction); i++) {
                    const event = receipt2?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction2).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }

                await expect(genesisContractDeployed.publicPurchaseBatch(1,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025") // correct value
                    }
                )).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE
                );
            });

            it(`Should have no repeating token ids in 100 Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                // so that we can test 100 mints
                await genesisContractDeployed.connect(lowerAdminAccount).setAllowedPublicMintTokenCount(100);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                const tokenIdArray = [];
                for (let i = 0; i < 50; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchaseBatch(
                        2,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.05") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    for (let i = 0; i < 2; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }
                expect(tokenIdArray.length).to.equal(100);
            });

            it("Should be able to mint a Genesis token if when mint price is set to 0", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchaseBatch(
                    1,
                    {
                        gasLimit: 3000000
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
            });
        })


        describe("presalePurchase", function () {

            it("Should reject minting a Genesis token if coupon is invalid (someone's else coupon)", async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount, otherAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, 1);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                // connect with other account
                await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                    coupon,
                    1,
                    1,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    INVALID_COUPON_CUSTOM_ERROR_MESSAGE
                );
            });

            it("Should be able to mint a Genesis token if when mint price is set to 0", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                    coupon,
                    1,
                    1,
                    {
                        gasLimit: 3000000
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
            });

            it(`Should Reject the ${MAX_SUPPLY - TREASURY_RESERVATION + 1}th Mint Genesis token due to the Max Supply/Treasury Limitations`, async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const tokenIdArray = [];
                const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, (MAX_SUPPLY+10));
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                for (let i = 0; i < MAX_SUPPLY - TREASURY_RESERVATION ; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(owner).presalePurchase(
                        coupon,
                        1,
                        (MAX_SUPPLY+10),
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                await expect(genesisContractDeployed.connect(owner).presalePurchase(
                    coupon,
                    1,
                    (MAX_SUPPLY+10),
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );
            });

            it(`Should have no repeating token ids in 100 Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, owner, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, 105);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);

                const tokenIdArray = [];
                for (let i = 0; i < 100; i++) {
                    const mintTransaction = await genesisContractDeployed.presalePurchase(
                        coupon,
                        1,
                        105,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                expect(tokenIdArray.length).to.equal(100);
            });

            // handle coupons
            describe("with Coupon", function () {
                it("Should mint a Genesis token when private purchase is active", async function () {
                    const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                });

                it("Should not mint a Genesis token when coupon number is mismatched", async function () {
                    const { genesisContractDeployed, lowerAdminAccount, otherAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 2, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);

                    await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        })
                    ).to.be.revertedWithCustomError(
                        genesisContractDeployed,
                        INVALID_COUPON_CUSTOM_ERROR_MESSAGE
                    );
                });

                it("Should not mint a Genesis token when amount to mint is mismatched", async function () {
                    const { genesisContractDeployed, lowerAdminAccount, otherAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 2);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        })
                    ).to.be.revertedWithCustomError(
                        genesisContractDeployed,
                        INVALID_COUPON_CUSTOM_ERROR_MESSAGE
                    );
                });
            });

            describe("with Error Handlings", function () {
                it("Should revert and NOT mint a Genesis token when private purchase is false", async function () {
                    const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(false);
                    await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        })
                    ).to.be.revertedWithCustomError(
                        genesisContractDeployed,
                        WAIT_FOR_PRIVATE_PURCHASE_TO_OPEN
                    );
                });


                it("Should revert and NOT mint a Genesis token when ether sent is wrong", async function () {
                    const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.015"),
                        })
                    ).to.be.revertedWithCustomError(
                        genesisContractDeployed,
                        INSUFFICIENT_VALUE_SENT_CUSTOM_ERROR_MESSAGE
                    );
                });

                it("Should revert and NOT mint a Genesis token when contract is paused", async function () {
                    const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    await genesisContractDeployed.connect(lowerAdminAccount).pause();
                    await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        })
                    ).to.be.revertedWith(
                        "Pausable: paused"
                    );
                });

                it("Should mint a Genesis token when contract has been unpaused", async function () {
                    const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                    const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                    await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                    await genesisContractDeployed.connect(lowerAdminAccount).pause();
                    await genesisContractDeployed.connect(lowerAdminAccount).unpause();

                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }
                    expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                });
            });
        })

        describe("presalePurchaseBatch", function () {

            it(`Should Reject the ${MAX_SUPPLY - TREASURY_RESERVATION + 1}th Mint Genesis token due to the Max Supply/Treasury Limitations`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, (MAX_SUPPLY + 5));
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);

                const toMint = MAX_SUPPLY - TREASURY_RESERVATION;

                for (let i = 0; i < Math.round(toMint / multipleMintLimitPerTransaction); i++) {
                    await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                        coupon,
                        1,
                        (MAX_SUPPLY + 5),
                        multipleMintLimitPerTransaction,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.175") // correct value
                        }
                    );
                }

                for (let i = 0; i < (toMint % multipleMintLimitPerTransaction); i++) {
                    // mint two more to hit 100
                    await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                        coupon,
                        1,
                        (MAX_SUPPLY + 5),
                        1,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    );
                }


                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    (MAX_SUPPLY + 5),
                    2,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );
            });

            it(`Should Reject the 11th Mint Genesis token due to the Max Batch Minting of 10 in one go`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 20);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);

                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    20,
                    15,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.375") // correct value
                    }
                )).to.be.revertedWithCustomError(genesisContractDeployed, EXCEEDED_BATCH_MINT_SIZE_AT_ONE_GO_ERROR_MESSAGE);

            });

            it("Should mint 2 Genesis token when Private sale is opened and valid coupon is used", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 2);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    2,//allocation
                    2,// mint two 
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05") // correct value
                    }
                )
                const receipt = await mintTransaction.wait();

                for (let i = 0; i < 2; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }
            });

            it("Should be able to mint 3 Genesis token when Private sale is open if unused allocation is 5", async function () {
                const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 5);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    5,//allocation
                    3,// mint three 
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.075") // correct value
                    }
                )
                const receipt = await mintTransaction.wait();

                for (let i = 0; i < 3; i++) {
                    const event = receipt?.logs[i];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }
            });

            it("Should reject mint 2 Genesis token if allocation is only 1", async function () {
                const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    1, //allocation - must match coupon
                    2, // mint two
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    ALLOCATION_EXCEED_ERROR_MESSAGE
                );
            });

            it("Should reject mint 2 Genesis token if eth value sent is insufficient", async function () {
                const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    1, //allocation - must match coupon
                    2, // mint two
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.03"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    INSUFFICIENT_VALUE_SENT_CUSTOM_ERROR_MESSAGE
                );
            });

            it("Should reject mint 2 Genesis token if coupon is invalid (someone's else coupon)", async function () {
                const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, 5);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    5,
                    2, // mint two
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    INVALID_COUPON_CUSTOM_ERROR_MESSAGE
                );
            });

            it("Should revert and reject mint 2 Genesis token when Lock phase is active", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);

                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 5);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(false);
                await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                    coupon,
                    1,
                    5,
                    2, // mint two
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.05"),
                    })
                ).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    WAIT_FOR_PRIVATE_PURCHASE_TO_OPEN
                );
            });

            it(`Should have no repeating token ids in 100 Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                // so that we can test 100 mints
                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1,100);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                const tokenIdArray = [];
                for (let i = 0; i < 20; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                        coupon,
                        1,
                        100,
                        5,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.125") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    for (let i = 0; i < 5; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }
                expect(tokenIdArray.length).to.equal(100);
            });
        })

        describe("airdrop", function () {
            it("Should airdrop a Genesis token to designated account", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let firstTokenId = 0;
                if (event) {
                    firstTokenId = event.args.tokenId;
                }

                expect(mintTransaction)
                    .to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, firstTokenId);
            })

            it("Should not airdrop a Genesis token to designated account when a ops account is used", async function () {
                const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);

                await expect(genesisContractDeployed.connect(otherAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    })
                ).to.be.reverted;
            })

            it("Should not airdrop a Genesis token to designated account when the contract is paused", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                await genesisContractDeployed.connect(lowerAdminAccount).pause();
                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    })
                ).to.be.revertedWith(
                    "Pausable: paused"
                );
            })

            it("Should airdrop 30 Genesis tokens to designated account and these tokens are not restricted to public NFT per address restrictions", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                for (let i = 0; i < 30; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    expect(mintTransaction)
                        .to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }

                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);

                // 10 mints
                for (let s = 30; s < (30 + allowedPublicMintTokenCount); s++) {
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchase(
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    expect(mintTransaction)
                        .to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }

                await expect(genesisContractDeployed.connect(otherAccount).publicPurchase({
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                })).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE
                );
            })

            it("Should airdrop 30 Genesis tokens to designated account and these tokens are not restricted to presale NFT per address restrictions", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 8);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);

                for (let i = 0; i < 30; i++) {
                    const airdropTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    )
                    const receipt = await airdropTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    expect(airdropTransaction)
                        .to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }

                // 8 mints
                for (let s = 30; s < 38; s++) {
                    const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                        coupon,
                        1,
                        8,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025"),
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }
                    expect(mintTransaction)
                        .to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }

                await expect(genesisContractDeployed.connect(otherAccount).presalePurchase(
                    coupon,
                    1,
                    8,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025"),
                    })
                ).to.be.revertedWithCustomError(genesisContractDeployed, ALLOCATION_EXCEED_ERROR_MESSAGE);
            })

            it("Should not airdrop a Genesis token to designated account when the max supply (taking in account of treasury reservations) has exceeded", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                for (let i = 0; i < MAX_SUPPLY - TREASURY_RESERVATION; i++) {
                    const airdropTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    )
                    const receipt = await airdropTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }
                    expect(airdropTransaction)
                        .to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
                }

                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000,
                    }
                )).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );
            })

            it("Should not airdrop a Genesis token to designated account when the contract is paused", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                await genesisContractDeployed.connect(lowerAdminAccount).pause();
                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    })
                ).to.be.revertedWith(
                    "Pausable: paused"
                );
            })

            it(`Should have no repeating token ids in 100 Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const tokenIdArray = [];
                for (let i = 0; i < 20; i++) {
                    const airdropTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        5,
                        {
                            gasLimit: 3000000
                        }
                    )
                    const receipt = await airdropTransaction.wait();
                    for (let i = 0; i < 5; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(airdropTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }
                expect(tokenIdArray.length).to.equal(100);
            });
        })

        describe("Treasury Mints", function () {
            it(`should have an allocation of ${TREASURY_RESERVATION} and all must be mintable despite public/private being sold out. Treasury Mint 1 by 1.`, async function () {
                const tokenIdArray = [];
                const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                for (let i = 0; i < (MAX_SUPPLY - TREASURY_RESERVATION); i++) {
                    // using airdrop to simulate normal mints
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }


                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                expect(tokenIdArray.length).to.equal((MAX_SUPPLY - TREASURY_RESERVATION));

                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(otherAccount.address, 1)).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );

                for (let i = 0; i < 50; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }
                expect(tokenIdArray.length).to.equal((MAX_SUPPLY));
            })

            it(`should have an allocation of ${TREASURY_RESERVATION}, and all must be mintable despite public/private being sold out. Treasury Mint 10 by 10`, async function () {
                const tokenIdArray = [];
                const { genesisContractDeployed, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
                // 150 mints
                for (let i = 0; i < (MAX_SUPPLY - TREASURY_RESERVATION); i++) {
                    // using airdrop to simulate normal mints
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }


                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                expect(tokenIdArray.length).to.equal((MAX_SUPPLY - TREASURY_RESERVATION));

                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(otherAccount.address, 1)).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );

                for (let i = 0; i < (Math.round(TREASURY_RESERVATION / multipleMintLimitPerTransaction)); i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        multipleMintLimitPerTransaction,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();

                    for (let i = 0; i < multipleMintLimitPerTransaction; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }

                for (let i = 0; i < TREASURY_RESERVATION % multipleMintLimitPerTransaction; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        (TREASURY_RESERVATION % multipleMintLimitPerTransaction),
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();

                    for (let i = 0; i < (TREASURY_RESERVATION % multipleMintLimitPerTransaction); i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }
                expect(tokenIdArray.length).to.equal((MAX_SUPPLY));
            })

            it("Should mint a Genesis token to designated account", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let firstTokenId = 0;
                if (event) {
                    firstTokenId = event.args.tokenId;
                }

                expect(mintTransaction)
                    .to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, firstTokenId);
            })

            it("Should after minting a Genesis Token the state variable treasuryMints should be updated", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );
                expect(await genesisContractDeployed.treasuryMints()).to.equal(1);
            })

            it("Should reject after reaching treasury mint limits", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const tokenIdArray = [];
                for (let i = 0; i < Math.round(TREASURY_RESERVATION / multipleMintLimitPerTransaction); i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        multipleMintLimitPerTransaction,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();

                    for (let i = 0; i < multipleMintLimitPerTransaction; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }

                for (let i = 0; i < (TREASURY_RESERVATION % multipleMintLimitPerTransaction); i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        1,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event && event.args) {
                        tokenId = event.args.tokenId;
                    }
    
                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
    
                    if (!tokenIdArray.includes(tokenId)) {
                        tokenIdArray.push(tokenId);
                    }
                }

                expect(await genesisContractDeployed.treasuryMints()).to.equal(TREASURY_RESERVATION);
                expect(tokenIdArray.length).to.equal((TREASURY_RESERVATION));

                const mintTransactionThatShouldFail = genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );

                await expect(mintTransactionThatShouldFail).to.be.revertedWithCustomError(genesisContractDeployed, TREASURY_RESERVATION_ALLOCATION_EXCEEDED);
            })

            it("Should not treasury mint a Genesis token to designated account when the contract is paused", async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

                await genesisContractDeployed.connect(lowerAdminAccount).pause();
                await expect(genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    })
                ).to.be.revertedWith(
                    "Pausable: paused"
                );
            })

            it(`Should have no repeating token ids in ${TREASURY_RESERVATION} Mints of Genesis token.`, async function () {
                const { genesisContractDeployed, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const tokenIdArray = [];
                for (let i = 0; i < (TREASURY_RESERVATION / 2); i++) {
                    const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).treasuryMint(
                        otherAccount.address,
                        2,
                        {
                            gasLimit: 3000000
                        }
                    );
                    const receipt = await mintTransaction.wait();
                    for (let i = 0; i < 2; i++) {
                        const event = receipt?.logs[i];
                        let tokenId = 0;
                        if (event && event.args) {
                            tokenId = event.args.tokenId;
                        }
                        await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                            .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                        if (!tokenIdArray.includes(tokenId)) {
                            tokenIdArray.push(tokenId);
                        }
                    }
                }
                expect(tokenIdArray.length).to.equal(TREASURY_RESERVATION);
            });
        })
    });

    describe("Operations", function () {
        // contract locked
        it("Should allow owner to lock the contract to prevent further the base URI changes", async function () {
            const { genesisContractDeployed, lowerAdminAccount, owner } = await loadFixture(deployGenesisContractFixture);
            const newBaseURI = "https://test-public-accessibles.com/skycastle/metadata/genesis/";
            await genesisContractDeployed.connect(owner).lockContract();
            expect(await genesisContractDeployed.contractLocked()).to.equal(true);
            await expect(genesisContractDeployed.connect(lowerAdminAccount).setURI(newBaseURI)).to.be.revertedWithCustomError(
                genesisContractDeployed,
                CONTRACT_ALREADY_LOCKED_ERROR
            );
        });

        it("Should not allow admin to lock the contract to prevent further the base URI changes", async function () {
            const { genesisContractDeployed, adminAccount } = await loadFixture(deployGenesisContractFixture);
            await expect(genesisContractDeployed.connect(adminAccount).lockContract()).to.be.revertedWith(
                NOT_OWNER_OF_CONTRACT_ERROR
            );
        });


        it("Should allow lowerAdminAccount to set public purchase to open", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            expect(await genesisContractDeployed.isPublicPurchaseOpened()).to.equal(true);
        });

        it("Should allow lowerAdminAccount to set private purchase to open", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            expect(await genesisContractDeployed.isPrivatePurchaseOpened()).to.equal(true);
        });

        it("Should allow lowerAdminAccount to set private purchase to open and then back to close", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(false);
            expect(await genesisContractDeployed.isPrivatePurchaseOpened()).to.equal(false);
        });


        it("Should revert if lowerAdminAccount to set private purchase to an invalid value", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const value = await genesisContractDeployed.connect(lowerAdminAccount).isPrivatePurchaseOpened();
            await expect(genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(10));
            const value2 = await genesisContractDeployed.connect(lowerAdminAccount).isPrivatePurchaseOpened();
            // expect value 1 and value to be same.
            expect(value == value2).to.equal(true);
        });

        //pause
        it("Should allow lower admin role to pause the contract", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).pause();
            expect(await genesisContractDeployed.paused()).to.equal(true);
        });

        //unpause
        it("Should allow lower admin role to unpause the contract", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).pause();
            await genesisContractDeployed.connect(lowerAdminAccount).unpause();
            expect(await genesisContractDeployed.paused()).to.equal(false);
        });

        // base uri
        it("Should allow admin to set the base URI", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

            const newBaseURI = "https://test-public-accessibles.com/skycastle/metadata/genesis/";
            await genesisContractDeployed.connect(lowerAdminAccount).setURI(newBaseURI);

            expect(await genesisContractDeployed.contractURI()).to.equal(`${newBaseURI}contractMetadata.json`);
        });

        // mint price
        it("Should allow admin to change the minting price", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(ethers.parseEther("0.035"));
            expect(await genesisContractDeployed.mintPrice()).to.equal(ethers.parseEther("0.035"));
        });

        // royalty change - correct scenario
        it("Should allow lower admin account to change royalty amount", async function () {

            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const newContractAddress = "0x0E367d1785106bD6cFa589FD50a146ac76B0f62d";
            const newRoyaltyAmount = 5000;

            await genesisContractDeployed.connect(lowerAdminAccount).setRoyaltyInfo(newContractAddress, newRoyaltyAmount);
            const [address, amount] = await genesisContractDeployed.royaltyInfo(0, 10000);

            expect(address).to.equal(newContractAddress);
            expect(amount).to.equal(newRoyaltyAmount);
        });

        //withdraw
        it("Should allow lower admin account to withdraw ethereum from the contract and owner's balance gets the correct incremental amount", async function () {

            const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            const provider = await ethers.provider;
            await genesisContractDeployed.connect(otherAccount).publicPurchase({
                gasLimit: 3000000,
                value: ethers.parseEther("0.025") // correct value
            });
            const ownerBalanceBeforeWithdrawal = await provider.getBalance(owner.address);

            const transaction = await genesisContractDeployed.connect(lowerAdminAccount).withdraw();
            await transaction.wait();

            const genesisContractAddress = await genesisContractDeployed.getAddress();
            const contractBalance = await provider.getBalance(genesisContractAddress);
            const ownerBalanceAfterWithdrawal = await provider.getBalance(owner.address);

            const differenceAfterWithdrawal = ownerBalanceAfterWithdrawal - ownerBalanceBeforeWithdrawal;
            expect(contractBalance).to.equal(ethers.parseEther("0"));
            expect(differenceAfterWithdrawal).to.equal(ethers.parseEther("0.025"));
        });
    })


    describe("Access Control", function () {
        it("Should not allow non-admin to set the base URI", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const newUnrevealedTokenURI = "base-url-test";
            await expect(genesisContractDeployed.connect(otherAccount).setURI(newUnrevealedTokenURI)).to.be.reverted;
        });

        // royalty change - non-admin reject scenario
        it("Should not allow non-admin to change royalty amount", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const newAddress = "0x0E367d1785106bD6cFa589FD50a146ac76B0f62d";
            const newRoyaltyAmount = 9000;
            await expect(genesisContractDeployed.connect(otherAccount).setRoyaltyInfo(newAddress, newRoyaltyAmount)).to.be.reverted;
        });

        it("Should not allow non-admin to lock the contract to prevent further the base URI changes", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await expect(genesisContractDeployed.connect(otherAccount).lockContract())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });


        it("Should not allow a non-admin to change the minting price", async function () {
            const { genesisContractDeployed, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await expect(genesisContractDeployed.connect(airdropAccount).setMintPrice(ethers.parseEther("0.035"))).to.be.revertedWith(`AccessControl: account ${airdropAccount.address.toLowerCase()} is missing role ${MintOpsRole}`);
        });

        it("Should not allow a non-admin to set private sale to true", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await expect(genesisContractDeployed.connect(otherAccount).setPrivatePurchaseOpened(true)).to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${MintOpsRole}`);
        });

        it("Should not allow a non general ops role account to change royalty amount", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const newContractAddress = "0x0E367d1785106bD6cFa589FD50a146ac76B0f62d";
            const newRoyaltyAmount = 5000;
            await expect(genesisContractDeployed.connect(otherAccount).setRoyaltyInfo(newContractAddress, newRoyaltyAmount)).to.be.reverted;
        });

        it("Should not allow a non-pause role account to pause the contract", async function () {
            const { genesisContractDeployed, owner } = await loadFixture(deployGenesisContractFixture);
            await expect(genesisContractDeployed.connect(owner).pause()).to.be.reverted;
        });

        it("Should not allow a non general ops role account to withdraw eth from the contract", async function () {
            const { genesisContractDeployed, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            await expect(genesisContractDeployed.connect(airdropAccount).withdraw()).to.be.reverted;
        });

        it("Should not allow a non-admin role account to grant roles to other accounts", async function () {
            const { genesisContractDeployed, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await expect(genesisContractDeployed.connect(airdropAccount).grantRole(defaultAdminRole, airdropAccount.address)).to.be.reverted;
        });

        it("Should not allow a non-admin role account to revoke roles of other accounts", async function () {
            const { genesisContractDeployed, lowerAdminAccount, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await expect(genesisContractDeployed.connect(lowerAdminAccount).revokeRole(airdropRole, airdropAccount.address)).to.be.reverted;
        });

        it("Should not allow a non-admin role account to revoke admin roles of other accounts", async function () {
            const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await expect(genesisContractDeployed.connect(lowerAdminAccount).revokeRole(defaultAdminRole, owner.address)).to.be.reverted;
        });

        it("Should not allow a non-admin role account to grant roles to other accounts", async function () {
            const { genesisContractDeployed, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await expect(genesisContractDeployed.connect(otherAccount).grantRole(defaultAdminRole, otherAccount.address)).to.be.reverted;
        });

        it("Should owner account to grant roles to other accounts", async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await expect(genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, otherAccount.address))
                .to.emit(genesisContractDeployed, "RoleGranted").withArgs(defaultAdminRole, otherAccount.address, owner.address);
            expect(await genesisContractDeployed.connect(owner).hasRole(defaultAdminRole, otherAccount.address)).to.equal(true);
        });

        it("Should owner account to revoke roles of other accounts", async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();

            await expect(genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, otherAccount.address))
                .to.emit(genesisContractDeployed, "RoleGranted").withArgs(defaultAdminRole, otherAccount.address, owner.address);

            await expect(genesisContractDeployed.connect(owner).revokeRole(defaultAdminRole, otherAccount.address))
                .to.emit(genesisContractDeployed, "RoleRevoked").withArgs(defaultAdminRole, otherAccount.address, owner.address);

            expect(await genesisContractDeployed.connect(owner).hasRole(defaultAdminRole, otherAccount.address)).to.equal(false);
        });

        it('Should allow an admin to grant a role. (wallet 1)', async function () {
            const { genesisContractDeployed, adminAccount, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await expect(genesisContractDeployed.connect(adminAccount).grantRole(airdropRole, airdropAccount.address))
                .to.emit(genesisContractDeployed, "RoleGranted").withArgs(airdropRole, airdropAccount.address, adminAccount.address);

            // airdrop role keeps their role as well
            expect(await genesisContractDeployed.connect(adminAccount).hasRole(airdropRole, airdropAccount.address)).to.equal(true);
        });

        it('Should allow an admin to revoke a role. (wallet 1)', async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await expect(genesisContractDeployed.connect(adminAccount).revokeRole(airdropRole, lowerAdminAccount.address))
                .to.emit(genesisContractDeployed, "RoleRevoked").withArgs(airdropRole, lowerAdminAccount.address, adminAccount.address);

            // airdrop role should not have their role from this point
            expect(await genesisContractDeployed.connect(adminAccount).hasRole(airdropRole, lowerAdminAccount.address)).to.equal(false);
        });

        it('Should allow a role to renounce ownership of a role', async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await expect(genesisContractDeployed.connect(lowerAdminAccount).renounceRole(airdropRole, lowerAdminAccount.address))
                .to.emit(genesisContractDeployed, "RoleRevoked").withArgs(airdropRole, lowerAdminAccount.address, lowerAdminAccount.address);
            // lowerAdminAccount should not have their airdrop role from this point
            expect(await genesisContractDeployed.connect(lowerAdminAccount).hasRole(airdropRole, lowerAdminAccount.address)).to.equal(false);
        });

        it('Should allow an admin role to grant another address an admin role', async function () {
            const { genesisContractDeployed, owner, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, airdropAccount.address);
            expect(await genesisContractDeployed.connect(airdropAccount).hasRole(defaultAdminRole, airdropAccount.address)).to.equal(true);
        });

        it('Should allow an new admin role to revoke old admin address', async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, otherAccount.address);
            expect(await genesisContractDeployed.connect(otherAccount).hasRole(defaultAdminRole, otherAccount.address)).to.equal(true);

            await expect(genesisContractDeployed.connect(otherAccount).revokeRole(defaultAdminRole, owner.address))
                .to.emit(genesisContractDeployed, "RoleRevoked").withArgs(defaultAdminRole, owner.address, otherAccount.address);

            expect(await genesisContractDeployed.connect(otherAccount).hasRole(defaultAdminRole, owner.address)).to.equal(false);
        });

        it('Should not allow an old admin account to grant role to a unrelated address', async function () {
            const { genesisContractDeployed, owner, otherAccount, financeAccount } = await loadFixture(deployGenesisContractFixture);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            // grant admin role to financeAccount
            await genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, financeAccount.address);
            // check admin role if its tied to financeAccount
            expect(await genesisContractDeployed.connect(financeAccount).hasRole(defaultAdminRole, financeAccount.address)).to.equal(true);
            // revoke owner's admin role
            await expect(genesisContractDeployed.connect(financeAccount).revokeRole(defaultAdminRole, owner.address))
                .to.emit(genesisContractDeployed, "RoleRevoked").withArgs(defaultAdminRole, owner.address, financeAccount.address);
            // expect that owner address no longer has default admin role
            expect(await genesisContractDeployed.connect(financeAccount).hasRole(defaultAdminRole, owner.address)).to.equal(false);
            // expect owner's call to grant role to a otherAccount account to fail
            await expect(genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, otherAccount.address)).to.be.reverted;
        });

        it('Should be able to pause the contract with a new PAUSE_ROLE account', async function () {
            const { genesisContractDeployed, otherAccount, adminAccount } = await loadFixture(deployGenesisContractFixture);
            const pauseRole = await genesisContractDeployed.PAUSE_ROLE();
            // grant pause role to otherAccount
            await genesisContractDeployed.connect(adminAccount).grantRole(pauseRole, otherAccount.address);
            // check pause role if its tied to otherAccount
            expect(await genesisContractDeployed.connect(otherAccount).hasRole(pauseRole, otherAccount.address)).to.equal(true);
            await genesisContractDeployed.connect(otherAccount).pause();
            expect(await genesisContractDeployed.paused()).to.equal(true);
        });

        it('Should be able to unpause the contract with a new PAUSE_ROLE account', async function () {
            const { genesisContractDeployed, otherAccount, adminAccount } = await loadFixture(deployGenesisContractFixture);
            const pauseRole = await genesisContractDeployed.PAUSE_ROLE();
            // grant pause role to otherAccount
            await genesisContractDeployed.connect(adminAccount).grantRole(pauseRole, otherAccount.address);
            // check pause role if its tied to otherAccount
            expect(await genesisContractDeployed.connect(otherAccount).hasRole(pauseRole, otherAccount.address)).to.equal(true);
            await genesisContractDeployed.connect(otherAccount).pause();
            await genesisContractDeployed.connect(otherAccount).unpause();
            expect(await genesisContractDeployed.paused()).to.equal(false);
        });

        it('Should be able to call withdraw of the contract with a new GENERAL_OPS_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount, otherAccount, owner } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            const provider = await ethers.provider;
            await genesisContractDeployed.connect(lowerAdminAccount).publicPurchase({
                gasLimit: 3000000,
                value: ethers.parseEther("0.025") // correct value
            });
            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(generalOpsRole, otherAccount.address);

            const ownerBalanceBeforeWithdrawal = await provider.getBalance(owner.address);

            const transaction = await genesisContractDeployed.connect(lowerAdminAccount).withdraw();
            await transaction.wait();

            const genesisContractAddress = await genesisContractDeployed.getAddress();
            const contractBalance = await provider.getBalance(genesisContractAddress);
            const ownerBalanceAfterWithdrawal = await provider.getBalance(owner.address);

            const differenceAfterWithdrawal = ownerBalanceAfterWithdrawal - ownerBalanceBeforeWithdrawal;
            expect(contractBalance).to.equal(ethers.parseEther("0"));
            expect(differenceAfterWithdrawal).to.equal(ethers.parseEther("0.025"));
        });

        it('Should be able to call set royalty info of the contract with a new GENERAL_OPS_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount, owner } = await loadFixture(deployGenesisContractFixture);

            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(generalOpsRole, otherAccount.address);
            const newRoyaltyAmount = 5000;
            await genesisContractDeployed.connect(otherAccount).setRoyaltyInfo(owner.address, newRoyaltyAmount);
            const [address, amount] = await genesisContractDeployed.royaltyInfo(0, 10000);
            expect(address).to.equal(owner.address);
            expect(amount).to.equal(newRoyaltyAmount);
        });

        it('Should be able to disable set operator filtering of the contract with a new GENERAL_OPS_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount, owner } = await loadFixture(deployGenesisContractFixture);
            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(generalOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setOperatorFilteringEnabled(false);
            expect(await genesisContractDeployed.operatorFilteringEnabled()).to.equal(false);
        });

        it('Should be able to disable set operator filtering of the contract with a new GENERAL_OPS_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount, owner } = await loadFixture(deployGenesisContractFixture);
            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(generalOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setURI('https://www.test.com/');
            expect(await genesisContractDeployed.connect(otherAccount).tokenURI(1)).to.equal(`https://www.test.com/1.json`);
        });

        it('Should be able to airdrop a token in the contract with a new AIRDROP_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(airdropRole, otherAccount.address);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).airdrop(
                adminAccount.address,
                1,
                {
                    gasLimit: 3000000
                }
            );
            const receipt = await mintTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event && event.args) {
                tokenId = event.args.tokenId;
            }

            await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                .withArgs(ethers.ZeroAddress, adminAccount.address, tokenId);
        });

        it('Should be able to treasury mint a token in the contract with a new AIRDROP_ROLE account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(airdropRole, otherAccount.address);

            const mintTransaction = await genesisContractDeployed.connect(otherAccount).treasuryMint(
                adminAccount.address,
                1,
                {
                    gasLimit: 3000000
                }
            );
            const receipt = await mintTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event && event.args) {
                tokenId = event.args.tokenId;
            }

            await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                .withArgs(ethers.ZeroAddress, adminAccount.address, tokenId);
        });

        it('Should be able to set mint price of the contract with a new MintOpsRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(MintOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setMintPrice(ethers.parseEther("1"));
            expect(await genesisContractDeployed.connect(otherAccount).mintPrice()).to.equal(ethers.parseEther("1"));
        });

        it('Should be able to set public purchase of the contract to true with a new PauseMintRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const PauseMintRole = await genesisContractDeployed.PAUSE_MINT_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(PauseMintRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setPublicPurchaseOpened(true);
            expect(await genesisContractDeployed.connect(otherAccount).isPublicPurchaseOpened()).to.equal(true);
        });

        it('Should be able to set public purchase of the contract  to false with a new PauseMintRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const PauseMintRole = await genesisContractDeployed.PAUSE_MINT_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(PauseMintRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setPublicPurchaseOpened(false);
            expect(await genesisContractDeployed.connect(otherAccount).isPublicPurchaseOpened()).to.equal(false);
        });

        it('Should be able to set private purchase of the contract to true with a new MintOpsRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(MintOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setPrivatePurchaseOpened(true);
            expect(await genesisContractDeployed.connect(otherAccount).isPrivatePurchaseOpened()).to.equal(true);
        });

        it('Should be able to set private purchase of the contract to false with a new MintOpsRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(MintOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setPrivatePurchaseOpened(false);
            expect(await genesisContractDeployed.connect(otherAccount).isPrivatePurchaseOpened()).to.equal(false);
        });

        it('Should be able to set allowed public mint token count of the contract with a new MintOpsRole account', async function () {
            const { genesisContractDeployed, adminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(MintOpsRole, otherAccount.address);
            await genesisContractDeployed.connect(otherAccount).setAllowedPublicMintTokenCount(12);
            expect(await genesisContractDeployed.connect(otherAccount).allowedPublicMintTokenCount()).to.equal(12);
        });


        it("Should have lower admin account and a newly assigned account to have access to the role of MINT_OPS_ROLE", async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const MintOpsRole = await genesisContractDeployed.MINT_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(MintOpsRole, otherAccount.address);
            expect(await genesisContractDeployed.hasRole(MintOpsRole, lowerAdminAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(MintOpsRole, otherAccount.address)).to.equal(true);
        });

        it("Should have lower admin account and a newly assigned account to have access to the role of GENERAL_OPS_ROLE", async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const generalOpsRole = await genesisContractDeployed.GENERAL_OPS_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(generalOpsRole, otherAccount.address);
            expect(await genesisContractDeployed.hasRole(generalOpsRole, lowerAdminAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(generalOpsRole, otherAccount.address)).to.equal(true);
        });

        it("Should have lower admin account and a newly assigned account to have access to the role of PAUSE_ROLE", async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const pauseRole = await genesisContractDeployed.PAUSE_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(pauseRole, otherAccount.address);
            expect(await genesisContractDeployed.hasRole(pauseRole, lowerAdminAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(pauseRole, otherAccount.address)).to.equal(true);
        });

        it("Should have lower admin account and a newly assigned account to have access to the role of AIRDROP_ROLE", async function () {
            const { genesisContractDeployed, adminAccount, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            const airdropRole = await genesisContractDeployed.AIRDROP_ROLE();
            await genesisContractDeployed.connect(adminAccount).grantRole(airdropRole, otherAccount.address);
            expect(await genesisContractDeployed.hasRole(airdropRole, lowerAdminAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(airdropRole, otherAccount.address)).to.equal(true);
        });
    })

    describe("Events", function () {

        it("Should emit an Transfer event on Mint/Transfer", async function () {
            const { genesisContractDeployed, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).publicPurchase(
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                }
            );
            const receipt = await mintTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event) {
                tokenId = event.args.tokenId;
            }
            expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
        });

        it("Should emit an MetadataURIChanged event on setURI being called", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const testUri = "https://www.test.com/";
            await expect(genesisContractDeployed.connect(lowerAdminAccount).setURI(testUri))
                .to.emit(genesisContractDeployed, "MetadataURIChanged")
                .withArgs(testUri);
        });


        it("Should emit a CouponUsed event on presalePurchase function being called", async function () {
            const { genesisContractDeployed, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 1);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                coupon,
                1,
                1,
                {
                    gasLimit: 3000000
                }
            )
            const receipt = await mintTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event) {
                tokenId = event.args.tokenId;
            }

            await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

            const keccak256HashCoupon = await CouponServiceInstance.generateKeccakHash(otherAccount.address, 1, 1)
            await expect(mintTransaction).to.emit(genesisContractDeployed, "CouponUsed").withArgs(otherAccount.address, keccak256HashCoupon, 1, 1, 1);
        });

        it("Should emit a CouponUsed event on presalePurchaseBatch function being called", async function () {
            const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 5);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            await genesisContractDeployed.connect(lowerAdminAccount).setMintPrice(0);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                coupon,
                1,
                5,
                5,
                {
                    gasLimit: 3000000
                }
            )
            const receipt = await mintTransaction.wait();

            for (let i = 0; i < 5; i++) {
                const event = receipt?.logs[i];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
            }

            const keccak256HashCoupon = await CouponServiceInstance.generateKeccakHash(otherAccount.address, 1, 5)
            await expect(mintTransaction).to.emit(genesisContractDeployed, "CouponUsed").withArgs(otherAccount.address, keccak256HashCoupon, 5, 1, 5);
        });

    });

    describe("Transfers", function () {
        it("Should transfer the ownership of the given token ID to the given address", async function () {
            const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

            const airdropTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                owner.address,
                1
            );
            const receipt = await airdropTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event) {
                tokenId = event.args.tokenId;
            }

            expect(await genesisContractDeployed.balanceOf(owner.address)).to.equal(1);

            await expect(genesisContractDeployed.connect(owner).transferFrom(owner.address, otherAccount.address, tokenId))
                .to.emit(genesisContractDeployed, "Transfer")
                .withArgs(owner.address, otherAccount.address, tokenId);

            expect(await genesisContractDeployed.balanceOf(owner.address)).to.equal(0);
            expect(await genesisContractDeployed.balanceOf(otherAccount.address)).to.equal(1);
        });

        it("Should not transfer the ownership of the given token ID to the given address if the sending account does not own the token ID", async function () {
            const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);

            const airdropTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                otherAccount.address,
                1
            );
            const receipt = await airdropTransaction.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event) {
                tokenId = event.args.tokenId;
            }

            expect(await genesisContractDeployed.balanceOf(otherAccount.address)).to.equal(1);

            await expect(genesisContractDeployed.connect(owner).transferFrom(owner.address, otherAccount.address, tokenId))
                .to.be.revertedWith('ERC721: caller is not token owner or approved');
            expect(await genesisContractDeployed.balanceOf(otherAccount.address)).to.equal(1);
            expect(await genesisContractDeployed.balanceOf(owner.address)).to.equal(0);
        });
    });

    describe("Supply Handling", function () {

        it("should reject further minting upon reaching MAX SUPPLY minus treasury reservation", async function () {
            const tokenIdArray = [];
            const { genesisContractDeployed, lowerAdminAccount, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            // 100 mints
            for (let i = 0; i < MAX_SUPPLY - TREASURY_RESERVATION; i++) {
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                if (!tokenIdArray.includes(tokenId)) {
                    tokenIdArray.push(tokenId);
                }
            }

            for (let i = 0; i < 1; i++) {
                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(otherAccount.address, 1)).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );
            }
            expect(tokenIdArray.length).to.equal(MAX_SUPPLY - TREASURY_RESERVATION);
        });

        it("should reject further minting upon reaching treasury's limit", async function () {
            const tokenIdArray = [];
            const { genesisContractDeployed, lowerAdminAccount, otherAccount, airdropAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            for (let i = 0; i < (MAX_SUPPLY - TREASURY_RESERVATION); i++) {
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }


                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);

                if (!tokenIdArray.includes(tokenId)) {
                    tokenIdArray.push(tokenId);
                }
            }

            for (let i = 0; i < 1; i++) {
                await expect(genesisContractDeployed.connect(lowerAdminAccount).airdrop(otherAccount.address, 1)).to.be.revertedWithCustomError(
                    genesisContractDeployed,
                    NO_MORE_SALE_NFTS_LEFT
                );
            }
            expect(tokenIdArray.length).to.equal((MAX_SUPPLY - TREASURY_RESERVATION));
        });

        it("should terminate a presale purchase halfway when minting reaches max supply limit - treasury reservation", async function () {
            const { genesisContractDeployed, owner, otherAccount, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
            for (let i = 0; i < (MAX_SUPPLY - TREASURY_RESERVATION); i++) {
                const mintTransaction = await genesisContractDeployed.connect(lowerAdminAccount).airdrop(
                    otherAccount.address,
                    1,
                    {
                        gasLimit: 3000000
                    }
                );
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event && event.args) {
                    tokenId = event.args.tokenId;
                }


                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId);
            }

            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 3);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            await expect(genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                coupon,
                1,
                3,//allocation
                3,// mint three 
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.075") // correct value
                }
            )).to.be.revertedWithCustomError(
                genesisContractDeployed,
                NO_MORE_SALE_NFTS_LEFT
            );

            expect(await genesisContractDeployed.connect(owner).tokenCount()).to.equal((MAX_SUPPLY - TREASURY_RESERVATION));
        })
    })

    describe("Coupons", function () {
        it(`Should Be Rejected when the coupon has been depleted (minted all its allocation)`, async function () {
            const { genesisContractDeployed, owner, lowerAdminAccount, CouponServiceInstance } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, 10);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            for (let i = 0; i < 10; i++) {
                const mintTransaction = await genesisContractDeployed.connect(owner).presalePurchase(
                    coupon,
                    1,
                    10,
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025") // correct value
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
            }

            await expect(genesisContractDeployed.connect(owner).presalePurchase(
                coupon,
                1,
                10,
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025"),
                })
            ).to.be.revertedWithCustomError(
                genesisContractDeployed,
                ALLOCATION_EXCEED_ERROR_MESSAGE
            );

            const coupon2 = CouponServiceInstance.generateCoupon(owner.address, 1, 1);

            const mintTransaction2 = await genesisContractDeployed.connect(owner).presalePurchase(
                coupon2,
                1,
                1,
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                }
            )
            const receipt = await mintTransaction2.wait();
            const event = receipt?.logs[0];
            let tokenId = 0;
            if (event) {
                tokenId = event.args.tokenId;
            }

            await expect(mintTransaction2).to.emit(genesisContractDeployed, "Transfer")
                .withArgs(ethers.ZeroAddress, owner.address, tokenId);
        });

        describe("that are different", function () {
            it(`should be treated as different. Allocation/Depletion should not be treated the same.`, async function () {
                const { genesisContractDeployed, owner, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
                const coupon = CouponServiceInstance.generateCoupon(owner.address, 1, 10);
                await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
                for (let i = 0; i < 10; i++) {
                    const mintTransaction = await genesisContractDeployed.connect(owner).presalePurchase(
                        coupon,
                        1,
                        10,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }

                const coupon2 = CouponServiceInstance.generateCoupon(owner.address, 1, 5);

                for (let i = 0; i < 5; i++) {
                    const mintTransaction2 = await genesisContractDeployed.connect(owner).presalePurchase(
                        coupon2,
                        1,
                        5,
                        {
                            gasLimit: 3000000,
                            value: ethers.parseEther("0.025") // correct value
                        }
                    )
                    const receipt = await mintTransaction2.wait();
                    const event = receipt?.logs[0];
                    let tokenId = 0;
                    if (event) {
                        tokenId = event.args.tokenId;
                    }

                    await expect(mintTransaction2).to.emit(genesisContractDeployed, "Transfer")
                        .withArgs(ethers.ZeroAddress, owner.address, tokenId);
                }
            });
        })

        it(`CouponUsed Event is emitted when a presalePurchase is called.`, async function () {
            const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 2);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                coupon,
                1,
                2,//allocation
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                }
            )
            const receipt = await mintTransaction.wait();
            const keccak256HashCoupon = await CouponServiceInstance.generateKeccakHash(otherAccount.address, 1, 2)

            await expect(mintTransaction).to.emit(genesisContractDeployed, "CouponUsed")
                .withArgs(otherAccount.address, keccak256HashCoupon, 1, 1, 2);
        })

        it(`CouponUsed Event is emitted when a presalePurchaseBatch is called.`, async function () {
            const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 2);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                coupon,
                1,
                2, // allocation
                2, // mint two
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.05") // correct value
                }
            )
            await mintTransaction.wait();
            const keccak256HashCoupon = await CouponServiceInstance.generateKeccakHash(otherAccount.address, 1, 2)

            await expect(mintTransaction).to.emit(genesisContractDeployed, "CouponUsed")
                .withArgs(otherAccount.address, keccak256HashCoupon, 2, 1, 2);
        })

        it(`should show up in the checkCouponUsage, when two of five allocation is used in a coupon using presalePurchaseBatch of 2 mins`, async function () {
            const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 5);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                coupon,
                1,
                5, // allocation
                2, // mint two
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.05") // correct value
                }
            )
            await mintTransaction.wait();
            expect(await genesisContractDeployed.connect(otherAccount).checkCouponUsage(otherAccount.address, 1, 5)).to.equal(2);

            const mintTransaction2 = await genesisContractDeployed.connect(otherAccount).presalePurchaseBatch(
                coupon,
                1,
                5, // allocation
                2, // mint two
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.05") // correct value
                }
            )
            await mintTransaction2.wait();
            expect(await genesisContractDeployed.connect(otherAccount).checkCouponUsage(otherAccount.address, 1, 5)).to.equal(4);
        })

        it(`should show up in the checkCouponUsage, when two of five allocation is used in a coupon using presalePurchase of 1 mint`, async function () {
            const { genesisContractDeployed, otherAccount, CouponServiceInstance, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            const coupon = CouponServiceInstance.generateCoupon(otherAccount.address, 1, 5);
            await genesisContractDeployed.connect(lowerAdminAccount).setPrivatePurchaseOpened(true);
            const mintTransaction = await genesisContractDeployed.connect(otherAccount).presalePurchase(
                coupon,
                1,
                5, // allocation
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                }
            )
            await mintTransaction.wait();
            expect(await genesisContractDeployed.connect(otherAccount).checkCouponUsage(otherAccount.address, 1, 5)).to.equal(1);
        })

        it(`should be restricted to allowed public mint of 2 tokens and when setAllowedPublicMintTokenCount is set to 2`, async function () {
            const { genesisContractDeployed, owner, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setPublicPurchaseOpened(true);
            await genesisContractDeployed.connect(lowerAdminAccount).setAllowedPublicMintTokenCount(2);
            for (let i = 0; i < 2; i++) {
                const mintTransaction = await genesisContractDeployed.connect(owner).publicPurchase(
                    {
                        gasLimit: 3000000,
                        value: ethers.parseEther("0.025") // correct value
                    }
                )
                const receipt = await mintTransaction.wait();
                const event = receipt?.logs[0];
                let tokenId = 0;
                if (event) {
                    tokenId = event.args.tokenId;
                }

                await expect(mintTransaction).to.emit(genesisContractDeployed, "Transfer")
                    .withArgs(ethers.ZeroAddress, owner.address, tokenId);
            }
            expect(await genesisContractDeployed.connect(lowerAdminAccount).allowedPublicMintTokenCount()).to.equal(2);
            await expect(genesisContractDeployed.connect(owner).publicPurchase(
                {
                    gasLimit: 3000000,
                    value: ethers.parseEther("0.025") // correct value
                }
            )).to.be.revertedWithCustomError(genesisContractDeployed, MAX_MINT_PER_PUBLIC_WALLET_ERROR_MESSAGE);
        });
    })

    describe("Operator Filterer", function () {
        it("should set operator filtering enabled", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setOperatorFilteringEnabled(true);
            expect(await genesisContractDeployed.operatorFilteringEnabled()).to.equal(true);
        })

        it("should set operator filtering disabled", async function () {
            const { genesisContractDeployed, lowerAdminAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(lowerAdminAccount).setOperatorFilteringEnabled(false);
            expect(await genesisContractDeployed.operatorFilteringEnabled()).to.equal(false);
        })
    })

    describe("Ownable's Ownership", function () {
        it("should be transferrable to another account", async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(owner).transferOwnership(otherAccount.address);
            await expect(await genesisContractDeployed.owner()).to.equal(otherAccount.address);
        })

        it("should be transferrable to another account and previous owner has no more access to contract", async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(owner).transferOwnership(otherAccount.address);
            await expect(genesisContractDeployed.connect(owner).lockContract()).to.be.reverted;
        })


        it("should be transferable in sc's after deployment", async function () {
            const { genesisContractDeployed, owner, otherAccount } = await loadFixture(deployGenesisContractFixture);
            await genesisContractDeployed.connect(owner).transferOwnership(otherAccount.address);
            const defaultAdminRole = await genesisContractDeployed.DEFAULT_ADMIN_ROLE();
            await genesisContractDeployed.connect(owner).grantRole(defaultAdminRole, otherAccount.address);
            await genesisContractDeployed.connect(owner).renounceRole(defaultAdminRole, owner.address);
            await expect(await genesisContractDeployed.owner()).to.equal(otherAccount.address);
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, otherAccount.address)).to.equal(true);
            expect(await genesisContractDeployed.hasRole(defaultAdminRole, owner.address)).to.equal(false);
        })
    })
});
