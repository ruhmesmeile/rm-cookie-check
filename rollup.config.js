/* Rollup plugins */
import alias from '@rollup/plugin-alias';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';

/* Packages */
import autoprefixer from 'autoprefixer';
import config from 'sapper/config/rollup.js';
import path from 'path';
import pkg from './package.json';
import { scss, postcss } from 'svelte-preprocess';

/* Assignments */
const legacy = !!process.env.SAPPER_LEGACY_BUILD;
const mode = process.env.NODE_ENV;
const dev = mode === 'development';

const dedupe = importee => importee === 'svelte' || importee.startsWith('svelte/');
const onwarn = (warning, onwarn) => (warning.code === 'CIRCULAR_DEPENDENCY' && /[/\\]@sapper[/\\]/.test(warning.message)) || onwarn(warning);

const aliasconfig = {
   resolve: ['.js', '.mjs', '.html', '.svelte', '.scss'],
   entries:[{ find: '~', replacement: path.join(__dirname, './src') }]
};

const preprocess = [
   scss({ sourceMap: false }),
   postcss({ plugins: [ autoprefixer ] })
];

const replaceconfig = {
   'process.browser': true,
   'process.env.NODE_ENV': JSON.stringify(mode),
   'pkg.version': JSON.stringify(pkg.version)
};

/* Config */
export default {

	client: {
		input: config.client.input(),
		output: config.client.output(),
      onwarn,
		plugins: [
         alias(aliasconfig),
         commonjs(),
			replace(replaceconfig),
         resolve({ browser: true, dedupe }),
			svelte({
				dev,
				hydratable: true,
				emitCss: true,
            preprocess
			}),

			legacy && babel({
            exclude: ['node_modules/@babel/**'],
				extensions: ['.js', '.mjs', '.html', '.svelte'],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					['@babel/plugin-transform-runtime', {
						useESModules: true
					}]
				],
            presets: [['@babel/preset-env']],
            runtimeHelpers: true,
			}),

			!dev && terser({ module: true, numWorkers: 1 })
		],
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
      onwarn,
		plugins: [
         alias(aliasconfig),
         commonjs(),
			replace({...replaceconfig, 'process.browser': false}),
         resolve({ dedupe }),
			svelte({
            dev,
				generate: 'ssr',
            preprocess
			})
		],
		external: Object.keys(pkg.dependencies).concat(
			require('module').builtinModules || Object.keys(process.binding('natives'))
		),
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
      onwarn,
		plugins: [
         alias(aliasconfig),
         commonjs(),
			replace(replaceconfig),
         resolve(),
			!dev && terser({ numWorkers: 1 })
		]
	}
};