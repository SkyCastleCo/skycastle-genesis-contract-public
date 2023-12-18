// SPDX-License-Identifier: MIT
// SkyCastleAI NFTs are governed by the following terms and conditions: https://www.skycastle.ai/nft-terms

pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "closedsea/src/OperatorFilterer.sol";

/**
* @author SkycastleAI Team
* @title Skycastle Genesis NFT
* @custom:security-contact contact@skycastle.ai
*/
contract SCAIGenesis is ERC721, ERC2981, ERC721Enumerable, Ownable, Pausable, AccessControl, ReentrancyGuard, OperatorFilterer {

    error InsufficientValueSent();
    error InvalidCoupon();
    error InvalidTokenId();
    error InvalidSignature();
    error PrivatePurchaseNotOpen();
    error MaxMintReachedForPublicWallet();
    error NoMoreTokensLeft();
    error AllocationExceeded();
    error BatchMintSizeExceeded();
    error TreasuryReservationAllocationExceeded();
    error PublicPurchaseNotOpen();
    error ContractAlreadyLocked();
    error InvalidMaxSupply();
    error InvalidTreasurySupply();

    using Counters for Counters.Counter;
    Counters.Counter private _mintCounter;

    /// Roles Related to Adminstrating this Contract
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant MINT_OPS_ROLE = keccak256("MINT_OPS_ROLE");
    bytes32 public constant GENERAL_OPS_ROLE = keccak256("GENERAL_OPS_ROLE");
    bytes32 public constant AIRDROP_ROLE = keccak256("AIRDROP_ROLE");
    bytes32 public constant PAUSE_MINT_ROLE = keccak256("PAUSE_MINT_ROLE");

    /// Operator Filter Registry Toggle
    bool public operatorFilteringEnabled;

    /// Provenance Hash
    string public PROVENANCE_FIRST_BATCH = "123"; //REMEMBER TO SET

    /// @dev maximum supply possible for Genesis
    uint256 public MAX_SUPPLY; // will be set to 12000

    /// @dev treasury allocation
    uint256 public TREASURY_RESERVATION; // will be set to 1200

    /// @dev counter to track treasury mints
    uint256 public treasuryMints = 0;

    /// @dev mint price will be adjustable
    uint256 public mintPrice = 25000000000000000;

    /// flag for when public purchase allowed
    bool public isPublicPurchaseOpened = false;

    /// flag for when private purchase allowed
    bool public isPrivatePurchaseOpened = false;

    /// flag for when contract is locked
    bool public contractLocked = false;

    // Used for random index assignment
    mapping(uint256 => uint256) private tokenMatrix;

    /// Base URI of the Tokens
    string private _baseUri;

    /// Admin Signer to verify Coupons that will be used during Presale
    address private immutable _couponPublicKey;

    /// Allowed Mint Token Count per Wallet Address
    /// @dev user can own more than alloted amount, just unable to mint more than alloted amount
    uint16 public allowedPublicMintTokenCount = 10;

    /// Tracker to prevent more than alloted public mint count.
    mapping(address => uint256) public publicAddressMintCount;

    /// Tracker to prevent more than alloted presale mint count.
    mapping(bytes32 => uint256) public presaleCouponMintCount;

    /// Priority Sale Coupon to be used on Mints
    struct PrioritySaleCoupon {
        bytes32 r; //ecdsa
        bytes32 s;
        uint8 v;
    }

    /// @dev Modifier to Prevent Public purchase of NFT until after isPublicPurchaseOpened is set to true
    modifier onlyDuringOpenedForPublicPurchase() {
        if (!isPublicPurchaseOpened)
            revert PublicPurchaseNotOpen();
        _;
    }

    /// @dev Modifier to Prevent Presale purchase of NFT until after isPrivatePurchaseOpened is set to true
    modifier onlyDuringOpenedForPrivateSale() {
        if (!isPrivatePurchaseOpened)
            revert PrivatePurchaseNotOpen();
        _;
    }

    /// @dev Check whether another token is still available
    /// @param qty quatity to mint
    modifier ensureAvailability(uint16 qty) {
        if (availableTokenCount() < qty)
            revert NoMoreTokensLeft();
        _;
    }

    /// @param toAddress the address of
    /// @param additionalTokens additional tokens that the user would want to mint
    /// @dev Only allow an address to mint N amount of token per wallet
    modifier withinPublicMintTokenLimit(address toAddress, uint16 additionalTokens) {
        if (((publicAddressMintCount[toAddress] + additionalTokens) > allowedPublicMintTokenCount))
            revert MaxMintReachedForPublicWallet();
        _;
    }

    /// @dev Emitted when the base URI changes
    event MetadataURIChanged(string baseURI);

    /// @dev Emitted when a Coupon has been used
    event CouponUsed(address user, bytes32 couponHash, uint256 allocationUsed, uint8 couponNumber, uint16 allocation);

    constructor(
            string memory _contractURI,
            uint256 _maxSupply,
            uint256 _treasuryReservation,
            address couponPublicKeySigner,
            address adminRoleAddress,
            address lowerAdminRoleAddress
        )
        ERC721("Sky Castle Companions - Genesis", "SCAIG")
    {
        if (_maxSupply > 12000)
            revert InvalidMaxSupply();

        if (_treasuryReservation > 1200)
            revert InvalidTreasurySupply();

        MAX_SUPPLY = _maxSupply;
        TREASURY_RESERVATION = _treasuryReservation;

        //Initialize Admin to Owner first, as owner will always have admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // add another admin role 
        _grantRole(DEFAULT_ADMIN_ROLE, adminRoleAddress);
        // add these 5 roles to lowerAdmin role
        _grantRole(PAUSE_ROLE, lowerAdminRoleAddress);
        _grantRole(PAUSE_MINT_ROLE, lowerAdminRoleAddress);
        _grantRole(MINT_OPS_ROLE, lowerAdminRoleAddress);
        _grantRole(GENERAL_OPS_ROLE, lowerAdminRoleAddress);
        _grantRole(AIRDROP_ROLE, lowerAdminRoleAddress);
        _setDefaultRoyalty(msg.sender, 1000);

        _baseUri = _contractURI;
        _couponPublicKey = couponPublicKeySigner;

        _registerForOperatorFiltering();
        operatorFilteringEnabled = false;
    }

    /// External Methods

    /**
    * @notice Purchase function is used in public sale when it gets opened by SCAI
    * @dev this is dependent on isPublicPurchaseOpened variable for public access
    */
    function publicPurchase() payable external whenNotPaused onlyDuringOpenedForPublicPurchase ensureAvailability(1) withinPublicMintTokenLimit(msg.sender, 1) {
        // Check if the user has sent the required funds
        if (msg.value != mintPrice)
            revert InsufficientValueSent();

        // check treasury
        if ((availableTokenCount() - 1) < (TREASURY_RESERVATION - treasuryMints))
            revert NoMoreTokensLeft();

        publicAddressMintCount[msg.sender]++;
        _safeMint(msg.sender, nextToken());
    }

    /**
    * @notice Batched Purchase function is used in public sale when it gets opened by SCAI
    * @dev this is dependent on isPublicPurchaseOpened variable for public access
    */
    function publicPurchaseBatch(uint16 quantity) payable external whenNotPaused onlyDuringOpenedForPublicPurchase ensureAvailability(quantity) withinPublicMintTokenLimit(msg.sender, quantity) {
        // Check if the user has sent the required funds
        if (msg.value != (mintPrice * quantity))
            revert InsufficientValueSent();

        if (quantity > 7)
            revert BatchMintSizeExceeded();

        // check treasury
        if ((availableTokenCount() - quantity) < (TREASURY_RESERVATION - treasuryMints))
            revert NoMoreTokensLeft();

        publicAddressMintCount[msg.sender] += quantity;
        for(uint16 i = 0 ; i < quantity; ++i) {
            _safeMint(msg.sender, nextToken());
        }
    }


    /**
    * @notice Purchase function is used in presale sale when it gets opened by SCAI
    * @dev this is dependent on presalePurchase variable for presale/priority access
    *
    * @param coupon the Coupon required to mint in a presale
    * @param couponNumber the coupon's number
    * @param allocation the Allocation of amount of Presale to eth address
    */
    function presalePurchase(PrioritySaleCoupon memory coupon, uint8 couponNumber, uint16 allocation) payable external whenNotPaused ensureAvailability(1) onlyDuringOpenedForPrivateSale {
        // Check if the user has the required funds
        if (msg.value != mintPrice)
            revert InsufficientValueSent();

        bytes32 digest = keccak256(
            abi.encode(msg.sender, couponNumber, allocation)
        );

        if(!_isVerifiedCoupon(digest, coupon))
            revert InvalidCoupon();

        if ((presaleCouponMintCount[digest] + 1) > allocation)
            revert AllocationExceeded();

        // check treasury
        if ((availableTokenCount() - 1) < (TREASURY_RESERVATION - treasuryMints))
            revert NoMoreTokensLeft();

        presaleCouponMintCount[digest]++;
        _safeMint(msg.sender, nextToken());

        emit CouponUsed(msg.sender, digest, 1, couponNumber, allocation);
    }

    /**
    * @notice Batch Purchase function is used in presale sale when it gets opened by SCAI
    * @dev this is dependent on presalePurchase variable for presale/priority access
    *
    * @param coupon the Coupon required to mint in a presale
    * @param couponNumber the coupon's number
    * @param allocation the Allocation of amount of Presale to eth address
    * @param amountToMint the amount to mint in this batch transaction
    */
    function presalePurchaseBatch(PrioritySaleCoupon memory coupon, uint8 couponNumber, uint16 allocation, uint16 amountToMint) payable external whenNotPaused ensureAvailability(amountToMint) onlyDuringOpenedForPrivateSale {
        // Check if the user has the required funds
        if (msg.value != (mintPrice * amountToMint))
            revert InsufficientValueSent();

        // Prevent batch minting of more than 7.
        if (amountToMint > 7)
            revert BatchMintSizeExceeded();

        bytes32 digest = keccak256(
            abi.encode(msg.sender, couponNumber, allocation)
        );

        if(!_isVerifiedCoupon(digest, coupon))
            revert InvalidCoupon();

        if ((presaleCouponMintCount[digest] + amountToMint) > allocation)
            revert AllocationExceeded();

        // check treasury
        if ((availableTokenCount() - amountToMint) < (TREASURY_RESERVATION - treasuryMints))
            revert NoMoreTokensLeft();

        presaleCouponMintCount[digest] += amountToMint;
        for(uint i = 0 ; i < amountToMint; ++i) {
            _safeMint(msg.sender, nextToken());
        }

        emit CouponUsed(msg.sender, digest, amountToMint, couponNumber, allocation);
    }

    /**
    * @notice Obtain the usage of a coupon
    * @param couponNumber the coupon's number
    * @param allocation the Allocation of amount of Presale to eth address
    */
    function checkCouponUsage(address couponOwner, uint8 couponNumber, uint16 allocation) external view returns(uint256) {
        bytes32 digest = keccak256(
            abi.encode(couponOwner, couponNumber, allocation)
        );
        return presaleCouponMintCount[digest];
    }

    /**
    * @notice this is for the contract owner to airdrop tokens to specific users.
    * @dev wrapping the safemint function for airdrop
    *
    * @param toAddress //address of eth to send to
    * @param qty //qty to send
    */
    function airdrop(address toAddress, uint16 qty) external whenNotPaused ensureAvailability(qty) onlyRole(AIRDROP_ROLE) {
        if (qty > 7)
            revert BatchMintSizeExceeded();

        // check treasury
        if ((availableTokenCount() - qty) < (TREASURY_RESERVATION - treasuryMints))
            revert NoMoreTokensLeft();

        for(uint i = 0 ; i < qty; ++i) {
            _safeMint(toAddress, nextToken());
        }
    }

    /**
    * @notice this is for the contract owner to mint reserved treasury
    * @dev wrapping the _safemint function for mint treasury
    *
    * @param toAddress //address of eth to send to
    * @param qty //qty to mint
    */
    function treasuryMint(address toAddress, uint16 qty) external whenNotPaused ensureAvailability(qty) onlyRole(AIRDROP_ROLE) {
        if (qty > 7)
            revert BatchMintSizeExceeded();

        if ((qty + treasuryMints) > TREASURY_RESERVATION)
            revert TreasuryReservationAllocationExceeded();

        treasuryMints += qty;
        for(uint i = 0 ; i < qty; ++i) {
            _safeMint(toAddress, nextToken());
        }
    }

    /**
    * @dev Withdraws the amount to owner address
    */
    function withdraw() external onlyRole(GENERAL_OPS_ROLE) nonReentrant
    {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

    /**
    * @dev Updates the base URI that will be used to retrieve metadata.
    * @param _newBaseUri The base URI to be used.
    */
    function setURI(string memory _newBaseUri) external onlyRole(GENERAL_OPS_ROLE) {
        if (contractLocked)
            revert ContractAlreadyLocked();

        _baseUri = _newBaseUri;
        emit MetadataURIChanged(_newBaseUri);
    }

     /**
    * @dev Updates the Mint Price.
    * @param _newMintPriceInWei New Mint Price in Wei
    */
    function setMintPrice(uint256 _newMintPriceInWei) external onlyRole(MINT_OPS_ROLE)
    {
        mintPrice = _newMintPriceInWei;
    }

    /**
    * @dev Set the Public Purchase State for public minting to be possible/impossible
    * @param _isPublicPurchaseOpened true == possible | false == impossible
    */
    function setPublicPurchaseOpened(bool _isPublicPurchaseOpened) external onlyRole(PAUSE_MINT_ROLE)
    {
        isPublicPurchaseOpened = _isPublicPurchaseOpened;
    }

    /**
    * @dev Set the Private Purchase State for public minting to be possible/impossible
    * @param _isPrivatePurchaseOpened true == possible | false == impossible
    */
    function setPrivatePurchaseOpened(bool _isPrivatePurchaseOpened) external onlyRole(MINT_OPS_ROLE)
    {
        isPrivatePurchaseOpened = _isPrivatePurchaseOpened;
    }

    /**
    * @dev Set the allowedPublicMintTokenCount for Maximum Public Mint Token Count per Address.
    * @param _allowedCount // allowed mint count
    */
    function setAllowedPublicMintTokenCount(uint16 _allowedCount) external onlyRole(MINT_OPS_ROLE)
    {
        allowedPublicMintTokenCount = _allowedCount;
    }

    /**
    * @dev Set the Operator Filtering to True/False
    * @param value true/false to toggle Operator Filter
    */
    function setOperatorFilteringEnabled(bool value) external onlyRole(GENERAL_OPS_ROLE) {
        operatorFilteringEnabled = value;
    }

    /// Public Methods

    /// @dev Check whether tokens are still available
    /// @return the available token count
    function availableTokenCount() public view returns (uint256) {
        return MAX_SUPPLY - tokenCount();
    }

    /**
     * @notice Obtain the current token count
     * @return the created token count
     */
    function tokenCount() public view returns (uint256) {
        return _mintCounter.current();
    }

    /**
     * @notice for the pausing of contract in emergencies only
     */
    function pause() public onlyRole(PAUSE_ROLE) {
        _pause();
    }

    /**
     * @notice for the unpausing of contract when emergencies are rectified
     */
    function unpause() public onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    /**
    * @notice Updates the Royalty Amount should situation changes
    * @dev Allows the owner to update the royalty information
    * @param _receiver the receiver of the royalty
    * @param _royaltyFeesInBasisPoints in basis points. ie. 1000 bips = 10%
    */
    function setRoyaltyInfo(address _receiver, uint16 _royaltyFeesInBasisPoints) public onlyRole(GENERAL_OPS_ROLE)
    {
        _setDefaultRoyalty(_receiver, _royaltyFeesInBasisPoints);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
    * @dev See {IERC721-setApprovalForAll}.
    *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    */
    function setApprovalForAll(address operator, bool approved) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
    * @dev See {IERC721-approve}.
    *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    */
    function approve(address operator, uint256 tokenId) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    /**
    * @dev See {IERC721-transferFrom}.
    *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    */
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
    * @dev See {IERC721-safeTransferFrom}.
    *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    */
    function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    /**
    * @dev See {IERC721-safeTransferFrom}.
    *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override(ERC721, IERC721)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
    * @notice For the Permanent Locking the URI of the Contract
    * @dev Make sure Function is called only when URI's metadata has been confirmed to be correct
    */
    function lockContract() public onlyOwner {
        contractLocked = true;
    }

    /**
    * @notice gets the metadata uri of the specific token id. eg. https://public-accessibles.com/skycastle/metadata/genesis/1.json
    * @dev concatenates the baseUri with the tokenId to get the token specific uri
    * @param _tokenId The token id (nft type) of token
    */
    function tokenURI(uint256 _tokenId) override public view returns (string memory) {
        if (_tokenId > MAX_SUPPLY) {
            revert InvalidTokenId();
        }
        return string (
            abi.encodePacked(
                _baseUri,
                Strings.toString(_tokenId),
                ".json"
            )
        );
    }

    /**
    * @notice gets the contract uri of the project. eg. https://public-accessibles.com/skycastle/metadata/genesis/contractMetadata.json
    * @dev concatenates the base uri and contractMetadata.json to derive the contract Uri
    */
    function contractURI() public view returns (string memory) {
        return string (
            abi.encodePacked(
                _baseUri,
                "contractMetadata.json"
            )
        );
    }

    /// Internal Methods

    /**
     * Get the next random token ID
     * Inspired from https://github.com/1001-digital/erc721-extensions/blob/main/contracts/RandomlyAssigned.sol
     * due to block.difficulty changed to prevrandao
     * @dev Randomly gets a new token ID and keeps track of the ones that are still available.
     * @return the next token ID
     */
    function nextToken() internal returns (uint256) {
        uint256 maxIndex = MAX_SUPPLY - tokenCount();
        uint256 random = uint256(keccak256(
            abi.encodePacked(
                msg.sender,
                block.coinbase,
                block.prevrandao,
                block.gaslimit,
                block.timestamp
            )
        )) % maxIndex;

        uint256 value = 0;
        if (tokenMatrix[random] == 0) {
            // If this matrix position is empty, set the value to the generated random number.
            value = random;
        } else {
            // Otherwise, use the previously stored number from the matrix.
            value = tokenMatrix[random];
        }

        // If the last available tokenID is still unused...
        if (tokenMatrix[maxIndex - 1] == 0) {
            // ...store that ID in the current matrix position.
            tokenMatrix[random] = maxIndex - 1;
        } else {
            // ...otherwise copy over the stored number to the current matrix position.
            tokenMatrix[random] = tokenMatrix[maxIndex - 1];
        }

        // Increment counts
        _mintCounter.increment();

        return value;
    }

    /**
     * @dev Hook function that is called before any token transfer.
     *
     * This function is part of the ERC-721 standard and is used to implement additional checks or
     * perform actions before a token transfer occurs.
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
    * @dev check that the coupon sent was signed by the admin signer
    * @param digest hash to recover signer from
    * @param coupon coupon sent from the client to be verified.
    */
    function _isVerifiedCoupon(bytes32 digest, PrioritySaleCoupon memory coupon) internal view returns (bool) {
        address signer = ecrecover(digest, coupon.v, coupon.r, coupon.s);
        if (signer == address(0))
            revert InvalidSignature(); // Added check for zero address

        return (signer == _couponPublicKey);
    }

    /**
    * @dev Override ClosedSea's Operator Filtering
    */
    function _operatorFilteringEnabled() internal view override returns (bool) {
        return operatorFilteringEnabled;
    }

    /**
    * @dev Override ClosedSea's _isPriorityOperator
    */
    function _isPriorityOperator(address operator) internal pure override returns (bool) {
        // OpenSea Seaport Conduit:
        // https://etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        // https://goerli.etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        return operator == address(0x1E0049783F008A0085193E00003D00cd54003c71);
    }
}
