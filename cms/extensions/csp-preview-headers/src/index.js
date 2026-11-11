import { defineHook } from '@directus/extensions-sdk';

const previewOrigins = [
  'http://127.0.0.1:4175',
  'http://localhost:4175',
  'http://0.0.0.0:4175',
  'http://172.21.8.169:4175'
];

function addSources(header, sources) {
  const value = String(header || '');
  const additions = sources.filter((source) => !value.includes(source));
  return additions.length ? `${value} ${additions.join(' ')}`.trim() : value;
}

export default defineHook(({ init }) => {
  init('app.before', ({ app }) => {
    app.use((_req, res, next) => {
      const current = res.getHeader('Content-Security-Policy');
      if (current) {
        const directives = String(current).split(';').map((directive) => directive.trim());
        const update = (name) => {
          const index = directives.findIndex((directive) => directive.startsWith(`${name} `));
          if (index >= 0) directives[index] = addSources(directives[index], previewOrigins);
        };
        update('form-action');
        update('child-src');
        res.setHeader('Content-Security-Policy', directives.join(';'));
      }
      next();
    });
  });
});
