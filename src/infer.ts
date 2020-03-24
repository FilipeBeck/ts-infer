import ts from 'typescript'
import { getTsconfig } from 'get-tsconfig'
import 'vanilla-x/Object'

/** Mapa de diagnósticos indexado pelo nome do arquivo. */
const compiledPrograms: Dictionary<ts.Program> = {}

/** Opções de compilação do projeto dependente. */
const dependentCompilerOptions = getTsconfig().config.options.xMutate('noUnusedLocals', false).xMutate('noImplicityReturns', false)

/** Host utilizado na compilção. */
const inferHost: ts.CompilerHost = {
	getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget, _onError?: (message: string) => void) => {
		const sourceText = ts.sys.readFile(fileName);
		return sourceText !== undefined
			? ts.createSourceFile(fileName, disableIgnoreComments(sourceText), languageVersion)
			: undefined;
	},
	getDefaultLibFileName: ts.getDefaultLibFileName,
	writeFile: ts.sys.writeFile,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getDirectories: ts.sys.getDirectories,
	getCanonicalFileName: fileName => ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
	getNewLine: () => ts.sys.newLine,
	useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
	fileExists: ts.sys.fileExists,
	readFile: ts.sys.readFile
}

/**
 * 🇺🇸 Infers the specified typescript function, throwing an exception if there are compilation errors. The `// @ts-ignore` declarations will be removed. This allows the user to enter these directives so that the compiler does not fail to check the test file, but fails in the `infer ()` inference and pass the test when this is expected.
 * 
 * 🇧🇷 Infere a função typescript especificada, disparando uma exceção caso a mesma apresente erros de compilação. As declarações `// @ts-ignore` serão removidas. Isso possibilita que o usuário insira essas diretivas para o compilador não falhar na verificação do arquivo de teste, mas falhar na inferência de `infer()` e passar no teste quando isso for o esperado.
 * 
 * @param closure 🇺🇸 Code snippet to be tested. 🇧🇷 Trecho de código a ser testado.
 * @param compilerOptions 🇺🇸 Build settings. If not provided, use the dependent project file. 🇧🇷 Configurações de compilação. Se não fornecido, usa o arquivo do projeto corrente.
 */
export default function infer(closure: () => void, compilerOptions?: ts.CompilerOptions): void {
	const errors = diagnose(closure, compilerOptions)

	if (errors.length) {
		throw new Error(errors.map(error => error.messageText).join('\n'))
	}
}

/**
 * 🇺🇸 Infers the specified typescript function, returning a list of all errors found. As in `infer`, the `// @ts-ignore` declarations will be removed.
 * 
 * 🇧🇷 Infere a função typescript especificada, retornando uma lista de todos os erros encontrados. Como em `infer`, as declarações de `// @ts-ignore` serão removidas.
 * @param closure 🇺🇸 Code snippet to be tested. 🇧🇷 Trecho de código a ser testado.
 * @param compilerOptions 🇺🇸 Build settings. 🇧🇷 Configurações de compilação. Se não fornecido, usa o arquivo do projeto corrente.
 */
export function diagnose(_closure: () => void, compilerOptions?: ts.CompilerOptions): readonly ts.Diagnostic[] {
	const stack = getStack()
	const [fileName, line, column] = getCodeOrigin(stack)
	const fileContent = ts.sys.readFile(fileName)!
	const code = getIndexesBetweenTokens(['(', ')'], fileContent, [line, column])
	const diagnostics = getDiagnostics(code, fileName, compilerOptions)

	return diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
}

/**
 * Retorna as linhas da pilha de chamada.
 */
function getStack(): string[] {
	try {
		throw new Error()
	}
	catch (error) {
		const stack = error.stack.split('\n') as string[]
		stack.shift()

		return stack
	}
}

/**
 * Retorna o nome do arquivo, linha e coluna do código.
 * @param stack Pilha de chamadas.
 * @throws Não pode ser chamada fora do escopo da função `infer()`.
 */
