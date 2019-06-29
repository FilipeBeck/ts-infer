# ts-infer

[![Coverage Status](https://coveralls.io/repos/github/FilipeBeck/ts-infer/badge.svg?branch=master)](https://coveralls.io/github/FilipeBeck/ts-infer?branch=master)

## Inferência de tipagem para unidades de testes em typescript

# Motivação

Testar a criação de tipos genéricos complexos.

# Instalação

`npm install ts-infer`

`yarn add ts-infer`

# Uso

```typescript
import infer from 'ts-infer'

test('Restrição de atrbutos', () => {
	expect(() => {
		infer(() => {
			interface User {
				id: string
				name: string
				isAuthenticated: boolean
			}

			type PropsOfUser = User[keyof User] // string | boolean

			let propOfUser: PropsOfUser
			// @ts-ignore
			propOfuser = 5
		}).toThrow()
	})
})
```

A função `infer()` verifica erros de compilção no `callback` fornecido como argumento e lança uma exceção caso a mesma contenha erros. Um segundo argumento com as opções de compilação pode ser ofornecido. Se omitido, será usado o mesmo arquivo do projeto corrente.

__IMPORTANTE__: O uso de `@ts-ignore` é necessário para não haver erros na compilação do arquivo de teste. Essas linhas serão removidas por `infer()` antes da inferência. Além disso, o escopo do `callback` fornecido se limita apenas às declarações locais e importações `top-level`.