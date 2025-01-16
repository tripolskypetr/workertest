import { Worker, isMainThread, workerData, parentPort } from "worker_threads";
import { fileURLToPath } from "url";

import { ToolRegistry, createAwaiter, BehaviorSubject } from "functools-kit";

import tape from "tape";

const workerFileSubject = new BehaviorSubject<string>();

let testRegistry = new ToolRegistry<Record<string, TestWrapper>>("workertest");

const waitForFile = async () => {
  if (workerFileSubject.data) {
    return workerFileSubject.data;
  }
  return await workerFileSubject.toPromise();
}

interface ITest {
  pass(msg?: string): void;
  fail(msg?: string): void;
}

class TestWrapper {
  constructor(readonly testName: string, readonly cb: (t: ITest) => void) {}
}

export const test = (testName: string, cb: (t: ITest) => void) => {
  if (isMainThread) {
    tape(testName, async (test) => {
      const [awaiter, { resolve }] = createAwaiter<void>();
      const workerFile = await waitForFile();

      const worker = new Worker(workerFile, {
        workerData: { testName },
      });

      worker.once("message", ({ status, msg }) => {
        if (status === "pass") {
          test.pass(msg);
        } else if (status === "fail") {
          test.fail(msg);
        }
        resolve();
      });

      worker.on("error", (err) => {
        test.fail(`Worker error: ${err.message}`);
        resolve();
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          test.fail(`Worker stopped with exit code ${code}`);
          resolve();
        }
      });

      return await awaiter;
    });
  }

  testRegistry = testRegistry.register(testName, new TestWrapper(testName, cb));
};

export const run = async (__filename: string) => {
  if (isMainThread) {
    workerFileSubject.next(fileURLToPath(__filename));
    return;
  }

  if (!parentPort) {
    throw new Error("workertest parentPort is null");
  }

  testRegistry.get(workerData.testName).cb({
    pass: (msg) => parentPort!.postMessage({ status: "pass", msg }),
    fail: (msg) => parentPort!.postMessage({ status: "fail", msg }),
  });
};
