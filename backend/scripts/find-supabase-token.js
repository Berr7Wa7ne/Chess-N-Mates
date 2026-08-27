const keytar = require('keytar');

async function main() {
  const services = [
    'Supabase CLI',
    'supabase',
    'Supabase Access Token',
    'supabase-cli',
  ];
  for (const service of services) {
    for (const account of ['supabase', 'access-token', process.env.USERNAME || '']) {
      try {
        const pwd = await keytar.getPassword(service, account);
        if (pwd) {
          console.log(`Found token via service="${service}" account="${account}" (length ${pwd.length})`);
          return pwd;
        }
      } catch {
        /* ignore */
      }
    }
  }
  console.log('No token found in keytar');
}

main();
