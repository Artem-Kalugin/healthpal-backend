import { EntityTarget } from 'typeorm';

export class DatabaseEntityError extends Error {
  public readonly entity: EntityTarget<unknown>;
  public readonly originalError: unknown;
  public readonly status: number;

  constructor(
    entity: EntityTarget<unknown>,
    originalError: unknown,
    status = 500,
  ) {
    super('Ошибка работы с базой данных');

    this.entity = entity;
    this.originalError = originalError;
    this.status = status;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
