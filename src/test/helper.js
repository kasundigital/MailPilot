// Legacy test compatibility: the server now exports its Fastify app
// and only starts listening when executed as the main entrypoint.
// Never rewrite source files during parallel Node test execution.
export function patchServer() { return null; }
export function restoreServer() {}
