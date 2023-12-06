const { keccak_256 } = require('js-sha3');
const fs = require('fs');
const path = require('path');

const MAX_SUPPLY = 2; // set 12000 if all metadata/images are ready. for now its sample

let concatenantedHash = "";

const individualHashesFile = 'individualHashesFile.txt';
// Open a writable stream to the file
const individualHashStream = fs.createWriteStream(individualHashesFile);

for (let characterIndex = 0; characterIndex < MAX_SUPPLY; characterIndex++) {
    const filename = `${characterIndex}.json`;
    const imagename = `${characterIndex}.png`;
    const hash = generateHash(filename, imagename);
    concatenantedHash = `${concatenantedHash}${hash}`;
    console.log(`Processed ${characterIndex}`);
    console.log(`concatenantedHash Length: ${concatenantedHash.length}`);
    // Output the hashes
    individualHashStream.write(`${characterIndex}: ${hash}` + '\n');
}

individualHashStream.end();

fs.writeFileSync(path.join((__dirname + "/../uris/erc721/"), 'concatenantedHash.txt'), concatenantedHash);

const finalHash = `0x${keccak_256(concatenantedHash)}`

fs.writeFileSync(path.join((__dirname + "/../uris/erc721/"), 'finalHash.txt'), finalHash);

function generateHash(filename, imagename) {
    const metadataFile = fs.readFileSync(path.join((__dirname + "/../uris/erc721/"), filename), 'utf-8');
    const imageFile = fs.readFileSync(path.join((__dirname + "/../uris/erc721/"), imagename), 'utf-8');
    // Generate a hash using Ethereum Keccak (SHA-3) compatible algorithm
    const keccakHashMetadata = `0x${keccak_256(metadataFile)}`;
    const keccakHashImagedata = `0x${keccak_256(imageFile)}`;

    const metadataPlusImageCombinedHash = keccakHashMetadata + keccakHashImagedata;
    const combinedKeccakHash = `0x${keccak_256(metadataPlusImageCombinedHash)}`;
    console.log('Keccak Hash (SHA-3):', combinedKeccakHash);
    return combinedKeccakHash;
}






