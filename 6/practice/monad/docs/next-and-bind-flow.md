# `next` and `bind` flow

This note explains the idea behind `next` in the IO DSL.

The main model:

```text
IO is a description of a program.
It does not run effects by itself.
```

Every instruction answers one question:

```text
After this instruction is interpreted, what is the next IO program?
```

That "next IO program" is stored in `next`.

## Shape of the tree

The IO program can be viewed as a tree of instructions:

```text
                 IO<A>
                  |
      +-----------+------------+
      |           |            |
   Pure<A>   ReadLine<A>   WriteLine<A>
      |           |            |
   value:A   next: string   text: string
             -> IO<A>       next: IO<A>
```

The important asymmetry:

```text
ReadLine has a continuation function.
WriteLine has an already built continuation program.
```

## Pure

`pure` means the program is finished and already has a value.

```text
Pure(value)
```

There is no `next` here because there is no instruction left to interpret.

When `bind` sees `pure`, it can immediately pass the value to the continuation:

```text
bind(Pure(value), f)
```

Diagram:

```text
before bind:

  Pure(value)

after bind:

  f(value)
```

Flow:

```text
value is already available
=> call f(value)
=> f(value) becomes the next program
```

## ReadLine

`readLine` produces a value in the future: a string from the outside world.

That is why `readLine.next` is a function:

```text
next: string -> IO<A>
```

At program construction time, the string does not exist yet.

So `readLine` cannot store a ready next program if that next program depends on
the user input. It stores a function that will build the next program after the
input is known.

Example flow:

```text
ReadLine(next)
```

Node shape:

```text
       ReadLine
          |
          v
 next: input -> IO<A>
```

Interpreter flow:

```text
1. Interpreter reaches ReadLine
2. It asks the world for a string
3. The world returns "Alice"
4. Interpreter calls next("Alice")
5. next("Alice") returns the next IO program
6. Interpreter continues with that returned program
```

So for `readLine`, `next` means:

```text
"Give me the string that was read, and I will build the next program."
```

Runtime diagram:

```text
            +-------------+
            |  ReadLine   |
            +------+------+
                   |
                   | interpreter asks world
                   v
              world.readLine()
                   |
                   | returns "Alice"
                   v
          next("Alice") is called
                   |
                   v
          next IO program is produced
```

## WriteLine

`writeLine` does not produce a useful value.

It writes text and then continues. There is no result that the next step needs
to wait for.

That is why `writeLine.next` is already an IO value:

```text
next: IO<A>
```

Example flow:

```text
WriteLine("What is your name?", next)
```

Node shape:

```text
       WriteLine
       /       \
 text:string   next: IO<A>
```

Interpreter flow:

```text
1. Interpreter reaches WriteLine
2. It sends "What is your name?" to the world
3. There is no useful returned value
4. Interpreter continues with the already stored next program
```

So for `writeLine`, `next` means:

```text
"After writing this text, continue with this already known program."
```

Runtime diagram:

```text
          +------------------------------+
          | WriteLine("What is your name?") |
          +---------------+--------------+
                          |
                          | interpreter asks world
                          v
                    world.writeLine(text)
                          |
                          | no useful value
                          v
                    continue with next
```

## Why `readLine.next` is a function, but `writeLine.next` is not

The difference is whether the instruction produces a value that later code may
depend on.

```text
readLine  -> produces string -> next must receive that string
writeLine -> produces void   -> next does not need an argument
```

In other words:

```text
readLine.next("Alice") builds the next program for Alice
writeLine.next is already the next program
```

## What `bind` is trying to do

`bind(io, f)` means:

```text
Run the description `io`.
When it eventually produces a value, pass that value into `f`.
Then continue with the IO program returned by `f`.
```

But `bind` itself does not run effects.

It only rewrites the IO tree so that `f` is attached to the place where the
final value appears.

High-level bind diagram:

```text
bind(program, f)

means:

program eventually produces A
          |
          v
       f(A) produces IO<B>
          |
          v
     whole result is IO<B>
```

## Flow through `bind`

### Case: Pure

```text
bind(Pure(value), f)
```

The value is already available.

Flow:

```text
Pure(value)
=> f(value)
```

This is the only case where `bind` can call `f` immediately.

### Case: ReadLine

```text
bind(ReadLine(next), f)
```

There is no string yet. The string will appear only when the interpreter runs
the program.

So `bind` must keep the `ReadLine` instruction, but replace its `next` with a
new function.

Conceptual flow:

```text
old:
ReadLine(input => oldNext(input))

after bind:
ReadLine(input => bind(oldNext(input), f))
```

Tree rewrite diagram:

```text
before:

        ReadLine
           |
           v
   input -> oldNext(input)

after bind(..., f):

        ReadLine
           |
           v
   input -> bind(oldNext(input), f)
```

Runtime flow with input `"Alice"`:

```text
1. Interpreter reaches ReadLine
2. World returns "Alice"
3. New next receives "Alice"
4. It calls oldNext("Alice")
5. oldNext("Alice") returns the old continuation program
6. bind attaches f deeper into that returned program
7. Interpreter continues
```

Key point:

```text
bind does not know the input yet.
It can only prepare what should happen after the input arrives.
```

Two-phase diagram:

```text
Phase 1: bind time, no real input exists

  ReadLine(next)
       |
       v
  replace next with a wrapper

Phase 2: runtime, input exists

  wrapper("Alice")
       |
       v
  oldNext("Alice")
       |
       v
  bind(result, f)
```

### Case: WriteLine

```text
bind(WriteLine(text, next), f)
```

The write instruction itself should stay in place. `bind` must not skip it,
because writing is part of the described program.

But `writeLine` has no useful result, so `f` cannot be attached to the write
instruction directly.

Instead, `bind` attaches `f` to the already known `next` program.

Conceptual flow:

```text
old:
WriteLine(text, next)

after bind:
WriteLine(text, bind(next, f))
```

Tree rewrite diagram:

```text
before:

        WriteLine(text)
              |
              v
            next

after bind(..., f):

        WriteLine(text)
              |
              v
        bind(next, f)
```

Runtime flow:

```text
1. Interpreter reaches WriteLine
2. World writes text
3. Interpreter moves to the new next
4. The new next is the old next with f attached deeper inside
```

Key point:

```text
writeLine.next is already a program, so bind can recurse into it immediately.
readLine.next is a function, so bind must wrap that function.
```

Side-by-side bind rewrite:

```text
ReadLine case:

  next is a function

  oldNext: input -> IO<A>
       |
       v
  newNext: input -> bind(oldNext(input), f)


WriteLine case:

  next is already IO<A>

  oldNext: IO<A>
       |
       v
  newNext: bind(oldNext, f)
```

## Small mental model

```text
Pure      -> value is here, apply f now
ReadLine  -> value will arrive later, wrap next
WriteLine -> no value here, recurse into next
```

Another compact version:

```text
readLine.next  = "when input arrives, build the next program"
writeLine.next = "the next program is already known"
bind           = "attach f to the point where a value is produced"
```
