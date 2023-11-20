# SkyCastle Genesis Smart Contract

## Features
- Contract type: ERC 721
- Royalties: ERC 2981
- [operator-filter-registry](https://github.com/ProjectOpenSea/operator-filter-registry) from OpenSea to enforce royalties
  - Disabled by default
- Total supply: 12K NFTs
- Fair and random distribution of NFTs
  - Provenance hash will be defined in the contract before launching the contract and there's no way to change it: `PROVENANCE_FIRST_BATCH`
  - Random Token
    - `nextToken` calculates a random token id to be minted
    - This is based on [RandomlyAssigned](https://github.com/1001-digital/erc721-extensions/blob/main/contracts/RandomlyAssigned.sol)
- Treasury
  - 10% of the supply (1200) will be reserved for "treasury" (defined in the constructor)
  - The reserve will happen at the **end of the supply**: when there's 1200 NFT's left, no new mints are allowed, and all the 1200 left are reserved for treasury mint
  - Treasury NFT's can be minted at **any time** through special mint function: `treasuryMint`
    - Those mints will be deducted from the total treasury mint, so if 50 NFT's are minted to treasury, instead of reserving the last 1200 NFT's, we'll reserve the last 1200-50 = 1150, since 50 were already minted to treasury.
- 4 different types of mints that can only be called if the contract is not paused (`whenNotPaused` modifier)
  - Airdrops
    - Max 7 NFT's per transaction
  - Treasury Mint
    - Max 7 NFT's per transaction
  - Private Mint
    - 2 functions: single mint and batch mint (up to 7)
  - Public Mint
    - 2 functions: single mint and batch mint (up to 7)
- 2 different sales that run independently:
  - Private sale through coupons (only addresses that got previously whitelisted)
    - `onlyDuringOpenedForPrivateSale` modifier
  - Public sale
    - `onlyDuringOpenedForPublicPurchase` modifier
- Whitelist coupons used on private sale
  - If the private sale is open, only users on the whitelist can mint at the current mint price
  - Coupons are generated using a private key in a private server
    - ECDSA algorithm
    - The contract has the public key
    - The coupon consists of a digest including the user's ETH address, an arbitrary number, and the number of NFT's allocated for the coupon
      - The arbitrary number allows the same public ETH address to have multiple coupons, if needed
    - The coupons are stored in our database and when the user mints through the website, we send the coupon's structure (`v`, `r` and `s`), the arbitrary number, and the number of NFT's allocated for the coupon
    - A digest is generated in the contract using the information above
    - The contract has the public key associated with the private key that was used to generate the coupon.
    - We recover the public key from the generated digest and the coupon structure, then check if it matches with the public key that's in the contract (`_couponPublicKey`)
- Contract roles
  - Implemented using [OpenZeppelin's AccessControl](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControl)
  - Roles and permissions:
    - `DEFAULT_ADMIN_ROLE`
      - Grant/Revoke roles
    - `PAUSE_ROLE`
      - Pause/Unpause the contract (purchases)
    - `MINT_OPS_ROLE`
      - Set mint price
      - Open/close the private sale
      - Set max number of mints allowed per wallet during the public sale
    - `PAUSE_MINT_ROLE`
      - Open/close the public sale
    - `GENERAL_OPS_ROLE`
      - Withdraw
      - Set royalty info
      - Enable/Disable the operator filter
      - Set URI
    - `AIRDROP_ROLE`
      - Airdrop
      - Treasury mint
  - Some roles are assigned in the constructor:
      - `DEFAULT_ADMIN_ROLE` is assigned to both the owner and an extra wallet called `adminRoleAddress`
      - An extra wallet called `lowerAdminRoleAddress` will be assigned with all roles, EXCEPT `DEFAULT_ADMIN_ROLE`
- Contract owner
  - Implemented using [OpenZeppelin's Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable)
  - Functions:
    - Lock Contract
      - Locks the URI of the metadata. Once it's called, the URI cannot be set anymore.
    - Has `DEFAULT_ADMIN_ROLE`
      - Grant/Revoke roles
    - Transfer contract's ownership

## Contract Ownership
- By default, the owner account will be the one that deploys the contract. This will be changed with `transferOwnership` to a multisig to secure the NFT Contract. The transfer will occur AFTER setting up the basics like Opensea Collections etc.

## Custom Events Emitted

- `CouponUsed(address user, bytes32 couponHash, uint256 allocationUsed, uint8 couponNumber, uint16 allocation)`
  - Emitted when doing a single purchase using a coupon (`presalePurchase`) or when doing batch purchase using a coupon (`presalePurchaseBatch`)
- `MetadataURIChanged(string baseURI)`
  - Emitted when Base URI is updated: `setURI`

## Functions

### External

- `publicPurchase`
  - `whenNotPaused onlyDuringOpenedForPublicPurchase ensureAvailability(1) withinPublicMintTokenLimit(msg.sender, 1)`
  - Public single purchase
- `publicPurchaseBatch`
  - `whenNotPaused onlyDuringOpenedForPublicPurchase ensureAvailability(quantity) withinPublicMintTokenLimit(msg.sender, quantity)`
  - Public batch purchase of up to 7 NFTs
- `presalePurchase`
  - `whenNotPaused ensureAvailability(1) onlyDuringOpenedForPrivateSale`
  - Private single purchase (only with a valid coupon)
- `presalePurchaseBatch`
  - `whenNotPaused ensureAvailability(amountToMint) onlyDuringOpenedForPrivateSale`
  - Private batch purchase (only with a valid coupon) of up to 7 NFT's
- `checkCouponUsage`
  - Check how many mints were done using a specific coupon
- `airdrop`
  - `whenNotPaused ensureAvailability(qty) onlyRole(AIRDROP_ROLE)`
  - Allow to airdrop up to 7 NFT's to a specific address
- `treasuryMint`
  - `whenNotPaused ensureAvailability(qty) onlyRole(AIRDROP_ROLE)`
  - Allow to mint up to 7 NFT's at a time from the treasury reserve to a specific address
- `withdraw`
  - `onlyRole(GENERAL_OPS_ROLE) nonReentrant`
  - Withdraw the contract's balance to the owner's address
- `setURI`
  - `onlyRole(GENERAL_OPS_ROLE)`
  - Updates the base URI
  - This is important as we'll be using S3 file system first, and migrating to IPFS eventually
  - contractURI and URI (of token) shares this same base URI
- `setMintPrice`
  - `onlyRole(MINT_OPS_ROLE)`
  - Set the current mint price
- `setPublicPurchaseOpened`
  - `onlyRole(PAUSE_MINT_ROLE)`
  - Open/Close the public sale
- `setPrivatePurchaseOpened`
  - `onlyRole(MINT_OPS_ROLE)`
  - Open/Close the private sale
- `setAllowedPublicMintTokenCount`
  - `onlyRole(MINT_OPS_ROLE)`
  - Set max number of mints allowed per wallet during the public sale
- `setOperatorFilteringEnabled`
  - `onlyRole(GENERAL_OPS_ROLE)`
  - Enable/Disable the operator filter

### Public

- `availableTokenCount`
  - Total amount of tokens available to mint
- `tokenCount`
  - Current token count
- `pause`
  - `onlyRole(PAUSE_ROLE)`
  - Pause the contract (all purchases/transactions) in an emergency
- `unpause`
  - `onlyRole(PAUSE_ROLE)`
  - Unpause the contract (all purchases/transactions)
- `setRoyaltyInfo`
  - `onlyRole(GENERAL_OPS_ROLE)`
  - Updates the Royalty Address + Basis Points in case there are changes
- `supportsInterface`
  - Overrides [OpenZeppelin's IERC165](https://docs.openzeppelin.com/contracts/2.x/api/introspection#IERC165-supportsInterface-bytes4-)
- `setApprovalForAll`
  - Overrides [OpenZeppeliln's ERC721.setApprovalForAll](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721-setApprovalForAll-address-bool-)
- `approve`
  - Overrides [OpenZeppelin's ERC721.approve](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721-approve-address-uint256-)
- `transferFrom`
  - Overrides [OpenZeppeln's ERC721.transferFrom](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721-transferFrom-address-address-uint256-)
- `safeTransferFrom`
  - Overrides [OpenZeppeln's ERC721.safeTransferFrom](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721-safeTransferFrom-address-address-uint256-bytes-)
- `safeTransferFrom`
  - Overrides [OpenZeppeln's ERC721.safeTransferFrom](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721-safeTransferFrom-address-address-uint256-bytes-)
- `lockContract`
  - `onlyOwner`
  - Locks the ability to change the URI of the metadata
- `tokenURI`
  - Returns the metadata URI of the specific token id
- `contractURI`
  - Returns contract URI

### Internal

- `nextToken`
  - Get the next radndom token id
  - This is adapted from https://github.com/1001-digital/erc721-extensions/blob/main/contracts/RandomlyAssigned.sol
- `_beforeTokenTransfer`
  - `whenNotPaused`
  - Overrides [OpenZeppelin's ERC721._beforeTokenTransfer](https://docs.openzeppelin.com/contracts/3.x/api/token/erc721#ERC721-_beforeTokenTransfer-address-address-uint256-)
- `_isVerifiedCoupon`
  - Check if a coupon is valid
- `_operatorFilteringEnabled`
  - Override from [ClosedSea OperatorFilterer._operatorFilteringEnabled](https://github.com/Vectorized/closedsea/blob/main/src/OperatorFilterer.sol#L116)
- `_isPriorityOperator`
  - Override from [ClosedSea OperatorFilterer._isPriorityOperator](https://github.com/Vectorized/closedsea/blob/main/src/OperatorFilterer.sol#L123C14-L123C33)

## Tests and Deployment

To compile locally:
`npx hardhat compile`

To run unit tests locally:
`npx hardhat test`

To test on Remix:
`Replace @openzeppelin/contract/ for @openzeppelin/contracts@4.9.3/`

### To deploy on ETHEREUM Goerli

   1. Ensure you've already compiled the contract via `npx hardhat compile`
   2. Ensure .env `BLOCKCHAIN_NET='goerli'` and `SSM_ALCHEMY_API_KEY_NAME="/alchemy/dev/goerli/apikey`
   3. Run `node scripts/create-wallet.js`
   4. Ensure wallet-info.json is created. This wallet will just be used to deploy and discarded after.
   5. Run `node scripts/deploy.js`
   6. Update Deployment's Constructor Variables at this script: `scripts/arguments-verify.js`
   7. Run `npx hardhat verify --constructor-args scripts/arguments-verify.js --network goerli ${contractAddress}` - example: `npx hardhat verify --constructor-args scripts/arguments-verify.js --network goerli 0xC873A5D68259C6d2D9be379bE01c4505fBDD61ea`

### To deploy on ETHEREUM Sepolia

   1. Ensure you've already compiled the contract via `npx hardhat compile`
   2. Ensure .env `BLOCKCHAIN_NET='sepolia'` and `SSM_ALCHEMY_API_KEY_NAME="/alchemy/dev/sepolia/apikey`
   3. Run `node scripts/create-wallet.js`
   4. Ensure wallet-info.json is created. This wallet will just be used to deploy and discarded after.
   5. Run `node scripts/deploy.js`
   6. Update Deployment's Constructor Variables at this script: `scripts/arguments-verify.js`
   7. Run `npx hardhat verify --constructor-args scripts/arguments-verify.js --network sepolia ${contractAddress}` - example: `npx hardhat verify --constructor-args scripts/arguments-verify.js --network sepolia 0xC873A5D68259C6d2D9be379bE01c4505fBDD61ea`

### To deploy on ETHEREUM Mainnet

   1. Ensure you've already compiled the contract via `npx hardhat compile`
   2. Ensure .env `BLOCKCHAIN_NET='homestead'`
   3. Run `node scripts/create-wallet.js`
   4. Ensure wallet-info.json is created. This wallet will just be used to deploy and discarded after.
   5. Run `node scripts/deploy.js`

### Post deployment workflow:
   1. Call `transferOwnership` function of the contract to the final wallet/vault. (Using Initial Owner Wallet)
   2. Grant `DEFAULT_ADMIN_ROLE` to the new owner  (Using Initial Owner Wallet)
   3. RenounceRole `DEFAULT_ADMIN_ROLE` of the previous owner  (Using Initial Owner Wallet)
   4. Call `setRoyaltyInfo` to the new wallet. (Using Lower Admin Wallet)

## MultiSig Ownership

If the owner is a MultiSig wallet, Openzeppelin's Defender will be a good tool to handle it: https://defender.openzeppelin.com/
