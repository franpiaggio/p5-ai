import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SketchesService } from './sketches.service';
import { Sketch } from './sketch.entity';

describe('SketchesService', () => {
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let service: SketchesService;

  const ownedSketch = {
    id: 'abc123',
    title: 'My sketch',
    code: 'function setup() {}',
    userId: 'owner-1',
  } as Sketch;

  beforeEach(() => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new SketchesService(repo as never);
  });

  describe('ownership enforcement (findOne)', () => {
    it('returns the sketch to its owner', async () => {
      repo.findOne.mockResolvedValue(ownedSketch);
      await expect(service.findOne('abc123', 'owner-1')).resolves.toBe(
        ownedSketch,
      );
    });

    it('throws NotFound when the sketch does not exist', async () => {
      await expect(service.findOne('missing', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws Forbidden when another user requests the sketch', async () => {
      repo.findOne.mockResolvedValue(ownedSketch);
      await expect(service.findOne('abc123', 'attacker-9')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('refuses to update a sketch owned by someone else and never saves', async () => {
      repo.findOne.mockResolvedValue(ownedSketch);
      await expect(
        service.update('abc123', 'attacker-9', { title: 'stolen' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('applies the dto onto the owned sketch and saves it', async () => {
      repo.findOne.mockResolvedValue({ ...ownedSketch });
      const result = await service.update('abc123', 'owner-1', {
        title: 'renamed',
      });
      expect(result.title).toBe('renamed');
      expect(result.code).toBe(ownedSketch.code);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('refuses to delete a sketch owned by someone else', async () => {
      repo.findOne.mockResolvedValue(ownedSketch);
      await expect(service.remove('abc123', 'attacker-9')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deletes an owned sketch', async () => {
      repo.findOne.mockResolvedValue(ownedSketch);
      await service.remove('abc123', 'owner-1');
      expect(repo.remove).toHaveBeenCalledWith(ownedSketch);
    });
  });

  describe('create', () => {
    it('stamps the authenticated userId, ignoring any userId smuggled in the dto', async () => {
      await service.create('owner-1', {
        title: 'new',
        code: 'x',
        userId: 'attacker-9',
      } as never);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1' }),
      );
    });
  });

  describe('public/list projections', () => {
    it('never exposes userId or codeHistory through the public endpoint selection', async () => {
      repo.findOne.mockResolvedValue({
        id: 'abc123',
        title: 't',
        code: 'c',
        isPublic: true,
      });
      await service.findOnePublic('abc123');
      const select = repo.findOne.mock.calls[0][0].select as string[];
      expect(select).not.toContain('userId');
      expect(select).not.toContain('codeHistory');
    });

    it('404s a private sketch on the public endpoint', async () => {
      repo.findOne.mockResolvedValue({
        id: 'abc123',
        title: 't',
        code: 'c',
        isPublic: false,
      });
      await expect(service.findOnePublic('abc123')).rejects.toThrow(
        'Sketch not found',
      );
    });

    it("lists only the caller's sketches without full code payloads", async () => {
      await service.findAllByUser('owner-1');
      const query = repo.find.mock.calls[0][0];
      expect(query.where).toEqual({ userId: 'owner-1' });
      expect(query.select).not.toContain('code');
    });
  });
});
