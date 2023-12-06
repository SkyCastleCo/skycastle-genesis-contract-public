//
// This script should NOT be executed in any server.
// If you need to generate more coupons, you should add the CORRECT private key to .env and
// run the script LOCALLY. If you don't know what private key is the correct one, DON'T DO IT!
// 
const args = require('yargs')
    .options({
        'address': {
            string: true
        }
    }).argv;
const { ethers } = require('ethers');
const fs = require("fs");
const { parse } = require("csv-parse");
const { CouponStatus } = require('../enum');
const CouponService = require('../services/CouponService');
const CouponServiceInstance = new CouponService();

validateArgs();

// Generate a single coupon
if (args.address) singleCoupon();
// Generate from CSV file
else csvCoupon();

// Single coupon generation
async function singleCoupon() {
    console.log(`Address: ${args.address}`);
    console.log(`Number: ${parseInt(args.number)}`);
    console.log(`Limit: ${parseInt(args.max_nfts)}`);
    console.log(`Status: ${args.status} (${CouponStatus.get(args.status)})\n`);

    console.log(`Generating coupon...`);
    const coupon = CouponServiceInstance.generateCoupon(args.address, parseInt(args.number), parseInt(args.max_nfts));
    console.log(`Coupon generated:`);
    console.log(coupon);
    console.log(``);

    console.log(`Validating coupon...`);
    const isValid = CouponServiceInstance.validateCoupon(coupon, args.address, parseInt(args.number), parseInt(args.max_nfts));
    console.log(`Valid = ${isValid}\n`);
}

async function csvCoupon() {
    (async () => {
        // Generate from the CSV
        let success = 0;
        let errors = 0;

        const parser = fs.createReadStream(args.csv)
            .pipe(
                parse({
                    ltrim: true,
                    rtrim: true,
                    from_line: 2,
                    skip_empty_lines: true
                })
            );

        for await (const row of parser) {
            const address = row[0];
            const number = parseInt(row[1]);
            const limit = parseInt(row[2]);
            const status = (isNaN(row[3]) ? CouponStatus.get(row[3]) : CouponStatus.get(parseInt(row[3])));

            console.log(`Address: ${address}`);

            if (isNaN(number) || number === 0) {
                console.log(`ERROR: invalid number: ${row[1]}\n`);
                errors++;
            } else if (isNaN(limit) || limit === 0) {
                console.log(`ERROR: invalid limit: ${row[2]}\n`);
                errors++;
            } else if (!status) {
                console.log(`ERROR: invalid status: ${row[3]}\n`);
                errors++;
            } else {
                console.log(`Number: ${number}`);
                console.log(`Limit: ${limit}`);
                console.log(`Status: ${row[3]} (${status.value})`);
                
                try {
                    const coupon = CouponServiceInstance.generateCoupon(address, number, limit);
                    console.log(`Coupon: ${JSON.stringify(coupon)}`);
                    success++;
                } catch (e) {
                    console.log(`ERROR: ${e.message}\n`);
                    errors++;
                }
            }
        }

        console.log(`TOTAL COUPONS GENERATED: ${success}`);
        console.log(`TOTAL ERRORS: ${errors}`);
    })();
}

// Validate all the arugments and show the help message if needed
function validateArgs() {
    if (args.sos) sos();
    if (args.address) {
        if (!args.number) sos('You must pass --number with --address');
        if (isNaN(args.number)) sos('--number must be a number greater than 0');
        if (!args.max_nfts) sos('You must pass --max_nfts with --address');
        if (isNaN(args.max_nfts)) sos('--max_nfts must be a number greater than 0');
        if (!CouponStatus.get(args.status)) sos('Invalid status!');
        try {
            ethers.getAddress(args.address);
        } catch (e) {
            sos('Invalid ETH address!');
        }
    } else {
        if (!args.csv) sos('You must pass either --csv OR --address --number --max_nfts --status');
        if (!fs.existsSync(args.csv)) sos(`File ${args.csv} not found!`);
    }
}

// Help funtion
function sos(errorMessage) {
    const helpString = [
        "Coupon generator to whitelist ETH addresses",
        "Usage: npm run generate-coupons -- [--sos] [--dont_save] [--csv=<path>] [--address=<eth_address> --number=<number> --max_nfts=<max_nfts> --status=<status>]",
        "",
        "Options:",
        "\t--sos",
        "\t  This help",
        "",
        "\t--csv=<path>",
        "\t  Read the addresses to generate the coupons from the file in <path>",
        "\t  First line of the CSV will be ignored",
        "\t  Delimiter MUST be comma, because its a C(omma)SV file... duh!",
        "\t  It should have 4 columns: <address>, <number>, <max_nfts>, <status>",
        "\t  <address> is the ETH address",
        "\t  <number> 1, unless there's multiple coupons for the same address",
        "\t  <max_nfts> the max nfts this coupon is allowed to mint",
        "\t  <status> see below for possible values",
        "\t  This option will be IGNORED if --address is present",
        "",
        "\t--address=<eth_address> --number=<number> --max_nfts=<max-nfts> --status=<status>",
        "\t  Generate a coupon number <number> for the <eth_address> with a limit of <max-nfts> NFTs with the status <status>",
        "\t  These options will IGNORE --csv option (if present)",
        "",
        "\t<status> Must be an integer OR the name of the status (canse sensitive):",
    ];

    CouponStatus.enums.forEach( (item) => {
        helpString.push(`\t         ${item.key} = ${item.value}`);
    });

    helpString.push("");

    helpString.push("");

    if (errorMessage) console.log(`ERROR: ${errorMessage}\n`);

    helpString.forEach((line) => console.log(line));

    process.exit(1);
}
