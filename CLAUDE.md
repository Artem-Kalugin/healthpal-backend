# HealthPal backend

NestJS + Drizzle ORM + PostgreSQL + Redis. Package manager: pnpm. Overview and setup: `README.md`.

## Language

- No Russian in code or docs: identifiers, comments, test titles, commit messages, `CLAUDE.md`, `agents/*` notes. Write everything in English. Exception: `seed/`
- If you come across Russian in code while working, translate it to English once the task is done. Stay within the task: translate only the files you touched or read for it, and do not let it pull you away from the main work.

## Comments

- Comments are optional. Write one only for what the code cannot say: the reasoning, a constraint, a non-obvious trade-off or a pitfall. Do not explain what the code does, names and structure should do that.
- If you come across comments that only narrate the code (or dangling ones, like `// I1` markers), delete them once the task is done. Same scope rule as for Russian: only the files you touched or read for the task, and do not let it pull you away from the main work.

## Tests

- e2e and integration tests need test Postgres and Redis: `pnpm test:db:up`.
- Full run: `pnpm test:all`. Run it in a single process: two parallel `jest` runs against one test DB interfere with each other.
- Every e2e/int spec closes Redis and the app in `afterAll`, otherwise jest does not exit. Temporary specs in `test/e2e` match `testRegex` and run in `test:all`, do not leave them there.

## DTOs and serialization

- Validation uses class-validator.
- The global `ClassSerializerInterceptor` runs in whitelist mode (`excludeExtraneousValues`): every public field of a response DTO must have `@Expose()`, otherwise it is stripped from the response. Request DTOs do not need `@Expose`.
- Validation errors are returned as `{ statusCode: 400, code: 'VALIDATION_FAILED', validation: { field: [{ code, params? }] } }`, the client localizes by `code`. Codes and parameter shapes: `ValidationCode` and `ValidationParameters` in `src/common/errors/validation-code.ts`, client catalog in `agents/error-catalog.md`. `ValidationCode` values must not change without agreeing with the client.
- No text `message` in DTOs: rule options are built with `rule(ValidationCode.X, { limit })` (the code goes into `message`, parameters into `context`), and the limit comes from the same constant as the decorator argument. Rules with parameters (`MinLength`, `Max`, etc.) always go through `rule()`, otherwise the client gets `INVALID_VALUE` without the value. Password on create and change: `@IsPassword()` (`src/common/validators`), the policy is not checked on input (login). Add your own composite decorators to `additionalDecorators` in `eslint.config.mjs`.
- Swagger must describe what the endpoint actually returns. If the response is partial, make a separate DTO instead of promising the full one.

## Errors

- Throw application errors as `new AppException(ErrorCode.X, { message?, cause?, clientCode? })` (`src/common/errors`), do not use Nest's `*Exception('text')`. Every error response has the shape `{ statusCode, code }` (validation adds `validation`), there is no text in the response: `message` and `cause` are for the log only.
- A new code is added to `ErrorCode`, to `ERROR_STATUS` (it will not compile without a status) and to `agents/error-catalog.md`. The status is not passed as a separate argument: it is derived from the code sent to the client. `ErrorCode` values must not change without agreeing with the client.
- If the internal cause must differ from the client-facing one, `code` is for the log and `clientCode` for the response (`ErrorCode.INTERNAL_ERROR` hides the cause entirely). Different internal situations with the same client code are told apart by `message`, do not add a separate code.
- The single global `AppErrorFilter` (`@Catch()`) brings everything to this shape: `AppException`, DB errors, other `HttpException`s (code by status) and unknown errors (500 `INTERNAL_ERROR`, stack in the log).
- `UserNotFoundException` (`src/domain/users/exceptions`, extends `AppException`) is not a bug or an unfinished job, do not convert it to `new AppException(ErrorCode.X)`. Callers (`auth.service.ts`, `jwt.strategy.ts`) pick the branch via `instanceof UserNotFoundException` (login: invalid credentials instead of 404, JWT: 401), there is no other way to tell "no such user" from other errors. A dedicated class is created only in such a case, when the caller needs its own branch.
- Service tests assert `toMatchObject({ code: ErrorCode.X })`, not the exception class. In `@Api*Response` start the `description` with the code.

## Controllers

