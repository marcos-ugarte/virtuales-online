const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

function makeConfig(device, isProd, isFirst, noMap) {
  const isA9 = device === "a9";
  const suffix = isA9 ? ".a9" : "";

  return {
    name: device,

    entry: isA9
      ? ["./client/src/a9-polyfill.js", "./client/src/main.ts"]
      : "./client/src/main.ts",

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: `[name]${suffix}.[contenthash].js`,
      publicPath: "./",
      // Only the first config in a combined build cleans dist/
      clean: isFirst,
    },

    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
      alias: {
        // "client/assets/*" must be declared before "client/*" so it wins the match.
        "client/assets": path.resolve(__dirname, "client/assets"),
        client: path.resolve(__dirname, "client/src"),
        common: path.resolve(__dirname, "common/src"),
        assets: path.resolve(__dirname, "client/assets"),
        // rtclib is a local pre-built CommonJS package
        rtclib: path.resolve(__dirname, "rtclib/dist/index.js"),
        settings: path.resolve(__dirname, "client/settings"),
      },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "ts-loader",
            options: { transpileOnly: true },
          },
          exclude: /node_modules/,
        },
        // A9: transpile node_modules to ES2017 — Chrome 72 doesn't support ??, ?., class fields.
        // A11: skip — Android 11 WebView supports ES2020+ natively.
        ...(isA9 ? [{
          test: /\.m?js$/,
          include: /node_modules/,
          type: "javascript/auto", // force webpack 5 to treat .mjs as plain JS so Babel can process it
          use: {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              presets: [
                ["@babel/preset-env", {
                  targets: { chrome: "72" },
                  useBuiltIns: false,
                }],
              ],
            },
          },
        }] : []),
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource",
          generator: {
            filename: (pathData) => {
              const rel = path
                .relative(path.resolve(__dirname, "client/assets"), pathData.filename)
                .replace(/\\/g, "/");
              return `assets/${rel}`;
            },
          },
        },
        {
          test: /\.(otf|ttf|woff2?)$/i,
          type: "asset/resource",
          generator: {
            filename: "assets/fonts/[name][ext]",
          },
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: "./client/index.html",
        filename: isA9 ? "index_9.html" : "index_11.html",
        inject: "body",
      }),

      new webpack.DefinePlugin({
        webpackConfig: JSON.stringify({ buildTime: Date.now() }),
      }),

      // Copy assets only once (with the first config) to avoid duplicate work
      ...(isFirst ? [new CopyWebpackPlugin({
        patterns: [
          { from: "client/assets", to: "assets" },
          { from: "favicon.ico", to: "favicon.ico", noErrorOnMissing: true },
        ],
      })] : []),
    ],

    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: isA9
            ? { ecma: 2017, compress: { ecma: 2017, passes: 2 }, output: { ecma: 2017 } }
            : { ecma: 2020, compress: { ecma: 2020, passes: 2 }, output: { ecma: 2020 } },
        }),
      ],
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      },
    },

    devtool: noMap ? false : isProd ? "source-map" : "cheap-module-source-map",

    devServer: {
      static: "./dist",
      hot: true,
      port: 3000,
    },
  };
}

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";
  const device = env && env.device;
  const noMap = !!(env && env.nomap);

  if (device === "a9")  return makeConfig("a9",  isProd, true,  noMap);
  if (device === "a11") return makeConfig("a11", isProd, true,  noMap);

  // No --env device: build both.
  // A11 runs first and cleans dist/, A9 runs second and appends its files.
  return [makeConfig("a11", isProd, true, noMap), makeConfig("a9", isProd, false, noMap)];
};
