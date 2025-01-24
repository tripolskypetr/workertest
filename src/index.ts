import { Worker, isMainThread, workerData, parentPort } from "worker_threads";
import { fileURLToPath } from "url";

import { ToolRegistry, createAwaiter, BehaviorSubject, Subject, singleshot, getErrorMessage } from "functools-kit";

import tape from "tape";

const workerFileSubject = new BehaviorSubject<string>();
const finishSubject = new Subject<void>();

let testRegistry = new ToolRegistry<Record<string, TestWrapper>>("workertest");
let testCounter = 0;

const waitForFile = async () => {
  if (workerFileSubject.data) {
    return workerFileSubject.data;
  }
  return await workerFileSubject.toPromise();
};

interface ITest {
  pass(msg?: string): void;
  fail(msg?: string): void;
}

class TestWrapper {
  constructor(readonly testName: string, readonly cb: (t: ITest) => void) {}
}

export const test = async (testName: string, cb: (t: ITest) => void) => {
  if (!isMainThread) {
    testRegistry = testRegistry.register(
      testName,
      new TestWrapper(testName, cb)
    );
    return;
  }
  
  const workerFile = await waitForFile();

  testCounter += 1;

  tape(testName, async (test) => {
    const [awaiter, { resolve }] = createAwaiter<void>();

    let isFinished = false;

    const worker = new Worker(workerFile, {
      workerData: { testName },
    });

    worker.once("message", ({ status, msg }) => {
      if (status === "pass") {
        test.pass(msg);
      } else if (status === "fail") {
        test.fail(msg);
      }
      isFinished = true;
      worker.terminate();
      resolve();
    });

    worker.on("error", (err) => {
      test.fail(`Worker error: ${getErrorMessage(err)}`);
      resolve();
    });

    worker.on("exit", (code) => {
      if (isFinished) {
        return;
      }
      if (code !== 0) {
        test.fail(`Worker stopped with exit code ${code}`);
        resolve();
      }
    });

    {
      await awaiter;
      testCounter -= 1;
      await finishSubject.next();
    }

  });
};

export const run = singleshot(async (__filename: string, cb: () => void = () => { }) => {
  if (isMainThread) {
    await workerFileSubject.next(fileURLToPath(__filename));
    await finishSubject.filter(() => testCounter === 0).toPromise();
    cb();
    return;
  }

  if (!parentPort) {
    throw new Error("workertest parentPort is null");
  }

  testRegistry.get(workerData.testName).cb({
    pass: (msg) => parentPort!.postMessage({ status: "pass", msg }),
    fail: (msg) => parentPort!.postMessage({ status: "fail", msg }),
  });

});
