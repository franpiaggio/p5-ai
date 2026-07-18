import { describe, it, expect } from 'vitest';
import { parseStreamContent } from './streamParsing';

describe('parseStreamContent', () => {
  it('returns plain text untouched when there is no code fence', () => {
    expect(parseStreamContent('Just an explanation.')).toEqual({
      chatContent: 'Just an explanation.',
      codeContent: null,
    });
  });

  it('splits explanation and code for a closed fence', () => {
    const content = 'Here you go:\n```javascript\nlet x = 1;\n```\nEnjoy!';
    expect(parseStreamContent(content)).toEqual({
      chatContent: 'Here you go:\n\nEnjoy!',
      codeContent: 'let x = 1;',
    });
  });

  it('treats everything after an unclosed fence as still-streaming code', () => {
    const content = 'Generating:\n```javascript\nfunction setup() {\n  createCa';
    expect(parseStreamContent(content)).toEqual({
      chatContent: 'Generating:',
      codeContent: 'function setup() {\n  createCa',
    });
  });

  it('handles a fence at the very start of the message', () => {
    expect(parseStreamContent('```js\ncircle(1, 2, 3);\n```')).toEqual({
      chatContent: '',
      codeContent: 'circle(1, 2, 3);',
    });
  });

  it('supports typescript fences', () => {
    expect(parseStreamContent('```typescript\nconst n: number = 1;\n```').codeContent).toBe(
      'const n: number = 1;',
    );
  });
});
