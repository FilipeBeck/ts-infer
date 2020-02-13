# ts-infer [🇧🇷](#🇧🇷)

[![Coverage Status](https://coveralls.io/repos/github/FilipeBeck/ts-infer/badge.svg?branch=master)](https://coveralls.io/github/FilipeBeck/ts-infer?branch=master)

Typing inference for typescript testing units

## Motivation

Test the creation of complex generic types.

## Installation

`npm install ts-infer`

`yarn add ts-infer`

## Use

```typescript
import infer from 'ts-infer'

test('Attribute constraint inference', () => {
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
    })
  }).toThrow()
})
```

The `infer ()` function checks for compilation errors in the provided `callback` and throws an exception if it contains errors. A second argument with the compiler options can be provided. If omitted, the same file as the dependent project will be used.

__IMPORTANT__: The use of `@ ts-ignore` is necessary to avoid errors when compiling the test file. These lines will be removed by `infer ()` before inference.

```typescript
import { diagnose } from 'ts-infer'

test('Attribute constraint diagnostic', () => {
  const diagnostics = diagnose(() => {
    interface User {
      id: string
      name: string
      isAuthenticated: boolean
    }

    type PropsOfUser = User[keyof User] // string | boolean

    let propOfUser: PropsOfUser
    // @ts-ignore
    propOfuser = 5
    // @ts-ignore
    propOfuser = Array<number>()
  })

  expect(diagnostics.length).toBe(2)
})
```

The `diagnose()` is similar to `infer()`, but it returns a list of errors instead of throwing an exception.

## 🇧🇷

Inferência de tipagem para unidades de testes em typescript

## Motivação

Testar a criação de tipos genéricos complexos.

## Instalação

`npm install ts-infer`

`yarn add ts-infer`

## Uso

```typescript
import infer from 'ts-infer'

test('Inferência de restrição de atributos', () => {
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
    })
  }).toThrow()
})
```

A função `infer()` verifica erros de compilação no `callback` fornecido como argumento e lança uma exceção caso a mesma contenha erros. Um segundo argumento com as opções de compilação pode ser fornecido. Se omitido, será usado o mesmo arquivo do projeto dependente.

__IMPORTANTE__: O uso de `@ts-ignore` é necessário para não haver erros na compilação do arquivo de teste. Essas linhas serão removidas por `infer()` antes da inferência.

```typescript
import { diagnose } from 'ts-infer'

test('Diagnóstico de restrição de atributos', () => {
  const diagnostics = diagnose(() => {
    interface User {
      id: string
      name: string
      isAuthenticated: boolean
    }

    type PropsOfUser = User[keyof User] // string | boolean

    let propOfUser: PropsOfUser
    // @ts-ignore
    propOfuser = 5
    // @ts-ignore
    propOfuser = Array<number>()
  })

  expect(diagnostics.length).toBe(2)
})
```

A função `diagnose()` é similar à `infer()`, mas retorna uma lista de erros ao invés de lançar uma exceção.
