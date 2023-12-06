const {
    keccak256,
    toBuffer,
    ecsign,
    ecrecover,
    bufferToHex,
    pubToAddress,
} = require("ethereumjs-utils");
const { ethers } = require('ethers');
const keyService = require('./KeyService');

class CouponService {

    /**
     * Coupon constructor
     * @param {string} public_key // If not informed, tries to read from env attributes
     * @param {string} private_key // If not informed, tries to read from env attributes
     * @throws {Error}
     */
    constructor(public_key, private_key) {
        this.public_key = public_key;
        this.private_key = private_key;
        
        if (!this.public_key || !this.private_key) {
            throw new Error('Missing public or private key or both!');
        }

        // Check if the key pair is valid
        if (!keyService.validateKeyPair(this.public_key, this.private_key)) {
            throw new Error('Invalid key pair!')
        }

        // Bufferize the private key
        this.private_key_buffer = Buffer.from(this.private_key, "hex");
    }

    /**
     * Generate a coupon
     * @see https://betterprogramming.pub/handling-nft-presale-allow-lists-off-chain-47a3eb466e44
     * @param {address} address // ETH address
     * @param {int} number // Number of the coupon for this address. It's always 1, unless there's multiple coupons for the same address.
     * @param {int} limit // How many NFTs allowed for this coupon. Must be > 0
     * @throws {Error}
     * @returns {Object} // r and s are hex strings, v is an integer
     */
    generateCoupon(address, number, limit) {
        const hashBuffer = this.generateKeccakHash(address, number, limit);
        const coupon = this._sign(hashBuffer);
        return this._serialize(coupon);
    }

    /**
     * Generates a Keccak Hash from Address + Tier + Limit
     * @param {address} address // ETH address
     * @param {int} number //  Number of the coupon for this address. It's always 1, unless there's multiple coupons for the same address.
     * @param {int} limit // How many NFTs allowed for this coupon. Must be > 0
     * @returns 
     */
    generateKeccakHash(address, number, limit) {
        const userAddress = ethers.getAddress(address);
        return this._generateHashBuffer(
            ["address", "uint256", "uint256"],
            [userAddress, number, limit]
        );
    }

    /**
     * Check if the coupon is valid for the informed address
     * @param {Object} coupon // r and s should be hex strings, v should be an integer
     * @param {address} address // ETH address
     * @param {int} number // Number of the coupon for this address. It's always 1, unless there's multiple coupons for the same address.
     * @param {int} limit // How many NFTs allowed for this coupon. Must be > 0
     * @throws {Error}
     * @returns {Bool}
     */
    validateCoupon(coupon, address, number, limit) {
        const userAddress = ethers.getAddress(address);
        const hashBuffer = this._generateHashBuffer(
            ["address", "uint256", "uint256"],
            [userAddress, number, limit]
        );

        const signerBuffer = ecrecover(hashBuffer, coupon.v, coupon.r, coupon.s);
        const signerPubAddressBuffer = pubToAddress(signerBuffer);
        const pubKeyHex = bufferToHex(signerPubAddressBuffer);

        return (pubKeyHex.toLowerCase() === this.public_key.toLowerCase());
    }

    /**
     * Returns a keccak-256 hash with the coupon information
     * @param {array} typesArray // Types of the data
     * @param {array} valueArray // Values of the data
     * @throws {Error}
     * @returns {Buffer}
     */
    _generateHashBuffer(typesArray, valueArray) {
        // On Solidity should be something like this:
        // bytes32 hashBuffer = keccak256(
        //     abi.encode(
        //         0x7e32fd802c323C79d40552A3Ce6E533c3aaF3c9C, // msg.sender = the user's ETH address
        //         1, // number of the coupont for this address
        //         100 // limit of NFTs for the coupon
        //     )
        // );
        return keccak256(
            toBuffer(
                ethers.AbiCoder.defaultAbiCoder().encode(typesArray, valueArray)
            )
        );
    }

    /**
     * Signs a string using ECDSA algorithm with the private key
     * @param {Buffer} hashBuffer // Buffer of the string to be signed
     * @throws {Error}
     * @returns {Object} // r and s are buffers, and v is an integer
     */
    _sign(hashBuffer) {
        return ecsign(hashBuffer, this.private_key_buffer);
    }

    /**
     * Serialize r and s from the coupon
     * @param {Object} coupon
     * @throws {Error}
     * @returns {Object} // r and s are strings, and v is an integer
     */
    _serialize(coupon) {
        return {
            r: bufferToHex(coupon.r),
            s: bufferToHex(coupon.s),
            v: coupon.v,
        };
    }
}

module.exports = CouponService;
