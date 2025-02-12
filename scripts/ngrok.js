require("dotenv-flow/config");

const { HOSTNAME, PORT = "3001" } = process.env;

async function execNgrok(args = []) {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const process = spawn("ngrok", args, {
      stdio: "inherit",
    });

    process.on("exit", (code) => resolve(code));
  });
}

(async () => {
  const baseArgs = ["http", PORT];

  let exitCode = 1; // 0 = success, 1 = error

  // try legacy syntax
  if (HOSTNAME)
    exitCode = await execNgrok([...baseArgs, "--hostname=" + HOSTNAME]); // ngrok v1 & v2 uses hostname

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
        `\n\t ngrok ${[...baseArgs, "--url=" + HOSTNAME].join(" ")}`
    );
  }

  // start ngrok w/out hostname if hostname was invalid or undefined
  if (exitCode) exitCode = await execNgrok(baseArgs);
})();
