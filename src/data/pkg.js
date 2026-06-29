import pkg from '../../package.json' with { type: 'json' }

export default {
  version: pkg.version,
  author: pkg.author,
}