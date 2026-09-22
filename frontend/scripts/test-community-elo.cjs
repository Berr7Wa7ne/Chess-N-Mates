const assert = require("node:assert/strict");

const seed = (rating) => (!rating || rating <= 0 ? 1000 : Math.round(1000 + rating / 2));

assert.equal(seed(800), 1400, 'rapid 800 -> 1400');
assert.equal(seed(1000), 1500, 'rapid 1000 -> 1500');
assert.equal(seed(null), 1000, 'no rating -> 1000');
console.log('community-elo seed OK');
