const { z } = require('zod');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

// Extend Zod globally before any schemas are imported
extendZodWithOpenApi(z);
