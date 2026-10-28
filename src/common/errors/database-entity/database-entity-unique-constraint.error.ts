import { EntityTarget, QueryFailedError } from 'typeorm';
import { DatabaseEntityError } from './database-entity.error';
import { getNotUniqueErrorText } from '../../helpers/decorators/not-unique-error-metadata.decorator';

export class DatabaseEntityUniqueConstraintError extends DatabaseEntityError {
  constructor(
    entity: EntityTarget<unknown>,
    originalError: QueryFailedError & Record<'detail', unknown>,
  ) {
    super(entity, originalError, 409);
    this.message = 'Данные не уникальны';

    if (typeof originalError.detail !== 'string') {
      return;
    }

    const start = originalError.detail.indexOf('(');
    const end = originalError.detail.indexOf(')=', start);
    const field =
      start !== -1 && end !== -1
        ? originalError.detail.slice(start + 1, end).replaceAll('"', '')
        : 'field';
    if (!(
      field &&
      typeof entity === 'function' &&
      entity.prototype &&
      typeof entity.prototype === 'object'
    )) {
      return;
    }

    this.message =
      getNotUniqueErrorText(entity.prototype as object, field) ??
      'Данные не уникальны';
  }
}
