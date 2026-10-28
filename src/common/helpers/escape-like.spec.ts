import { escapeLike } from './escape-like';

describe('escapeLike', () => {
  it('экранирует \\, % и _', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });

  it('обычный текст не меняет', () => {
    expect(escapeLike('Иван Петров')).toBe('Иван Петров');
  });
});
