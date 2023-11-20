require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
const { ETHERSCAN_API_KEY, GOERLI_ALCHEMY_API_KEY, REPORT_GAS, SEPOLIA_ALCHEMY_API_KEY } = require('./config');

module.exports = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY
    }
  },
  networks: {
    goerli: {
      chainId: 5,
      url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_ALCHEMY_API_KEY}`,
    },
    sepolia: {
      chainId: 11155111,
      url: `https://eth-sepolia.g.alchemy.com/v2/${SEPOLIA_ALCHEMY_API_KEY}`,
    }
  },
  gasReporter: {
    enabled: (REPORT_GAS) ? true : false, // will give report if REPORT_GAS environment variable is true
    currency: 'USD'
  }
};