- Authorization: `@Authenticated()` on the class (JWT + completed registration + `ApiBearerAuth`), another stage: `@Authenticated(AuthGuardsByRegistration.X)`. The global guard fails without `@Public()` or a registration stage, so forgotten protection is noticed immediately.
- User id: `@CurrentUserId() userId: string`, not `@Req()`.
- Response: `@ApiSerialized(Dto, { isArray?, description?, created?, swaggerType? })` instead of the `@ApiOkResponse` + `@SerializeOptions` pair. `created: true` for POSTs that return 201 (the Nest default), `swaggerType` for pagination (`PaginatedResponseDto<Dto>` in Swagger, serialized with a dynamic class). The swagger plugin looks for `@ApiOkResponse` in the method text and does not see the wrapper, so a POST without `created: true` gets an extra 201 in the docs. If the response is not serialized, a plain `@ApiOkResponse` stays.
- A decorator wrapping the response is registered in `additionalCustomApiResponseDecorators` in `eslint.config.mjs` (rule `api-method-should-specify-api-response`).

## Swagger / OpenAPI

- The `@nestjs/swagger` CLI plugin is enabled. Do not write empty `@ApiProperty()`: the plugin takes the type, optionality and class-validator constraints itself. The decorator is needed for `description`, `example`, `enum`/`enumName`, `type`, `isArray`.
- The plugin only processes `*.dto.ts` and does not see fields with a computed name (`[expr]: T`): `@ApiProperty` is mandatory for them.
- Take the OpenAPI dump for before/after comparison from a real build (`nest build`), not through ts-jest: there the plugin loses `$ref` to classes from other files.
- The Scalar UI version is pinned via `cdn` in `src/main.ts`, change it manually when updating.
- Restart the server behind ngrok after changing dependencies, otherwise it serves the old version.

## Database (Drizzle)

- Drizzle `0.45.x` is pinned, no rc/beta. Schema in `src/db/schema.ts`, connection through `DbModule` (token `DB`), migrations in `drizzle/` (`pnpm db:generate` creates, `pnpm db:migrate` applies; in Docker migrations run before start). `casing: 'snake_case'` is set both in `drizzle()` and in `drizzle.config.ts`.
- Queries are written in the service. A large or reusable query is extracted as a function into a neighbouring `*.queries.ts`, not into a class. There are no repository classes by default, add one only for a real reason.
- The join condition of two tables (join by FK) lives with the domain on the FK side (`centerOfDoctor` in `doctor.queries.ts`), other domains import it instead of rewriting it. A scenario-specific query lives with the domain that owns the scenario, and moves to the table owner only when two or more consumers need it.
- Raw SQL only as a ``sql`...` `` fragment inside the builder, reference columns through the schema, not by strings.
- Constraint names (FK, unique, check, pk) are set only through the `Constraint` enum (`src/db/constraints.ts`), do not write string literals in the schema, code or tests. Public error codes (`ErrorCode`, the client localizes by them) are separate from constraint names: the link is `CONSTRAINT_CODES` in `src/common/errors/app-error.filter.ts`. `ErrorCode` values must not change without agreeing with the client; constraints without an entry in the map reach the client as `INTERNAL_ERROR`.
- Driver error: `DrizzleQueryError`, the Postgres code, `constraint` and `table` are in `cause`. DB errors become HTTP in one global filter, not in the data layer.
- `numeric` is read as a string (`rating`), `date`/`time` as strings. Do not change without updating DTOs and tests.
- Variables and parameters of the data layer are named `db` (an exception in `unicorn/prevent-abbreviations` in `eslint.config.mjs`), the type is `Database`, the DI token is `DB`.
- Domain TS enums live in `src/db/enums.ts` (the schema builds pgEnum from them), DTOs import from there.
- The DB schema is applied by migrations. `drizzle-kit push` only for the test DB: it is interactive on conflict with foreign types, recreate the DB before it (`DROP SCHEMA public CASCADE` and then `docker/postgres/init.sql` again).

## Misc

- `agents/` is the project memory for agent artifacts: handoffs, plans, analyses, the client error catalog. It is in `.gitignore`, nothing there goes to git. if you asked to save new handoffs, plans and analyses - save them there. 
- Do not commit seeds (`src/seeds`, `*.seed`) and do not suggest committing them: they are heavy, and the owner does not want to publish the data.
- When asked to commit, put everything in `git status` into one commit unless told otherwise.
