import { UsersService } from './users.service';
import { encrypt } from '../common/crypto.util';

const JWT_SECRET = 'test-jwt-secret';

/**
 * Uses the real crypto module against an in-memory fake repository, so these
 * tests catch regressions in the encrypt → store → load → decrypt pipeline,
 * not just in the mapping logic.
 */
describe('UsersService provider keys', () => {
  let stored: { encryptedApiKey: string | null };
  let repo: { findOne: jest.Mock; update: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    stored = { encryptedApiKey: null };
    repo = {
      findOne: jest.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'user-1',
          encryptedApiKey: stored.encryptedApiKey,
        }),
      ),
      update: jest
        .fn()
        .mockImplementation(
          (_id, patch: { encryptedApiKey: string | null }) => {
            stored.encryptedApiKey = patch.encryptedApiKey;
            return Promise.resolve(undefined);
          },
        ),
    };
    const configService = { get: jest.fn().mockReturnValue(JWT_SECRET) };
    service = new UsersService(repo as never, configService as never);
  });

  it('round-trips a provider key through encryption', async () => {
    await service.saveProviderKey('user-1', 'openai', 'sk-openai-123');
    expect(stored.encryptedApiKey).not.toContain('sk-openai-123');
    await expect(service.getProviderKey('user-1', 'openai')).resolves.toBe(
      'sk-openai-123',
    );
  });

  it('keeps keys for multiple providers independently', async () => {
    await service.saveProviderKey('user-1', 'openai', 'sk-openai-123');
    await service.saveProviderKey('user-1', 'anthropic', 'sk-ant-456');
    await expect(service.getProviderKeys('user-1')).resolves.toEqual({
      openai: 'sk-openai-123',
      anthropic: 'sk-ant-456',
    });
  });

  it('clearing a provider key leaves the others intact', async () => {
    await service.saveProviderKey('user-1', 'openai', 'sk-openai-123');
    await service.saveProviderKey('user-1', 'anthropic', 'sk-ant-456');
    await service.clearProviderKey('user-1', 'openai');
    await expect(service.getProviderKeys('user-1')).resolves.toEqual({
      anthropic: 'sk-ant-456',
    });
  });

  it('clearing the last key stores null instead of an encrypted empty map', async () => {
    await service.saveProviderKey('user-1', 'openai', 'sk-openai-123');
    await service.clearProviderKey('user-1', 'openai');
    expect(stored.encryptedApiKey).toBeNull();
  });

  it('returns an empty map for corrupted ciphertext instead of crashing', async () => {
    stored.encryptedApiKey = 'garbage-not-decryptable';
    await expect(service.getProviderKeys('user-1')).resolves.toEqual({});
  });

  it('treats the legacy single-string format as empty', async () => {
    stored.encryptedApiKey = encrypt('sk-legacy-plain-key', JWT_SECRET);
    await expect(service.getProviderKeys('user-1')).resolves.toEqual({});
  });

  it('returns an empty map when the key was encrypted with a different secret', async () => {
    stored.encryptedApiKey = encrypt(
      JSON.stringify({ openai: 'sk-x' }),
      'other-secret',
    );
    await expect(service.getProviderKeys('user-1')).resolves.toEqual({});
  });

  describe('getMaskedProviderKeys', () => {
    it('masks keys down to their last 4 characters', async () => {
      await service.saveProviderKey('user-1', 'openai', 'sk-openai-abcd');
      await expect(service.getMaskedProviderKeys('user-1')).resolves.toEqual({
        openai: '...abcd',
      });
    });

    it('fully masks very short keys', async () => {
      await service.saveProviderKey('user-1', 'openai', 'abcd');
      await expect(service.getMaskedProviderKeys('user-1')).resolves.toEqual({
        openai: '****',
      });
    });
  });
});
