const { resolve } = require('path');

module.exports = (options, webpack) => {
  return {
    ...options,
    externals: {
      'better-sqlite3': 'commonjs better-sqlite3',
      'bcrypt': 'commonjs bcrypt',
    },
    resolve: {
      ...options.resolve,
      alias: {
        '@3letras': resolve(__dirname, '../../libs/src'),
      },
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            '@nestjs/microservices',
            '@nestjs/platform-express',
            'cache-manager',
            'class-validator',
            'class-transformer',
          ];
          if (!lazyImports.includes(resource)) return false;
          try {
            require.resolve(resource);
            return false;
          } catch {
            return true;
          }
        },
      }),
    ],
  };
};
