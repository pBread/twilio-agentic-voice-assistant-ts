import "dotenv-flow/config";
import { spawn, ChildProcess } from "child_process";

const { HOSTNAME, PORT = "3333" } = process.env;

async function execNgrok(args: string[] = []): Promise<number> {
  return new Promise((resolve) => {
    const process: ChildProcess = spawn("ngrok", args, {
      stdio: "inherit",
    });

    process.on("exit", (code: number | null) => resolve(code ?? 1));
  });
}

(async () => {
  const baseArgs: string[] = ["http", PORT];

  let exitCode: number = 1; // 0 = success, 1 = error

  // try legacy syntax
  if (HOSTNAME) {
    exitCode = await execNgrok([...baseArgs, "--hostname=" + HOSTNAME]); // ngrok v1 & v2 uses hostname
  }

  // try v3+ syntax if it fails
  if (HOSTNAME && exitCode) {
    console.clear();
    exitCode = await execNgrok([...baseArgs, "--url=" + HOSTNAME]); // ngrok v3+ uses url
  }

  // clean up console and log a notice
  if (HOSTNAME && exitCode) {
    console.clear();
    console.error(
      `Ngrok unable to connect using HOSTNAME ${HOSTNAME}. These commands failed:` +
        `\n\t ngrok ${[...baseArgs, "--hostname=" + HOSTNAME].join(" ")}` +
        `\n\t ngrok ${[...baseArgs, "--url=" + HOSTNAME].join(" ")}`,
    );
  }

  // start ngrok w/out hostname if hostname was invalid or undefined
  if (exitCode) {
    exitCode = await execNgrok(baseArgs);
  }
})();
