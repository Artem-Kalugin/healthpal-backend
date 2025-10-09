import { EntityTarget } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { DatabaseEntityUniqueConstraintError } from '../errors/database-entity-unique-constraint.error';
import { DatabaseEntityError } from '../errors/database-entity.error';

export class DatabaseErrorFactory {
  static create(
    entity: EntityTarget<unknown>,
    originalError: QueryFailedError<any>,
  ): DatabaseEntityError {
    if (
      originalError instanceof QueryFailedError &&
      'code' in originalError &&
      originalError.code === '23505' &&
      'detail' in originalError &&
      typeof originalError.detail === 'string'
    ) {
      return new DatabaseEntityUniqueConstraintError(entity, originalError);
    }

    return new DatabaseEntityError(entity, originalError);
  }
}
