/**
 * Pass-through Worker so the intilaq deploy is never an empty
 * assets-only script. Static files are served from ./public via ASSETS.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
