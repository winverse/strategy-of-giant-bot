// Verification scaffolding, loaded with `bun --preload` by launch.sh only.
// The server reads its config by requiring packages/server/config/development.ts,
// and Joi rejects that file while Telegram and database values are empty. This
// plugin changes only what Bun hands to the server: it keeps the developer's
// real values (the Equibles key), points the database at the throwaway Postgres,
// and puts placeholders in Telegram. The file on disk is never written.
import { readFileSync } from 'node:fs';
import { plugin } from 'bun';

const required = ['VERIFY_PG_PORT', 'VERIFY_PG_DB', 'VERIFY_PG_USER'] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`config-preload: ${key} is not set`);
}

plugin({
  name: 'verify-giants-api-config',
  setup(build) {
    build.onLoad(
      { filter: /\/packages\/server\/config\/development\.ts$/ },
      (args) => {
        const source = readFileSync(args.path, 'utf8');
        const marker = 'export const config =';
        if (source.split(marker).length !== 2) {
          throw new Error(
            `config-preload: expected exactly one "${marker}" in ${args.path}; update this preload to the file's new shape`,
          );
        }
        const override = {
          telegram: {
            token: 'verify-placeholder',
            reading: 'verify-placeholder',
            error: 'verify-placeholder',
          },
          database: {
            provider: 'postgresql',
            host: '127.0.0.1',
            database: process.env.VERIFY_PG_DB,
            port: process.env.VERIFY_PG_PORT,
            userName: process.env.VERIFY_PG_USER,
            password: '',
          },
        };
        const contents = `${source.replace(marker, 'const developerConfig =')}
export const config = { ...developerConfig, ...${JSON.stringify(override)} };
`;
        return { contents, loader: 'ts' };
      },
    );
  },
});
