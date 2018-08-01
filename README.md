# viperHTML-webpack-plugin

WIP

NOTE: this plugin only works with my [fork](https://github.com/laszbalo/viperHTML/tree/standalone-template-info) of viperHTML

# Why does this plugin exist?
Wanted to use viperHTML/hyperHTML inside a service worker, but viperHTML is intended for Node.js (node specific dependencies for CSS and HTML parsing), and found the recommended hyperHTML+basicHTML combo too heavyweight (~150kB).

Using this plugin in tandem with my fork, I could recreate [hyperSW](https://github.com/WebReflection/hyperSW) to use viperHTML instead. The result is [*viper*SW](https://github.com/laszbalo/viperSW). The bundled viperHTML module only weighs ~6-7 kB.

# How to use it?

```javascript
// templates.js

// MARK tagged template expression for processing with a comment containing the character 'c'. (configurable, can be any string)
wire()/*c*/`<h1>Hello ${'Bob'}!</h1>`


// webpack.config.js
module.exports = {
	target: 'webworker',
	plugins: [
		new require('viperHTML-webpack-plugin')({
			compilerHintMark: 'c', // optional, could be any string; when building for production Uglify will remove this
			mockComponent: true // default true
			// mockBuffer: true // coming!
			// intentAttributes: [ /abc/, ... ] // probably ...
		})
	]
}
```

# What it does?
1. It will look for tagged template expressions which are **marked for processing**.
2. Minifies the CSS and HTML found inside the static parts of the found template literals.
3. Determines the types of updates viperHTML needs to apply at run-time.
4. Replaces an internal viperHTML module which is responsible for parsing and minification with one that contains all the necessry information that is required for viperHTML to build the template instances at run-time.
5. Replaces viperHTML.Component with a mock by default to decrease bundle size.

# TODOs:
- support intentAttributes
- provide a mocked, ArrayBuffer-based Buffer on request
- properly handle template literals (row vs cooked)
- improved code generation: right now for each unminified HTML chunk, I store the minified chunk + its concatenation inside the generated module, which is clearly not ideal. Luckily I don't have too many templetes right now.
