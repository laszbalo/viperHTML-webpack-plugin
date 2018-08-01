const walk = require('acorn/dist/walk')
const templateInfo = require('viperhtml/template-info')('foo')

const PN = "ViperHTMLPlugin" // plugin name

const Module = require('webpack/lib/Module')
const RawModule = require('webpack/lib/RawModule')
const {RawSource} = require('webpack-sources')

const sourceStringForComponent = `module.exports=function() {
	return function() {
		throw new Error('ViperHTML Components are mocked by default, pass in mockComponent: false to the webpack plugin in order to include it in the bundle')
	}
}`

class MockComponentModule extends RawModule {
	constructor(request) {
		super(
			sourceStringForComponent,
			"mocked viperHTML Component " + JSON.stringify(request)
		)
	}
}

function getSourceStringForTemplates(templates) {
	return `module.exports=function() { // TODO: this is fucking ugly
	const T = ${JSON.stringify(templates, null, 2)}
	function TL(t) {
		const k = '_' + t.join('_')
		return T[k] || (T[k] = Object.freeze(transform(t)))
	}
	function transform(template) {
		throw new Error('This template was not parsed yet', template)
	}
	return {
		get(template) {
			return TL(template)
		}
	}
}`
}

class ViperHTMLTemplatesModule extends RawModule {
	constructor(request, templates) {
		super(
			getSourceStringForTemplates(templates),
			"transformed viperHTML templates " + JSON.stringify(request)
		)
	}
}

class ViperHTMLTemplatesModuleFactory {
	constructor(templates, mockComponent) {
		this.templates = templates
		this.mockComponent = mockComponent
	}
	apply(normalModuleFactory) {
		normalModuleFactory.hooks.factory.tap( // TODO: or hooks.module?
			"ViperHTMLTemplatesModuleFactory",
			factory => (data, callback) => {
				// TODO: only match if they are called from the viperhtml module
				if(/template-info/.test(data.request)) {
					return callback(null, new ViperHTMLTemplatesModule(data.request, this.templates))
				}
				if(this.mockComponent && /Component.js/.test(data.request)) {
					return callback(null, new MockComponentModule(data.request))
				}
				return factory(data, callback)
			}
		)
	}
}

class ViperHTMLPlugin {
	constructor(options = {}) {
		this.options = Object.assign({
			compilerHintMark: 'c',
			mockComponent: true
		}, options)
		this.templates = {}
		if(this.options.compilerHintMark === undefined || this.options.compilerHintMark === null) {
			console.warn('You have not passed in a compiler hint mark, the default \'c\' will be used, e.g.: tag/*c*/`some template literal ${\'an interpolation\'}`')
		}
	}
	apply(compiler) {

		// tapping into parsing: https://stackoverflow.com/a/50531944
		compiler.hooks.compilation.tap(PN, (compilation, {normalModuleFactory}) => {
			new ViperHTMLTemplatesModuleFactory(this.templates, this.options.mockComponent).apply(normalModuleFactory)

			const handler = (parser) => {
				parser.hooks.program.tap(PN, (ast, comments) => {


					for(let i = 0; i < comments.length; i++) {
						const {value, start, end, loc} = comments[i]
						const commentText = value.trim()

						if(commentText !== this.options.compilerHintMark) continue
						// found comment equals to compilerHintMark

						const taggedTemplateExpression = walk.findNodeAround(ast, start, 'TaggedTemplateExpression')

						if(!taggedTemplateExpression) continue

						// comment is between a tag function and a template literal
						const {tag, quasi} = taggedTemplateExpression.node

						// check if comment is between the tag and quasi
						if(start < tag.end || quasi.start < end) {
							console.warn('special comment has been found but it is not between a tag function and a template literal')
							// TODO: print more descriptive warning: e.g. filename, row and column number, highlighted snippet, whatnot
							continue
						}

						const strings = []
						const raws = []

						// Flag variable to check if contents of strings and raw are equal
						let isStringsRawEqual = true

						for (const elem of (quasi.quasis)) {
							const { raw, cooked } = elem.value
							const value =
								cooked == null
									? path.scope.buildUndefinedNode()
									: {type: 'StringLiteral', value: cooked}

							strings.push(value)
							raws.push({type: 'StringLiteral', value: cooked})

							if (raw !== cooked) {
							// false even if one of raw and cooked are not equal
								isStringsRawEqual = false
							}
						}

						// TODO: investigate how to deal with raw and cooked literals; right now only handles the cooked ones
						const chunks = strings.map(({value}) => value)

						this.templates['_' + chunks.join('_')] = templateInfo.get(chunks)
					}
				})
			}

			normalModuleFactory.hooks.parser
				.for('javascript/auto')
				.tap(PN, handler)
			normalModuleFactory.hooks.parser
				.for('javascript/dynamic')
				.tap(PN, handler)
			normalModuleFactory.hooks.parser
				.for('javascript/esm')
				.tap(PN, handler)
		})
	}
}

module.exports = ViperHTMLPlugin
