const fs = require('fs')
const path = require('path')
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
	return {
		get(template) {

			// decode updates
			const info = template.reduce(({chunks, updates}, c) => {
				const parts = c.split('🔪🦄')
				chunks.push(parts[parts.length - 1])
				if(parts.length > 1) {
					const updateParts = parts[0].split(',')
					updateParts[0] = Number.parseInt(updateParts[0], 10)
					updates.push(updateParts.length === 1 ?
						updateParts[0]:
						updateParts
					)
				}
				return {chunks, updates}
			}, {chunks: [], updates: []})

			console.log('i', info)

			if(info.chunks.length - 1 !== info.updates.length) throw new Error('template was not pre-processed, you might have forgotten to mark it with /*c*/')

			return info
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
			mockComponent: true,
			intentAttributes: []
		}, options)
		this.templates = {}
		if(this.options.compilerHintMark === undefined || this.options.compilerHintMark === null) {
			console.warn('You have not passed in a compiler hint mark, the default \'c\' will be used, e.g.: tag/*c*/`some template literal ${\'an interpolation\'}`')
		}

		this._babelLoaderPath = fs.readdirSync(path.resolve('node_modules')).includes('babel-loader')
			? 'babel-loader'
			: __dirname + '/node_modules/babel-loader'

	}
	apply(compiler) {

		// tapping into parsing: https://stackoverflow.com/a/50531944
		compiler.hooks.compilation.tap(PN, (compilation, {normalModuleFactory}) => {
			new ViperHTMLTemplatesModuleFactory(this.templates, this.options.mockComponent).apply(normalModuleFactory)

			normalModuleFactory.hooks.afterResolve
				.tapAsync(PN, (data, callback) => {
				const targetTypes = [
					'javascript/auto',
					'javascript/dynamic',
					'javascript/esm'
				]
				if(targetTypes.includes(data.type)) {
					data.loaders.push({
						loader: this._babelLoaderPath,
						options: {
							plugins: [
								[
									__dirname + '/babel-plugin.js',
									{
										compilerHintMark: this.options.compilerHintMark,
										intentAttributes: this.options.intentAttributes
									}
								]
							]
						}
					})
				}
				callback(null, data)
			})
		})
	}
}

module.exports = ViperHTMLPlugin