function getCodeOrigin(stack: string[]): [string, number, number] {
	const inferLine = stack[1]
	const callerLine = stack.find(line => line.search(/at (.*\.)?test/) !== -1)

	if (!inferLine || inferLine.search(/at (.*\.)?diagnose/) === -1) {
		throw new Error('Função sendo chamada fora do escopo do pacote')
	}

	const referencePiece = callerLine && (callerLine.match(/\((.+)\)/) || callerLine.match(/at\s+(.+)/))
	const origin = referencePiece && referencePiece[1].split(':').map((part, i) => i && Number(part) || part) as [string, number, number]

	if (!origin || origin.length !== 3) {
		console.error('Formato inesperado da pilha de chamadas')
		process.exit(1)
	}

	return origin
}

/**
 * Retorna o trecho de código contido entre os tokens especificados.
 * @param tokens Tupla de [$tokenInicial, $tokenFinal].
 * @param content String contendo o código.
 * @param origin Linha e coluna onde a pesquisa deverá começar.
 * @throws Os tokens fornecidos devem existir em pares - quando `tokens = ['(',')']`, `'('.length` deve ser igual à `')'.length`
 */
function getIndexesBetweenTokens(tokens: [string, string], content: string, origin: [number, number]): [number, number] {
	const [open, close] = tokens
	const [line, column] = origin
	let tokenCount = 0
	let begin = 0
	let end = 0
	// TODO: Primeiro pegar substring e só depois concatenar
	begin = content.split('\n').slice(0, line - 1).reduce((sum, line) => sum + line.length + 1, column - 1)
	// content = content.split('\n').slice(line - 1).join('\n').substring(column - 1)

	for (let i = begin, count = content.length; i < count; i++) {
		const digit = content[i]

		if (digit === open) {
			if (!(tokenCount++)) {
				begin = i
			}
		}
		else if (digit === close) {
			end = i
			if (!(--tokenCount)) {
				return [begin, end + 1]
			}
		}
	}

	throw new Error('Tokens não batem')
}

/**
 * Remove os comentários `// @ts-ignore` de `code`.
 * @param code Código a ser formatado.
 */
function disableIgnoreComments(code: string): string {
	return code.replace(/(^\s*\/\/\s*)@ts-ignore(.*)/gm, (_match, prefix, suffix) => prefix + '#ts-ignore' + suffix)
}

/**
 * Verifica se as opções de compilação de `program` são as mesmas de `compilerOptions`.
 * @param program Programa a ser verificado.
 * @param compilerOptions Opções de compilação a ser verificada.
 */
function isSameCompilerOptions(program: ts.Program, compilerOptions: ts.CompilerOptions): boolean {
	const programCompilerOptions = program.getCompilerOptions()

	if (compilerOptions.xKeys.length !== programCompilerOptions.xKeys.length) {
		return false
	}

	for (const key in compilerOptions) {
		if (compilerOptions[key] !== programCompilerOptions[key]) {
			return false
		}
	}

	return true
}

/**
 * Retorna o programa previamente compiado se o mesmo existir e tiver as mesmas opções de compilção, ou cria um novo programa com as opções fornecidas em caso contrário.
 * @param sourceFileName Nome do arquivo fonte.
 * @param compilerOptions Opções de compilação.
 */
function getProgram(sourceFileName: string, compilerOptions: ts.CompilerOptions): ts.Program {
	let program = compiledPrograms[sourceFileName]

	if (!program || !isSameCompilerOptions(program, compilerOptions)) {
		program = compiledPrograms[sourceFileName] = ts.createProgram([sourceFileName], compilerOptions, inferHost)
	}

	return program
}

/**
 * Retorna a lista de diagnósticos encontrados no código especificado. Essa função precisa criar um arquivo temporário no mesmo local para as importações serem bem sucedidas.
 * @param positions Código a ser diagnosticado.
 * @param sourceFileName Caminho do arquivo fonte.
 * @param compilerOptions Opções do compilador. Se não fornecido, usa o arquivo do projeto corrente.
 */
function getDiagnostics(positions: [number, number], sourceFileName: string, compilerOptions = dependentCompilerOptions): readonly ts.Diagnostic[] {
	compilerOptions.noUnusedLocals = false
	compilerOptions.noImplicitReturns = false

	const [start, end] = positions
	const program = getProgram(sourceFileName, compilerOptions)

	return ts.getPreEmitDiagnostics(program).filter(diagnostic => (
		diagnostic.file && diagnostic.file.fileName === sourceFileName &&
		diagnostic.start && diagnostic.start >= start && diagnostic.start + (diagnostic.length || 0) <= end
	))
}