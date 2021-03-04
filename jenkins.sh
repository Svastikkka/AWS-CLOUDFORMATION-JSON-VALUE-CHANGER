#$repo $workspace
echo "Installing require components"
npm i --save-dev @types/node
npm i
echo "Compiling require components"
tsc ./src/aws-cloud-formation.ts
node ./src/aws-cloud-formation.js -u ${username} -p "${password}" -w "${choice}" -c "${CheckoutBranch}" -n "${NewBranch}" ;
