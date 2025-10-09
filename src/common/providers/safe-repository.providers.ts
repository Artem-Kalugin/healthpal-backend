import { Provider } from '@nestjs/common';
import { DataSource, ObjectType, QueryFailedError } from 'typeorm';
import { Repository, DeepPartial, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { getEntityRepository } from '../helpers/get-entity-repository';
import { DatabaseErrorFactory } from '../factories/database-entity-error.factory';

type EntityClass<T> = ObjectType<T>;

export interface SafeRepository<T extends ObjectLiteral> extends Repository<T> {
  safeSave(payload: T): Promise<T>;
  safeUpdate(id: string | number, payload: DeepPartial<T>): Promise<T>;
}

export const crudWithErrorsExtension = {
  async safeSave<T extends ObjectLiteral>(this: Repository<T>, payload: T) {
    try {
      return await this.save(payload);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw DatabaseErrorFactory.create(this.target, error);
      }
      throw error;
    }
  },
  async safeUpdate<T extends ObjectLiteral>(
    this: Repository<T>,
    id: string | number,
    payload: DeepPartial<T>,
  ) {
    try {
      const entity = await this.preload({ id, ...payload });
      if (!entity) {
        throw new NotFoundException('Данные не найдены');
      }
      return await this.save(entity);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw DatabaseErrorFactory.create(this.target, error);
      }
      throw error;
    }
  },
};

export function createSafeRepository<T extends ObjectLiteral>(
  repository: Repository<T>,
): SafeRepository<T> {
  return repository.extend(crudWithErrorsExtension);
}

export const createSafeRepositoryProviders = (
  entities: EntityClass<unknown>[],
): Provider[] => {
  return entities.map(entity => ({
    provide: getEntityRepository(entity.name),
    useFactory: (dataSource: DataSource) =>
      createSafeRepository(dataSource.getRepository(entity)),
    inject: [DataSource],
  }));
};
