const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
