// Quick test to verify all modified backend files load without syntax errors
process.chdir('c:/Users/cosyb/Desktop/chess-tournament-app/backend');

const files = [
  './routes/bot.js',
  './controllers/botController.js',
];

let allOk = true;
files.forEach(f => {
  try {
    require(f);
    console.log('OK:', f);
  } catch (e) {
    allOk = false;
    console.log('ERROR:', f, '-', e.message);
  }
});

console.log(allOk ? '\nALL BACKEND FILES LOAD OK' : '\nSOME BACKEND FILES FAILED');
process.exit(allOk ? 0 : 1);