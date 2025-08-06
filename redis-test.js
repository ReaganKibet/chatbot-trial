const { createClient } = require('redis');

const client = createClient({
  url: 'redis://localhost:6379' // or use your full REDIS_URL from .env
});

client.on('error', (err) => console.error('❌ Redis Client Error', err));

async function testRedis() {
  await client.connect();
  console.log('✅ Redis Connected');

  // Test set and get
  await client.set('test_key', 'Hello Redis!');
  const value = await client.get('test_key');
  console.log('🔁 Retrieved value:', value);

  await client.quit();
}

testRedis();
