const { z } = require('zod');
const { OpenAPIRegistry, OpenApiGeneratorV3 } = require('@asteasolutions/zod-to-openapi');

const registry = new OpenAPIRegistry();

// Define reusable security scheme
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Import existing validation schemas
const authSchemas = require('../validation/schemas/auth.schema');
const escrowSchemas = require('../validation/schemas/escrow.schema');
const usersSchemas = require('../validation/schemas/users.schema');
const walletSchemas = require('../validation/schemas/wallet.schema');

// Register Schemas
registry.register('RegisterPayload', authSchemas.registerSchema.shape.body);
registry.register('LoginPayload', authSchemas.loginSchema.shape.body);
registry.register('GoogleAuthPayload', authSchemas.googleSchema.shape.body);
registry.register('RecoverPasswordPayload', authSchemas.recoverSchema.shape.body);
registry.register('ResetPasswordPayload', authSchemas.resetPasswordSchema.shape.body);

registry.register('UpdateProfilePayload', usersSchemas.updateProfileSchema.shape.body);
registry.register('WithdrawPayload', walletSchemas.withdrawSchema.shape.body);

registry.register('SubmitEscrowPayload', escrowSchemas.submitEscrowSchema.shape.body);
registry.register('CreateEscrowPayload', escrowSchemas.createEscrowSchema.shape.body);

// Reusable standard responses
const ErrorResponse = z.object({
  success: z.boolean().default(false),
  message: z.string(),
  errors: z.array(z.any()).optional(),
});
registry.register('ErrorResponse', ErrorResponse);

const SuccessResponse = z.object({
  success: z.boolean().default(true),
  message: z.string(),
  data: z.any().optional(),
});
registry.register('SuccessResponse', SuccessResponse);

// Document Paths

// AUTH ROUTES
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Authentication'],
  summary: 'Register a new user',
  request: {
    body: {
      content: { 'application/json': { schema: authSchemas.registerSchema.shape.body } }
    }
  },
  responses: {
    201: { description: 'User registered successfully', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Validation error or email exists', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Authentication'],
  summary: 'Login to existing account',
  request: {
    body: {
      content: { 'application/json': { schema: authSchemas.loginSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Login successful', content: { 'application/json': { schema: SuccessResponse } } },
    401: { description: 'Invalid credentials', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/google',
  tags: ['Authentication'],
  summary: 'Authenticate via Google ID token',
  request: {
    body: {
      content: { 'application/json': { schema: authSchemas.googleSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Login successful', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Invalid token', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/forgot-password',
  tags: ['Authentication'],
  summary: 'Request a password reset token',
  request: {
    body: {
      content: { 'application/json': { schema: authSchemas.recoverSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Reset token generated (if user exists)', content: { 'application/json': { schema: SuccessResponse } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/reset-password',
  tags: ['Authentication'],
  summary: 'Reset password using token',
  request: {
    body: {
      content: { 'application/json': { schema: authSchemas.resetPasswordSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Password reset successfully', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Invalid or expired token', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

// USERS ROUTES
registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'User profile retrieved', content: { 'application/json': { schema: SuccessResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'patch',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: usersSchemas.updateProfileSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Profile updated', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

// ACCOUNTS ROUTES
registry.registerPath({
  method: 'get',
  path: '/api/accounts/me',
  tags: ['Accounts'],
  summary: 'Get current account logic status',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Account status retrieved', content: { 'application/json': { schema: SuccessResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

// WALLETS ROUTES
registry.registerPath({
  method: 'get',
  path: '/api/wallets/me',
  tags: ['Wallets'],
  summary: 'Get current managed wallet details',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Wallet retrieved', content: { 'application/json': { schema: SuccessResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'Wallet not found', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/wallets/withdraw',
  tags: ['Wallets'],
  summary: 'Initiate a withdrawal from managed wallet',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: walletSchemas.withdrawSchema.shape.body } }
    }
  },
  responses: {
    200: { description: 'Withdrawal initiated', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Validation error or insufficient funds', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

// RELAYER ROUTES
registry.registerPath({
  method: 'post',
  path: '/api/relayer/submit-escrow',
  tags: ['Relayer'],
  summary: 'Submit an escrow intent',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: escrowSchemas.submitEscrowSchema.shape.body } }
    }
  },
  responses: {
    202: { description: 'Escrow intent tracked successfully', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponse } } },
    500: { description: 'Not implemented or internal error', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/relayer/status/{txId}',
  tags: ['Relayer'],
  summary: 'Get transaction status',
  request: {
    params: z.object({
      txId: z.string().openapi({ description: 'The transaction hash' })
    })
  },
  responses: {
    200: { description: 'Transaction status retrieved', content: { 'application/json': { schema: SuccessResponse } } },
    400: { description: 'Validation error (invalid hash)', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'Transaction not found', content: { 'application/json': { schema: ErrorResponse } } }
  }
});

// HEALTH
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Check API health',
  responses: {
    200: { description: 'API is healthy' }
  }
});

const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'PadiPay Relayer API',
      description: 'API for gasless Stellar Soroban escrow interactions.',
    },
    servers: [{ url: '/' }],
  });
};

module.exports = { generateOpenApiDocument };
