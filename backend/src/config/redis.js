const Redis = require('ioredis');

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
  });

  redis.on('error', (err) => {
    console.warn('Redis connection error (cache disabled):', err.message);
  });
} else {
  // Fallback no-op client when Redis is not configured
  redis = {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    setex: async () => null,
  };
  console.warn('REDIS_URL not set — caching disabled');
}

module.exports = redis;
