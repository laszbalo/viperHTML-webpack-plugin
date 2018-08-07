# viperHTML-webpack-plugin

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
			intentAttributes: [ /abc/, ... ]
		})
	]
}
```

# Intnet attributes

Intent attributes are attributes, whose value will go through a transform function. This transform function is defined withe define() method at **run-time**. To tell the transpiler this information at *transpile-time*, we have to tell it to the wepback plugin in the form of an array of regular expressions.

# What it does under the hood?
1. It will look for tagged template expressions which are **marked for processing**.
2. Minifies the CSS and HTML found inside the static parts of the found template literals.
3. Determines the types of updates viperHTML needs to apply at run-time.
4. Transpiles the template literals and encodes the update information into the static parts of the literals. Therefore the transpiled literals will contain some rubbish.
5. To run the transpiled literals, an internal dependency of my forked viperHTML module will be replaced by a module which can interpret the transpiled literals.
5. Replaces viperHTML.Component with a mock by default to decrease bundle size.

# TODOs:
- tests
- when encoding updates, make it possible to override the separator ('🔪🦄')
- throw an error if the above sperator is found in the static parts of the template literals
- provide a mocked, ArrayBuffer-based Buffer on request
- investigate what are the effect, if any, of using escapes inside the template literals (row vs cooked template chunks)
