# ELOQUENT JS PROJECT

## Egg Language Interpreter

This project implements is an exercise from the Eloquent JS book it is created
to teach how JS operates "under the hood"

This project contains a simple interpreter for a Lisp-like language called "Egg". The interpreter parses and evaluates programs written in the Egg language, supporting basic features such as variables, functions, conditionals, loops, and assignments.

## Features

- **Parser**: Parses Egg programs into an abstract syntax tree (AST).
- **Evaluator**: Evaluates the AST using a scope chain, supporting special forms and standard functions.
- **Special Forms**: Includes `define`, `if`, `while`, `do`, and `set`.
- **Functions**: Supports closures with function definitions.
- **Scope Management**: Uses lexical scoping, allowing functions to access variables in their environment.

## Parser

The parser reads the program string and converts it into a structured format that can be evaluated.

### Functions

- **`parse(program)`**: The main entry point for parsing a program. It parses the program and checks for any remaining unexpected characters.
- **`parseExpression(program)`**: Parses basic expressions (values, variables, or function calls).
- **`parseApply(expr, program)`**: Handles function application (calls), supporting multiple arguments.

#### Example Usage:

```js
const program = "(define x 10)";
const parsed = parse(program);
console.log(parsed); // { type: "define", name: "x", value: 10 }
```

## Evaluator

The evaluator takes the parsed AST and executes it by evaluating each expression in a scope.

### Functions

- **`evaluate(expr, scope)`**: Evaluates an expression in the given scope. Supports:
  - **Values**: Direct evaluation of literals (numbers or strings).
  - **Words**: Lookups for variables in the scope.
  - **Apply**: Evaluates function applications, including special forms.

#### Example Usage:

```js
const scope = { x: 10 };
const expr = { type: "word", name: "x" };
console.log(evaluate(expr, scope)); // 10
```

## Special Forms

Special forms are built-in constructs that have custom evaluation logic. They are supported natively by the interpreter.

### `define`

Defines a new variable and assigns it a value.

#### Example:

```js
specialForms.define = (args, scope) => {
  const value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};
```

### `if`

Evaluates the first expression (condition). If it is not `false`, evaluates the second expression (the "then" branch), otherwise, evaluates the third expression (the "else" branch).

#### Example:

```js
specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError("Wrong number of args to if");
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};
```

### `while`

Repeats the evaluation of the second expression while the first expression is not `false`.

#### Example:

```js
specialForms.while = (args, scope) => {
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }
  return false;
};
```

### `do`

Evaluates a series of expressions and returns the result of the last one.

#### Example:

```js
specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};
```

### `set`

Allows assignment to a variable within a scope. This is similar to updating a variable's value.

#### Example:

```js
specialForms.set = (args, scope) => {
  if (args.length != 2 || args[0].type != "word") {
    throw new SyntaxError("Bad use of set");
  }
  const value = evaluate(args[1], scope);
  const varName = args[0].name;

  for (
    let currentScope = scope;
    currentScope;
    currentScope = Object.getPrototypeOf(currentScope)
  ) {
    if (Object.hasOwn(currentScope, varName)) {
      currentScope[varName] = value;
      return;
    }
  }

  throw new ReferenceError(`Setting undefined variable ${varName}`);
};
```

## Environment (Scope)

The environment consists of a set of built-in functions and user-defined variables.

### Top-Level Scope

The `topScope` object contains global functions and constants, such as basic arithmetic operators and the `print` function.

```js
var topScope = Object.create(null);
topScope.true = true;
topScope.false = false;

for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  topScope[op] = Function("a, b", `return a ${op} b;`);
}

topScope.print = (value) => {
  console.log(value);
  return value;
};
```

## Running a Program

To execute an Egg program, you can use the `run` function. This function parses the program and then evaluates it using the global scope.

### Example Usage:

```js
const program = `
do(define(x, 10),
   print(x))
`;
run(program); // Outputs: 10
```

## Functions

You can define functions using the `fun` special form. These functions support closures, meaning they can access variables from their environment.

```js
specialForms.fun = (args, scope) => {
  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map((expr) => {
    if (expr.type != "word") {
      throw new SyntaxError("Parameter names must be words");
    }
    return expr.name;
  });

  return function (...args) {
    if (args.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }
    let localScope = Object.create(scope);
    for (let i = 0; i < args.length; i++) {
      localScope[params[i]] = args[i];
    }
    return evaluate(body, localScope);
  };
};
```

## Exercises

This interpreter supports various exercises for understanding closures, function definitions, and scope management.

### Example 1: Array Sum

```js
run(`
do(define(sum, fun(array,
     do(define(i, 0),
        define(sum, 0),
        while(<(i, length(array)),
          do(define(sum, +(sum, element(array, i))),
             define(i, +(i, 1)))),
        sum))),
   print(sum(array(1, 2, 3))))
`);
// Output: 6
```

### Example 2: Function Currying

```js
run(`
do(define(f, fun(a, fun(b, +(a, b)))),
   print(f(4)(5)))
`);
// Output: 9
```
