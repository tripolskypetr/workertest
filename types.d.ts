interface ITest {
    pass(msg?: string): void;
    fail(msg?: string): void;
}
declare const test: (testName: string, cb: (t: ITest) => void) => void;
declare const run: (__filename: string) => Promise<void>;

export { run, test };
