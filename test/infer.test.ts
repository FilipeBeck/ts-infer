import ts from 'typescript'
import infer, { diagnose, compiledPrograms, dependentCompilerOptions, getStack, getCodeOrigin, getIndexesBetweenTokens, disableIgnoreComments, isSameCompilerOptions, getProgram } from '../src/infer'

test('getStack', () => {
	const wrapperCaller6e5bc4931e93496e937a984b66359207 = () => {
		const stack = getStack()
		const isGetStackFirstLine = Boolean(stack[0] && stack[0].includes('getStack'))
		const isWrapperCallerSecondLine = Boolean(stack[1] && stack[1].includes('at wrapperCaller6e5bc4931e93496e937a984b66359207'))

		expect(isGetStackFirstLine).toBeTruthy()
		expect(isWrapperCallerSecondLine).toBeTruthy()
	}
	
	wrapperCaller6e5bc4931e93496e937a984b66359207()
})

test('getCodeOrigin', () => {
	const diagnose = () => {
		const stack = getStack()
		const [fileName] = getCodeOrigin(stack)
		
		if (fileName != __filename) {
			throw new Error(`${fileName} != ${__filename}`)
		}
	}

	expect(diagnose).not.toThrow()
})

test('getIndexesBetweenTokens', () => {
	const codeToFind = `(() => {
		interface I1 {
			a: number
			b: string
		}
	})`

	const code = `    // Comentário
		const prop = 'Hello'
		console.log(prop)
		 ${codeToFind}    // Outro comentário
		if (prop) {
			
		}
	`

	const start = code.indexOf(codeToFind)
	const end = start + codeToFind.length

	expect(getIndexesBetweenTokens(['(', ')'], code, [4, 1])).toEqual([start, end])
	expect(getIndexesBetweenTokens(['{', '}'], code, [1, 1])).not.toEqual([start, end])
	expect(() => getIndexesBetweenTokens(['(', ')'], code, [6, 1])).toThrow()
})

test('isSameCompilerOptions', () => {
	const program = ts.createProgram([__filename], dependentCompilerOptions)
	const sameCompilerOptions = program.getCompilerOptions().xClone()
	const diffCompilerOptions = sameCompilerOptions.xClone()
	diffCompilerOptions.strict = false

	expect(isSameCompilerOptions(program, sameCompilerOptions)).toBeTruthy()
	expect(isSameCompilerOptions(program, diffCompilerOptions)).toBeFalsy()
})

test('getProgram', () => {
	const diffCompilerOptions = dependentCompilerOptions.xClone()
	diffCompilerOptions.declaration = false

	getProgram(__filename, dependentCompilerOptions) // 1
	getProgram(__filename, dependentCompilerOptions.xClone()) // 1
	getProgram(__filename, diffCompilerOptions) // 2
	getProgram(require.resolve('../src/infer'), dependentCompilerOptions) // 3
	getProgram(require.resolve('../src/infer'), dependentCompilerOptions.xClone()) // 3

	expect(compiledPrograms.xKeys.length).toBe(2)
})

test('disableIgnoreComments', () => {
	const codeBeforeRemove = `
		// Não removido
		const a = 10
		// @ts-ignore
		const b = 20
		// @ts-ignore - mais comentário
		const c = 30
		// Mais comentário //@ts-ignore
		// Mais comentário @ts-ignore
		const d = 40
	`

	const codeAfterRemove = `
		// Não removido
		const a = 10
		// #ts-ignore
		const b = 20
		// #ts-ignore - mais comentário
		const c = 30
		// Mais comentário //@ts-ignore
		// Mais comentário @ts-ignore
		const d = 40
	`

	const removed = disableIgnoreComments(codeBeforeRemove)

	expect(removed).toBe(codeAfterRemove)
})

test('diagnose', () => {
	const diagnostics = diagnose(() => {
		interface Inter {
			a: number
			b: string
		}
		// @ts-ignore
		const inter: Inter = { a: 1, b: 2}
	})

	expect(diagnostics.length).toBe(1)
	expect(diagnostics[0].category).toBe(ts.DiagnosticCategory.Error)
})

test('infer', () => {
	expect(() => infer(() => {
		interface Inter {
			a: number
			b: string
		}
		// @ts-ignore
		const inter: Inter = { a: 1, b: '2' }
		return inter
	})).not.toThrow()

	expect(() => infer(() => {
		interface Inter {
			a: number
			b: string
		}
		// @ts-ignore
		let inter: Inter = { a: 1, b: 2 }
		// @ts-ignore
		inter = { a: {}, b: 2 }
		return inter
	})).toThrow()
})