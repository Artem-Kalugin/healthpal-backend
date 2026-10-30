import { ErrorCode } from 'src/common/errors/error-code';
import { Region } from 'src/db/enums';
import { Locale } from './locale';
import { parseRequestContext } from './request-context';

/* eslint-disable @typescript-eslint/naming-convention */
describe('parseRequestContext', () => {
  it('reads both headers', () => {
    expect(
      parseRequestContext({ 'accept-language': 'en', 'x-region': 'EU' }),
    ).toEqual({ locale: Locale.EN, region: Region.EU });
  });

  it('defaults to the Russian client without headers', () => {
    expect(parseRequestContext({})).toEqual({
      locale: Locale.RU,
      region: Region.RU,
    });
  });

  it.each([
    ['accept-language', 'ru-RU'],
    ['accept-language', 'EN'],
    ['accept-language', 'en;q=0.8'],
    ['accept-language', ''],
    ['x-region', 'ru'],
    ['x-region', ' RU'],
    ['x-region', 'DE'],
    ['x-region', ''],
  ])('rejects %s: %j', (name, value) => {
    const rejected = () => {
      try {
        parseRequestContext({ [name]: value });
      } catch (error) {
        return error;
      }
    };

    expect(rejected()).toMatchObject({
      code: ErrorCode.INVALID_REQUEST_CONTEXT,
    });
  });
});
