# [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)

## try...catch statement

If any statement within `try` block throws exception, control will immediately shifts to `catch` block.

If no exception is thrown in try, when `catch` block is skipped

### The catch block

The `catch` block specifies identifier `exception`, that holds the value specified by the throw statement

JavaScript creates identifier when the `catch` block is entered. The identifier lasts only for the duration of the `catch` block
Once the `catch` block finishes executing, the identifier no longer exists.

### The finally block

The `finally` block will be executed whether or not an exception is thrown.
If an exception is thrown, the statements in the `finaly` block execute, even if no `catch` block handles the exception that was thrown

If the `finally` block returns a value, this value becomes the return value of the entire `try...catch..finally`, regardless of any return value in the `try` and `catch` blocks:

Overwriting of return values by the finally block also applies to exceptions thrown or re-thrown inside of the catch block:
