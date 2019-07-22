import fs from 'fs'
import ts from 'typescript'
import { getTsconfig } from 'get-tsconfig'

/**
 * Infere a função typescript especificada, disparando uma exceção caso a mesma apresente erros de compilação. As declarações `// @ts-ignore` serão removidas. Isso possibilita que o usuário insira essas diretivas para o compilador não falhar na verificação do arquivo de teste, mas falhar na inferência de `infer()` e passar no teste quando isso for o esperado.
 * @param closure Trecho de código a ser testado.
 * @param compilerOptions Configurações de compilação. Se não fornecido, usa o arquivo do projeto corrente.
 */
export default function infer(closure: Function, compilerOptions?: ts.CompilerOptions): void {
	const errors = diagnose(closure, compilerOptions)	

	if (errors.length) {
		throw new Error(errors.map(error => error.messageText).join('\n'))
	}
}

/**
 * Infere a função typescript especificada, retornando uma lista de todos os erros encontrados. Como em `infer`, as declarações de `// @ts-ignore` serão removidas.
 * @param closure Trecho de código a ser testado.
 * @param compilerOptions Configurações de compilação. Se não fornecido, usa o arquivo do projeto corrente.
 */
export function diagnose(closure: Function, compilerOptions?: ts.CompilerOptions): readonly ts.Diagnostic[] {
	const stack = getStack()
	const [fileName, line, column] = getCodeOrigin(stack)
	const fileContent = getFileContent(fileName)
	const imports = getImports(fileContent)
	const block = getContentBetweenTokens(['(', ')'], fileContent, [line, column])
	const code = imports + '\n' + block
	const diagnostics = getDiagnostics(code, fileName, compilerOptions)	

	return diagnostics.filter(diagnostic => diagnostic.category == ts.DiagnosticCategory.Error)
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
 * Retorna o conteúdo do arquivo especificado.
 * @param fileName Caminho do arquivo.
 */
function getFileContent(fileName: string): string {
	return fs.readFileSync(fileName, 'utf-8')
}

/**
 * Retorna o nome do arquivo, linha e coluna do código.
 * @param stack Pilha de chamadas.
 * @throws Não pode ser chamada fora do escopo da função `infer()`.
 */
function getCodeOrigin(stack: string[]): [string, number, number] {
	const inferLine = stack[1]
	const callerLine = stack.find(line => line.search(/at (.*\.)?test/) != -1)

	if (!inferLine || inferLine.search(/at (.*\.)?diagnose/) == -1) {
		throw new Error('Função sendo chamada fora do escopo do pacote')
	}
	
	const referencePiece = callerLine && (callerLine.match(/\((.+)\)/) || callerLine.match(/at\s+(.+)/))
	const origin = referencePiece && referencePiece[1].split(':').map((part, i) => i && Number(part) || part) as [string, number, number]

	if (!origin || origin.length != 3) {
		console.error('Formato inesperado da pilha de chamadas')
		process.exit(1)
		return undefined as any // Evita TS2322 - não há finalidade em fazer o usuário testar o retorno visto que o processo encerra
	}
	
	return origin
}

/**
 * Retorna as declarações de importação do código especificado.
 * @param code String contendo o código.
 */
function getImports(code: string): string {
	const lines = code.split('\n')
	const imports = lines.filter(line => line.search(/^\s*import\s/) != -1).map(line => line + ';')

	return imports.join('\n')
}

/**
 * Retorna o trecho de código contido entre os tokens especificados.
 * @param tokens Tupla de [$tokenInicial, $tokenFinal].
 * @param content String contendo o código.
 * @param beginIndexes Linha e coluna onde a pesquisa deverá começar.
 * @throws Os tokens fornecidos devem existir em pares - quando `tokens = ['(',')']`, `'('.length` deve ser igual à `')'.length`
 */
function getContentBetweenTokens(tokens: [string, string], content: string, beginIndexes: [number, number]): string {
	const [open, close] = tokens
	const [line, column] = beginIndexes
	let tokenCount = 0
	let begin = 0
	let end = 0

	content = content.split('\n').slice(line - 1).join('\n').substring(column - 1)

	for (let i = 0, count = content.length; i < count; i++) {
		const digit = content[i]

		if (digit == open) {
			if (!(tokenCount++)) {
				begin = i
			}
		}
		else if (digit == close) {
			end = i
			if (!(--tokenCount)) {
				return content.substring(begin, end + 1)
			}
		}
	}

	throw new Error('Tokens não batem')
}

/**
 * Retorna a lista de diagnósticos encontrados no código especificado. Essa função precisa criar um arquivo temporário no mesmo local para as importações serem bem sucedidas.
 * @param code Código a ser diagnosticado.
 * @param sourceFileName Caminho do arquivo fonte.
 * @param compilerOptions Opções do compilador. Se não fornecido, usa o arquivo do projeto corrente.
 */
function getDiagnostics(code: string, sourceFileName: string, compilerOptions?: ts.CompilerOptions): readonly ts.Diagnostic[] {
	const codeFileName = `${sourceFileName}.block.${Math.random()}.ts`

	if (!compilerOptions) {
		compilerOptions = getTsconfig().config.options
	}

	compilerOptions.noUnusedLocals = false
	compilerOptions.noImplicitReturns = false

	code = code.replace(/\/\/\s*@ts-ignore/g, '')

	fs.writeFileSync(codeFileName, code)

	const program = ts.createProgram([codeFileName], compilerOptions)

	fs.unlinkSync(codeFileName)

	return ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics)
}