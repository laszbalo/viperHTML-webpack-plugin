const templateInfo = require('viperhtml/template-info')('foo')

function Handler(regexps = []) {
	return {
		has(target, key) {
			return regexps.some(regexp => regexp.test(key))
		}
	}
}

module.exports = function({types: t}) {
	return {
		visitor: {
			TaggedTemplateExpression(path, state) {
				const { node } = path
				const { tag, quasi} = node
				const {trailingComments} = tag
				const {compilerHintMark = 'c', intentAttributes: _intentAttribures = []} = state.opts
				const intentAttributes = new Proxy({}, Handler(_intentAttribures))
				if(!('compilerHintMark' in state.opts)) {
					console.warn('You have not passed in a compiler hint mark, the default \'c\' will be used')
				}

				// check if there is a comment with the value of the compilerHintMark between the tag and the template literal; e.g. tag/*{compilerHintMark}*/`abc`
				const isMarkedForCompilationAsViperHTMLTemplate = trailingComments &&
					trailingComments.some(({value}) => value.trim() === compilerHintMark)

				if(!isMarkedForCompilationAsViperHTMLTemplate) {
					return
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
							: t.stringLiteral(cooked)

					strings.push(value)
					raws.push(t.stringLiteral(raw))

					if (raw !== cooked) {
					// false even if one of raw and cooked are not equal
						isStringsRawEqual = false
					}
				}

				// TODO: investigate how to deal with raw and cooked literals
				const chunks = strings.map(({value}) => value)

				// NOTE: template is made with transfrom from cooked literals
				function encodeUpdates(template, updates) {
					const result = [template[0]]
					for(let i = 0; i < updates.length; i++) {
						result.push(updates[i] + '🔪🦄' + template[i+1])
					}
					return result
				}

				const processed = templateInfo.get(chunks, intentAttributes)
				const chunksWithUpdates = encodeUpdates(processed.chunks, processed.updates)

				// TODO: investigate the effect of this on the source maps; e.g. is their a better way to replace TemplateElements?
				for (let i = 0; i < quasi.quasis.length; i++) {
					quasi.quasis[i].value.cooked = chunksWithUpdates[i]
					quasi.quasis[i].value.raw = chunksWithUpdates[i]
				}

			},
		}
	}
}
