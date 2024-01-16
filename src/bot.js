const ethers = require("ethers");
const chalk = require("chalk");
const fs = require("fs");
const CONTRACT_ABI = require("../config/abi.json");
require("dotenv").config();

const PrivateKey = process.env.PrivateKey;
const contractAddress = process.env.contractAddress;
const receiveAddress = process.env.recieveAddress;
const HttpProvider = process.env.HttpProvider;
const WssProvider = process.env.WssProvider;

const gasLimit = ethers.BigNumber.from(process.env.gasLimit);
const gasPrice = process.env.GasPrice;

const provider = new ethers.providers.WebSocketProvider(WssProvider);
const wallet = new ethers.Wallet(PrivateKey);
const myAddress = wallet.address;
const account = wallet.connect(provider);
provider.removeAllListeners();

var botContract = new ethers.Contract(contractAddress, CONTRACT_ABI, account);

let currentNonce = 0;

async function getNonce(addr) {
  const nonce = await provider.getTransactionCount(addr);
  return nonce;
}

async function getTokenBalance(tokenAddress, address, provider) {
  const abi = [
    {
      name: "balanceOf",
      type: "function",
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
      ],
      outputs: [
        {
          name: "balance",
          type: "uint256",
        },
      ],
      constant: true,
      payable: false,
    },
  ];

  const contract = new ethers.Contract(tokenAddress, abi, provider);
  const balance = await contract.balanceOf(address);
  return balance;
}

async function start() {
  currentNonce = await getNonce(myAddress);

  console.log(chalk.yellow(`\n Listen...\n`));

  let status;

  while (true) {
    status = await botContract.presaleStatus();

    if (status == 2) {
      
      console.log("status : " + status + "\n");

      const withdraw_tx = await botContract
        .purchaseICOCoin({
          gasLimit: gasLimit,
          gasPrice: ethers.utils.parseUnits(`${gasPrice}`, "gwei"),
        })
        .catch((err) => {
          console.log(err);
          console.log("withdraw transaction failed...");
        });

      await withdraw_tx.wait();

      console.log(chalk.yellow("Withdraw successful...\n"));

      let balance = await provider.getBalance(myAddress);

      console.log("balance : " + balance + "\n");

      let strEther = (ethers.utils.formatEther(balance) - 0.1).toString();

      await account.sendTransaction({
        to: receiveAddress,
        value: ethers.utils.parseEther(strEther),
      });

      console.log(chalk.red("Transfer successful..."));
      return;
    }
    await sleep(1000);
  }
}

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

start();
