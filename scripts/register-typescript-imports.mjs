import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const canRemap =
        error?.code === 'ERR_MODULE_NOT_FOUND' &&
        specifier.startsWith('.') &&
        specifier.endsWith('.js');

      if (!canRemap) throw error;

      const typescriptSpecifier = `${specifier.slice(0, -3)}.ts`;
      try {
        return nextResolve(typescriptSpecifier, context);
      } catch {
        throw error;
      }
    }
  },
});
