Sources:

[MDN `with` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with)


**With** statement - statement that add given object to the head of scope chain during evaluation of its statement body.

## Description

There are two types of identifiers: a _qualified_ identifier and _unqualified_ identifier.
An unqualified identifier is one that does not indicate where it comes from

```js
foo; // unqualified
foo.bar; // bar is a qualified identifier
```

Normally, an unqualified identifier is resolved by searching the scope chain for a variable with that name, while a qualified identifier is resolved by searching the prototype chain of an object for a property with that name

```js
with([1, 2,3 ]) {
    console.log(toString()); // 1,2,3
}
```
