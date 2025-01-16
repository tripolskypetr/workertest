import { run, test } from '../build/index.mjs';

test("Will pass after three seconds", (t) => {
    globalThis.test = {};
    globalThis.test.foo = "bar";
    setTimeout(() => {
        t.pass(globalThis.test.foo);
    }, 3_000);
})

test("Will fail after a second", (t) => {
    setTimeout(() => {
        t.pass(globalThis.test.foo);
    }, 1_000);
})

run(import.meta.url)
