import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Focused unit coverage for the account-lockout logic added in the auth
// brute-force hardening. The happy/sad login paths are also exercised by the
// API smoke test (backend/test/app.e2e-spec.ts).
describe('AuthService — account lockout', () => {
  let service: AuthService;
  let usersService: { findByUsername: jest.Mock };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-horse', 10);
  });

  beforeEach(() => {
    usersService = { findByUsername: jest.fn() };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    service = new AuthService(
      jwt as unknown as JwtService,
      usersService as unknown as UsersService,
      config as unknown as ConfigService,
    );
    usersService.findByUsername.mockResolvedValue({
      id: '1',
      email: 'admin@localhost',
      name: 'Admin',
      password: passwordHash,
    });
  });

  const attempt = (password: string) => service.login('admin', password);

  it('locks the account after 5 failed attempts, even with the right password', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(attempt('wrong')).rejects.toThrow('Invalid username or password');
    }
    await expect(attempt('correct-horse')).rejects.toThrow(
      'Too many failed attempts. Try again later.',
    );
  });

  it('resets the failure counter after a successful login', async () => {
    await expect(attempt('wrong')).rejects.toThrow(); // 1 failure
    await expect(attempt('correct-horse')).resolves.toMatchObject({
      accessToken: 'signed-token',
    });
    // Counter cleared: four more wrong tries stay under the threshold.
    for (let i = 0; i < 4; i++) {
      await expect(attempt('wrong')).rejects.toThrow('Invalid username or password');
    }
    await expect(attempt('correct-horse')).resolves.toMatchObject({
      accessToken: 'signed-token',
    });
  });

  it('releases the lock once the window passes', async () => {
    const base = 1_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(base);
    for (let i = 0; i < 5; i++) {
      await expect(attempt('wrong')).rejects.toThrow('Invalid username or password');
    }
    await expect(attempt('correct-horse')).rejects.toThrow(
      'Too many failed attempts. Try again later.',
    );

    nowSpy.mockReturnValue(base + 15 * 60_000 + 1);
    await expect(attempt('correct-horse')).resolves.toMatchObject({
      accessToken: 'signed-token',
    });
    nowSpy.mockRestore();
  });

  it('counts unknown usernames toward the lockout too', async () => {
    usersService.findByUsername.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await expect(attempt('whatever')).rejects.toThrow('Invalid username or password');
    }
    await expect(attempt('whatever')).rejects.toThrow(
      'Too many failed attempts. Try again later.',
    );
  });

  it('locks per (username, IP) so one IP cannot lock the account elsewhere', async () => {
    // Attacker IP exhausts its attempts and gets locked.
    for (let i = 0; i < 5; i++) {
      await expect(service.login('admin', 'wrong', '10.0.0.1')).rejects.toThrow(
        'Invalid username or password',
      );
    }
    await expect(service.login('admin', 'wrong', '10.0.0.1')).rejects.toThrow(
      'Too many failed attempts. Try again later.',
    );
    // The real admin, on a different IP, is unaffected and logs in fine.
    await expect(service.login('admin', 'correct-horse', '192.168.1.5')).resolves.toMatchObject({
      accessToken: 'signed-token',
    });
  });
});
