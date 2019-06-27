import ts from 'typescript'
import fs from 'fs'
import rewire from 'rewire'
import infer from './infer'
const inferModule = rewire("../app/infer");
const getStack = inferModule.__get__('getStack') as () => string[]
const getFileContent = inferModule.__get__('getFileContent') as (fileName: string) => string
const getCodeOrigin = inferModule.__get__('getCodeOrigin') as (stack: string[]) => [string, number, number]
const getImports = inferModule.__get__('getImports') as (content: string) => string
const getContentBetweenTokens = inferModule.__get__('getContentBetweenTokens') as (tokens: [string, string], content: string, beginIndexes: [number, number]) => string
const getErrorDiagnostics = inferModule.__get__('getErrorDiagnostics') as (code: string) => readonly ts.Diagnostic[]

test('getStack', () => {
	const stack = getStack()
	const isWellFormed = Boolean(
		stack[0] && stack[0].includes('at getStack') &&
		stack[1] && stack[1].includes('<anonymous>.test')
	)
	expect(isWellFormed).toBeTruthy()
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
	const infer = () => {
		const stack = getStack()
		const [fileName] = getCodeOrigin(stack)
		
		if (fileName != __filename) {
			throw new Error(`${fileName} != ${__filename}`)
		}
	}

	expect(infer).not.toThrow()
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

test('getErrorDiagnostics', () => {
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

	expect(getErrorDiagnostics(code1).length).toBe(0)
	expect(getErrorDiagnostics(code2).length).toBeGreaterThan(0)
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