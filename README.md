# worker-testbed

> The AI-ready testbed which use Worker Threads to create isolated vm context

A worker-threads based test framework using `Node.js`, `tape`, and `functools-kit`, enabling parallel execution of isolated test cases. The main thread registers and spawns worker threads for each test, while the workers retrieve and execute tests, reporting results back via parentPort. This approach enhances test isolation, concurrency, and performance.

## Usage

```tsx
import { run, test } from 'worker-testbed';

test("Will pass after three seconds", (t) => {
    globalThis.test = {};
    globalThis.test.foo = "bar";
    setTimeout(() => {
        t.pass(globalThis.test.foo);
    }, 3_000);
})

test("Will fail after a second cause globalThis.test is undefined", (t) => {
    setTimeout(() => {
        t.pass(globalThis.test.foo);
    }, 1_000);
})

run(import.meta.url)

```
