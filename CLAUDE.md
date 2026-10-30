# HealthPal backend

NestJS + TypeORM + PostgreSQL + Redis. Пакетный менеджер pnpm. Обзор и запуск: `README.md`.

## Тесты

- Для e2e и integration нужны тестовые Postgres и Redis: `pnpm test:db:up`.
- Полный прогон: `pnpm test:all`. Гонять одним процессом: два параллельных `jest` на одну тестовую БД мешают друг другу.
- Каждый e2e/int-спек закрывает Redis и приложение в `afterAll`, иначе jest не выходит. Временные спеки в `test/e2e` попадают под `testRegex` и запускаются в `test:all`, не оставлять их там.

## DTO и сериализация

- Валидация на class-validator. Переход на zod рассмотрен и отклонён. Пилот (appointment на `nestjs-zod`) остался коммитом `e77967c`, ветка удалена. Достать: `git checkout e77967c`. Если не понадобится, убрать это упоминание после 10 ноября 2026.
- Глобальный `ClassSerializerInterceptor` работает в режиме белого списка (`excludeExtraneousValues`): у каждого публичного поля response-DTO должен быть `@Expose()`, иначе оно вырежется из ответа. В request-DTO `@Expose` не нужен.
- Ошибки валидации отдаются как `{ statusCode: 400, code: 'VALIDATION_FAILED', validation: { поле: [{ code, params? }] } }`, клиент локализует по `code`. Коды и форма параметров: `ValidationCode` и `ValidationParameters` в `src/common/errors/validation-code.ts`, каталог для клиента `agents/error-catalog.md`. Значения `ValidationCode` менять нельзя без согласования с клиентом.
- В DTO `message` с текстом не пишем: опции правил строит `rule(ValidationCode.X, { limit })` (код идёт в `message`, параметры в `context`), лимит берётся из одной константы с аргументом декоратора. Правила с параметрами (`MinLength`, `Max` и т. п.) всегда через `rule()`, иначе клиент получит `INVALID_VALUE` без значения. Пароль при создании и смене: `@IsPassword()` (`src/common/validators`), на входе политику не проверяем. Свои составные декораторы добавлять в `additionalDecorators` в `eslint.config.mjs`.
- Описывать в Swagger надо то, что реально отдаёт эндпоинт. Если ответ неполный, делать отдельный DTO, а не обещать полный.

## Ошибки

- Ошибки приложения бросаем как `new AppException(ErrorCode.X, { message?, cause?, clientCode? })` (`src/common/errors`), `*Exception('текст')` из Nest не используем. Любой ответ с ошибкой имеет вид `{ statusCode, code }` (у валидации ещё `validation`), текста в ответе нет: `message` и `cause` только для лога.
- Новый код добавляется в `ErrorCode` и в `ERROR_STATUS` (без статуса не соберётся) и в `agents/error-catalog.md`. Статус отдельным аргументом не задаётся: он берётся по коду, который уходит клиенту. Значения `ErrorCode` менять нельзя без согласования с клиентом.
- Если внутренняя причина должна отличаться от клиентской, `code` для лога, `clientCode` для ответа (`ErrorCode.INTERNAL_ERROR` скрывает причину целиком). Разные внутренние ситуации с одним клиентским кодом различаются `message`, отдельный код не заводим.
- Единственный глобальный `AppErrorFilter` (`@Catch()`) приводит к этому формату всё: `AppException`, ошибки БД, прочие `HttpException` (код по статусу) и неизвестные ошибки (500 `INTERNAL_ERROR`, стек в логе).
- `UserNotFoundException` (`src/domain/users/exceptions`, наследник `AppException`) не баг и не недоделка, в `new AppException(ErrorCode.X)` не переводить. Вызывающие (`auth.service.ts`, `jwt.strategy.ts`) выбирают ветку через `instanceof UserNotFoundException` (логин: неверные данные вместо 404, JWT: 401), другого способа отличить «пользователя нет» от прочих ошибок нет. Отдельный класс заводим только в таком случае, когда вызывающему нужна своя ветка.
- Тесты сервисов проверяют `toMatchObject({ code: ErrorCode.X })`, не класс исключения. В `@Api*Response` в `description` начинать с кода.

## Контроллеры

