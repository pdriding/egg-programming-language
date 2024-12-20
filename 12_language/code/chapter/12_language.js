// ------------ PARSER --------------

function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;
  if ((match = /^"([^"]*)"/.exec(program))) {
    expr = { type: "value", value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    expr = { type: "value", value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"]+/.exec(program))) {
    expr = { type: "word", name: match[0] };
  } else {
    throw new SyntaxError("Unexpected syntax: " + program);
  }

  return parseApply(expr, program.slice(match[0].length));
}

// function skipSpace(string) {
//   let first = string.search(/\S/);
//   if (first == -1) return "";
//   return string.slice(first);
// }

function parseApply(expr, program) {
  program = skipSpace(program);
  if (program[0] != "(") {
    return { expr: expr, rest: program };
  }

  program = skipSpace(program.slice(1));
  expr = { type: "apply", operator: expr, args: [] };
  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == ",") {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ")") {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }
  return parseApply(expr, program.slice(1));
}

function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError("Unexpected text after program");
  }
  return expr;
}
//    operator: {type: "word", name: "+"},
//    args: [{type: "word", name: "a"},
//           {type: "value", value: 10}]}

// ----------- EVALUATOR ---------------------

var specialForms = Object.create(null);

// This is the interpreter

function evaluate(expr, scope) {
  if (expr.type == "value") {
    return expr.value;
  } else if (expr.type == "word") {
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == "apply") {
    let { operator, args } = expr;
    if (operator.type == "word" && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == "function") {
        return op(...args.map((arg) => evaluate(arg, scope)));
      } else {
        throw new TypeError("Applying a non-function.");
      }
    }
  }
}

// ------------- SPECIAL FORMS -------------------

specialForms.define = (args, scope) => {
  if (args.length != 2 || args[0].type != "word") {
    throw new SyntaxError("Incorrect use of define");
  }
  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};

specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError("Wrong number of args to if");
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};

specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError("Wrong number of args to while");
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }

  // Since undefined does not exist in Egg, we return false,
  // for lack of a meaningful result
  return false;
};

specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};

// specialForms.define = (args, scope) => {
//   if (args.length != 2 || args[0].type != "word") {
//     throw new SyntaxError("Incorrect use of define");
//   }
//   let value = evaluate(args[1], scope);
//   scope[args[0].name] = value;
//   return value;
// };

// ------------- THE ENVIROMENT ----------------

// (top scope = the global scope)

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

// Runs program and creates new scope inherited from topScope

function run(program) {
  return evaluate(parse(program), Object.create(topScope));
}

// -------------- FUNCTIONS -----------------

specialForms.fun = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError("Functions need a body");
  }
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

// ------------ EXERCISE 1 ------------------

topScope.array = function (...a) {
  return a;
};

topScope.length = function (a) {
  return a.length;
};

topScope.element = function (arr, i) {
  return arr[i];
};

// run(`
// do(define(sum, fun(array,
//      do(define(i, 0),
//         define(sum, 0),
//         while(<(i, length(array)),
//           do(define(sum, +(sum, element(array, i))),
//              define(i, +(i, 1)))),
//         sum))),
//    print(sum(array(1, 2, 3))))
// `);
// → 6

// -------------- EXERCISE 2 -----------------

// run(`
//   do(define(f, fun(a, fun(b, +(a, b)))),
//      print(f(4)(5)))
//   `);
// → 9

// Closure is achieved by setting the prototype of let localScope = Object.create(scope);
// in the fun() definition. This means that each time the function is called,
// it creates a new local scope that can access variables from the outer scope
// via the prototype chain.

// --------------- EXERCISE 3 --------------------

// Adding comments

// (From the parser)

// Their version
function skipSpace(string) {
  let skippable = string.match(/^(\s|#.*)*/);
  return string.slice(skippable[0].length);
}

// My version
// function skipSpace(string) {
//   // Exclude Comments
//   let regex = /#.*\n/g;
//   if (regex.test(string)) {
//     let excluded = string.replace(regex, "");
//     return excluded;
//   }
//   // Exclude White Space
//   let first = string.search(/\S/);
//   if (first == -1) return "";
//   return string.slice(first);
// }

// console.log(parse("# hello\nx"));
// → {type: "word", name: "x"}

// console.log(parse("a # one\n   # two\n()"));
// → {type: "apply",
//    operator: {type: "word", name: "a"},
//    args: []}

// ------------ EXERCISE 4 ---------------

specialForms.set = (args, scope) => {
  // Ensure the syntax is correct:
  // args[0] must be a "word" (a variable name), and there should be exactly two arguments.
  if (args.length != 2 || args[0].type != "word") {
    throw new SyntaxError("Bad use of set");
  }

  // Evaluate the second argument (the value to assign) in the current scope.
  // This ensures that the value is dynamically computed, not just referring to a name.
  const value = evaluate(args[1], scope);

  // Extract the variable name (the first argument) to be updated.
  const varName = args[0].name;

  // Iterate through the prototype chain starting with the local scope,
  // and moving to the global scope.
  for (
    let currentScope = scope;
    currentScope;
    currentScope = Object.getPrototypeOf(currentScope)
  ) {
    // Check if the current scope has the property (variable) to update.
    if (Object.hasOwn(currentScope, varName)) {
      currentScope[varName] = value; // Update the property in the current scope
      return; // Exit once the value is updated
    }
  }

  // If we've reached the end of the prototype chain without finding the variable, throw an error.
  // This indicates that the variable was not defined in any scope.
  throw new ReferenceError(`Setting undefined variable ${varName}`);
};

run(`
do(define(x, 4),
   define(setx, fun(val, set(x, val))),
   setx(50),
   print(x))
`);
// → 50
// run(`set(quux, true)`);
// → Some kind of ReferenceError
