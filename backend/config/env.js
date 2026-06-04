const path = require('path');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, quiet: true });
}
