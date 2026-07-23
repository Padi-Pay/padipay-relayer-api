const bcrypt = require('bcryptjs');
const { createAuthService } = require('../../src/services/auth.service');
const AppError = require('../../src/errors/AppError');
const jwt = require('jsonwebtoken');

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn(),
    })),
  };
});
const { OAuth2Client } = require('google-auth-library');

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({ 
    JWT_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-google-id',
  }),
}));

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    authService = createAuthService({ userRepository: mockUserRepository });
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws AppError if email is already in use', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(authService.register({ email: 'test@test.com', password: 'Password1!' }))
        .rejects
        .toThrow(AppError);
    });

    it('hashes password and registers user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: '1', email: 'test@test.com', password: 'hashedpassword' });
      
      const user = await authService.register({ email: 'test@test.com', password: 'Password1!' });
      
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: expect.any(String)
      });
      expect(user).not.toHaveProperty('password');
      expect(user.id).toBe('1');
    });

    it('creates different hashes for identical passwords', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      let createdHashes = [];
      mockUserRepository.create.mockImplementation(async (data) => {
        createdHashes.push(data.password);
        return { id: '1', ...data };
      });

      await authService.register({ email: 'test1@test.com', password: 'Password1!' });
      await authService.register({ email: 'test2@test.com', password: 'Password1!' });

      expect(createdHashes[0]).not.toEqual(createdHashes[1]);
    });
  });

  describe('login', () => {
    it('throws generic error if email not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      await expect(authService.login({ email: 'notfound@test.com', password: 'Password1!' }))
        .rejects
        .toMatchObject({ message: 'Invalid email or password' });
    });

    it('throws generic error if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('Correct1!', 10);
      mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com', password: hashedPassword });
      
      await expect(authService.login({ email: 'test@test.com', password: 'WrongPassword!' }))
        .rejects
        .toMatchObject({ message: 'Invalid email or password' });
    });

    it('logs in successfully and returns user and token', async () => {
      const hashedPassword = await bcrypt.hash('Correct1!', 10);
      mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com', role: 'USER', password: hashedPassword });
      
      const { user, token } = await authService.login({ email: 'test@test.com', password: 'Correct1!' });
      
      expect(user).not.toHaveProperty('password');
      expect(user.id).toBe('1');
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, 'test-secret');
      expect(decoded.id).toBe('1');
      expect(decoded.role).toBe('USER');
    });
  });

  describe('googleSignIn', () => {
    it('creates new user if email does not exist', async () => {
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({ email: 'new@google.com', name: 'Google User', sub: 'g-123' })
      });
      OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: '2', email: 'new@google.com', googleId: 'g-123', role: 'USER' });

      const { user, token } = await authService.googleSignIn({ idToken: 'valid-token' });

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'new@google.com',
        name: 'Google User',
        googleId: 'g-123',
      });
      expect(user.id).toBe('2');
      expect(token).toBeDefined();
    });

    it('links google account if email exists but no googleId', async () => {
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({ email: 'existing@test.com', name: 'Existing User', sub: 'g-123' })
      });
      OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));
      
      mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'existing@test.com', password: 'hashed' });
      mockUserRepository.update.mockResolvedValue({ id: '1', email: 'existing@test.com', googleId: 'g-123', role: 'USER' });

      const { user, token } = await authService.googleSignIn({ idToken: 'valid-token' });

      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        googleId: 'g-123',
        name: 'Existing User',
      });
      expect(user.id).toBe('1');
      expect(user).not.toHaveProperty('password');
      expect(token).toBeDefined();
    });

    it('throws error if googleId mismatch', async () => {
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({ email: 'existing@test.com', name: 'Existing User', sub: 'g-123' })
      });
      OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));
      
      mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'existing@test.com', googleId: 'g-999' });

      await expect(authService.googleSignIn({ idToken: 'valid-token' }))
        .rejects
        .toMatchObject({ message: 'Google account mismatch' });
    });

    it('throws generic error if token verification fails', async () => {
      const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Invalid token'));
      OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

      await expect(authService.googleSignIn({ idToken: 'invalid-token' }))
        .rejects
        .toMatchObject({ message: 'Invalid Google token' });
    });
  });
});
