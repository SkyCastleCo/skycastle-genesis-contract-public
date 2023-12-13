//SPDX-License-Identifier:UNLICENSED
pragma solidity ^0.8.21;
import "./../SCAIGenesis.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MaliciousPublicPurchaseContract is Ownable{

    SCAIGenesis scaiGen;

    constructor(address _scaiGenAddress){
        scaiGen = SCAIGenesis(_scaiGenAddress);
    }

    function buyNFT()external payable{
        scaiGen.publicPurchase{value:msg.value}();
    }

    function onERC721Received(address , address , uint256 , bytes calldata) external payable returns (bytes4){
        uint amount = scaiGen.mintPrice();
        for(uint i = 0; i < 20; i++){
            if(scaiGen.availableTokenCount() >= 180){
                scaiGen.publicPurchase{value:amount}();
            }
        }
        return this.onERC721Received.selector;
    }
    receive()external payable{}
}