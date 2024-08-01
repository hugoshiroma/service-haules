const dotenv = require('dotenv');

let ENV_FILE_NAME = '';
switch (process.env.NODE_ENV) {
  case 'production':
    ENV_FILE_NAME = '.env.production';
    break;
  case 'staging':
    ENV_FILE_NAME = '.env.staging';
    break;
  case 'test':
    ENV_FILE_NAME = '.env.test';
    break;
  case 'development':
  default:
    ENV_FILE_NAME = '.env';
    break;
}

try {
  dotenv.config({ path: process.cwd() + '/' + ENV_FILE_NAME });
} catch (e) {}

//PROD
const ADMIN_CORS =
  process.env.ADMIN_CORS || 'https://service-haules.vercel.app';

const STORE_CORS =
  process.env.STORE_CORS || 'https://service-haules.vercel.app';
// LOCAL
// // CORS when consuming Medusa from admin
// const ADMIN_CORS =
//   process.env.ADMIN_CORS || 'http://localhost:7000,http://localhost:7001';

// // CORS to avoid issues when consuming Medusa from a client
// const STORE_CORS = process.env.STORE_CORS || 'http://localhost:8000';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://localhost/medusa-starter-default';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: `@medusajs/file-local`,
    options: {
      upload_dir: 'uploads',
    },
  },
  {
    resolve: '@medusajs/admin',
    /** @type {import('@medusajs/admin').PluginOptions} */
    options: {
      serve: true,
      autoRebuild: true,
      backend: 'https://service-haules.vercel.app',
      path: '/app',
      outDir: 'build',
      develop: {
        open: true,
        host: 'service-haules.vercel.app',
        logLevel: 'error',
        stats: 'normal',
        allowedHosts: 'auto',
        webSocketURL: undefined,
      },
    },
  },
  {
    resolve: `@rsc-labs/medusa-store-analytics`,
    options: {
      enableUI: true,
    },
  },
  {
    resolve: 'medusa-file-github',
    options: {
      owner: process.env.CDN_GITHUB_OWNER,
      repo: process.env.CDN_GITHUB_REPO,
      path: 'public/uploadedProducts',
      github_token: process.env.CDN_GITHUB_TOKEN,
      branch: process.env.CDN_GITHUB_BRANCH,
    },
  },
];

const modules = {
  /*eventBus: {
    resolve: "@medusajs/event-bus-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },
  cacheService: {
    resolve: "@medusajs/cache-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },*/
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwt_secret: process.env.JWT_SECRET || 'supersecret',
  cookie_secret: process.env.COOKIE_SECRET || 'supersecret',
  store_cors: STORE_CORS,
  database_url: DATABASE_URL,
  admin_cors: ADMIN_CORS,
  auth_cors: process.env.AUTH_CORS,
  // Uncomment the following lines to enable REDIS
  // redis_url: REDIS_URL
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  plugins,
  modules,
};