- Авторизация: `@Authenticated()` на класс (JWT + завершённая регистрация + `ApiBearerAuth`), другой этап: `@Authenticated(AuthGuardsByRegistration.X)`. Глобальный guard без `@Public()` или этапа регистрации падает, так что забытая защита заметна сразу.
- Id пользователя: `@CurrentUserId() userId: string`, не `@Req()`.
- Ответ: `@ApiSerialized(Dto, { isArray?, description?, created?, swaggerType? })` вместо пары `@ApiOkResponse` + `@SerializeOptions`. `created: true` для POST, которые отдают 201 (по умолчанию в Nest так и есть), `swaggerType` для пагинации (в Swagger `PaginatedResponseDto<Dto>`, сериализуем динамическим классом). Плагин swagger ищет `@ApiOkResponse` в тексте метода и обёртку не видит, поэтому POST без `created: true` получит в доке лишний 201. Если ответ без сериализации, остаётся обычный `@ApiOkResponse`.
- Декоратор-обёртка над ответом регистрируется в `additionalCustomApiResponseDecorators` в `eslint.config.mjs` (правило `api-method-should-specify-api-response`).

## Swagger / OpenAPI

- Подключён CLI-плагин `@nestjs/swagger`. Пустые `@ApiProperty()` не писать: тип, обязательность и ограничения class-validator плагин берёт сам. Декоратор нужен для `description`, `example`, `enum`/`enumName`, `type`, `isArray`.
- Плагин обрабатывает только `*.dto.ts` и `*.entity.ts` и не видит поля с вычисляемым именем (`[expr]: T`): для них `@ApiProperty` обязателен.
- Дамп OpenAPI для сравнения до/после снимать из настоящей сборки (`nest build`), а не через ts-jest: в нём плагин теряет `$ref` на классы из других файлов.
- Версия UI Scalar закреплена через `cdn` в `src/main.ts`, при обновлении менять вручную.
- Сервер за ngrok перезапускать после смены зависимостей, иначе отдаёт старую версию.

## База данных (Drizzle, идёт переезд с TypeORM)

- Ветка `feat/drizzle-migration`. Drizzle `0.45.x` закреплён, rc/beta не берём. Схема в `src/db/schema.ts`, подключение через `DbModule` (токен `DB`), миграции в `drizzle/` (`drizzle-kit generate`, затем `drizzle-kit migrate`). `casing: 'snake_case'` стоит и в `drizzle()`, и в `drizzle.config.ts`.
- Запросы пишутся в сервисе. Большой или переиспользуемый запрос выносится функцией в `*.queries.ts` рядом, не в класс. Классов-репозиториев по умолчанию нет, заводить только при реальной причине.
- Условие связи двух таблиц (join по FK) лежит у домена со стороны FK (`centerOfDoctor` в `doctor.queries.ts`), остальные домены импортируют его, а не переписывают. Запрос под сценарий лежит у домена, чей это сценарий, и переезжает к владельцу таблицы только когда нужен двум и более потребителям.
- Сырой SQL только как ``sql`...` `` фрагмент внутри билдера, ссылаться на колонки через схему, не строками.
- Имена ограничений (FK, unique, check, pk) задаются только через enum `Constraint` (`src/db/constraints.ts`), строковые литералы в схеме, коде и тестах не писать. Публичные коды ошибок (`ErrorCode`, клиент локализует по ним) отделены от имён ограничений: связь лежит в `CONSTRAINT_CODES` в `src/common/errors/app-error.filter.ts`. Значения `ErrorCode` менять нельзя без согласования с клиентом; ограничения без записи в мапе клиенту уходят как `INTERNAL_ERROR`.
- Ошибка драйвера: `DrizzleQueryError`, код Postgres, `constraint` и `table` лежат в `cause`. Ошибки БД в HTTP превращает один глобальный фильтр, не слой данных.
- `numeric` читается строкой (`rating`), `date`/`time` строками. Не менять без правки DTO и тестов.
- Переменные и параметры слоя данных называются `db` (исключение в `unicorn/prevent-abbreviations` в `eslint.config.mjs`), тип `Database`, токен DI `DB`.
- TS-enum'ы доменов лежат в `src/db/enums.ts` (схема строит pgEnum из них), DTO импортируют оттуда, не из `src/entities`.
- Пока идёт переезд, приложение между этапами может не собираться: TypeORM-код не дорабатываем.
- `drizzle-kit push` интерактивен при конфликте с чужими типами в БД. Тестовую БД перед этим пересоздавать (`DROP SCHEMA public CASCADE` и заново `docker/postgres/init.sql`).

## Прочее

- `agents/` в `.gitignore`: рабочие заметки и аудиты, в git не попадают. План переезда на Drizzle: `agents/orm-analysis.md` (идёт первым, TypeORM не дорабатываем); упрощения общей схемы: `agents/complexity-audit.md`, пункты, завязанные на TypeORM, не выполняются.
- Сиды (`src/seeds`, `*.seed`) не коммитить и не предлагать коммитить: много весят, владелец не хочет публиковать данные. При переезде их нужно переписать под Drizzle.
- Если `CLAUDE.md` расходится с `agents/orm-analysis.md`, прав `orm-analysis.md`; поправить `CLAUDE.md`.
