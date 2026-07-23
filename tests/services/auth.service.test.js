const bcrypt = require('bcryptjs');
const { createAuthService } = require('../../src/services/auth.service');
const AppError = require('../../src/errors/AppError');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({ JWT_SECRET: 'test-secret' }),
}));

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    authService = createAuthService({ userRepository: mockUserRepository });
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
});
