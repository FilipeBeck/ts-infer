import ts from 'typescript'
import fs from 'fs'
import rewire from 'rewire'
import infer, { diagnose } from './infer'
const inferModule = rewire("../app/infer");
const getStack = inferModule.__get__('getStack') as () => string[]
const getFileContent = inferModule.__get__('getFileContent') as (fileName: string) => string
const getCodeOrigin = inferModule.__get__('getCodeOrigin') as (stack: string[]) => [string, number, number]
const getImports = inferModule.__get__('getImports') as (content: string) => string
const getContentBetweenTokens = inferModule.__get__('getContentBetweenTokens') as (tokens: [string, string], content: string, beginIndexes: [number, number]) => string
const removeIgnoreComments = inferModule.__get__('removeIgnoreComments') as (code: string) => string
const getDiagnostics = inferModule.__get__('getDiagnostics') as (code: string) => readonly ts.Diagnostic[]

test('getStack', () => {
	const wrapperCaller6e5bc4931e93496e937a984b66359207 = () => {
		const stack = getStack()
		const isGetStackFirstLine = Boolean(stack[0] && stack[0].includes('at getStack'))
		const isWrapperCallerSecondLine = Boolean(stack[1] && stack[1].includes('at wrapperCaller6e5bc4931e93496e937a984b66359207'))

		expect(isGetStackFirstLine).toBeTruthy()
		expect(isWrapperCallerSecondLine).toBeTruthy()
	}
	
	wrapperCaller6e5bc4931e93496e937a984b66359207()
})

test('getFileContent', () => {
	const fileName = 'getFileContent.test.data'
	const writeContent = `() => {
		alert('Hello infer')
	}`

	fs.writeFileSync(fileName, writeContent, 'utf-8')

	const readContent = getFileContent(fileName)
	const isContentSame = readContent == writeContent

	fs.unlinkSync(fileName)

	expect(isContentSame).toBeTruthy()
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

test('getImports', () => {
	const imports = [
		'import a from \'a\'',
		'  import { b } from \'b\'',
		'import \'c\'',
		' import * as d from \'d\''
	]

	const code = [
		'const x = 10',
		'imports wrong from \'wrong\'',
		imports[0],
		imports[1],
		'console.log("Hello")',
		imports[2],
		imports[3],
		'function foo() {',
		'  return \'foo\'',
		'}',
		'',
		'export { foo }'
	]

	const extractedImports = getImports(code.join('\n'))

	expect(extractedImports).toBe(imports.map(imp => imp + ';').join('\n'))
})

test('getContentBetweenTokes', () => {
	const code = `    (() => {
		interface I1 {
			a: number
			b: string
		}
	})    `

	const trimedCode = code.trim()

	expect(getContentBetweenTokens(['(', ')'], code, [1, 1])).toBe(trimedCode)
	expect(getContentBetweenTokens(['{', '}'], code, [1, 1])).not.toBe(trimedCode)
	expect(() => getContentBetweenTokens(['(', ')'], code, [2, 1])).toThrow()
})

test('getDiagnostics', () => {
	const code1 = `(() => {
		interface Inter {
			a: number
			b: string
		}
		// @ts-ignore
		const inter: Inter = { a: 1, b: "2" }

		return inter
	})`

	const code2 = `(() => {
		interface Inter {
			a: number
			b: string
		}
		//@ts-ignore
		const inter: Inter = { a: 1, b: 2 }
	})`

	expect(getDiagnostics(code1).length).toBe(0)
	expect(getDiagnostics(code2).length).toBeGreaterThan(0)
})

test('removeIgnoreTags', () => {
	const codeBeforeRemove = `
		// Não removido
		const a = 10
		// @ts-ignore
		const b = 20
		// @ts-ignore - texto removido junto
		const c = 30
		// Não removido //@ts-ignore
		// Não removido @ts-ignore
		const d = 40
	`

	const codeAfterRemove = `
		// Não removido
		const a = 10
		const b = 20
		const c = 30
		// Não removido //@ts-ignore
		// Não removido @ts-ignore
		const d = 40
	`

	const removed = removeIgnoreComments(codeBeforeRemove)

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