import { escapeLike } from './escape-like';

describe('escapeLike', () => {
  it('escapes \\, % and _', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeLike('Иван Петров')).toBe('Иван Петров');
  });
});
