import fs from "fs";
import path from "path";

/****************************************************
 - This is a stopwatch-style logger for development. It is designed to aid in debugging latency issues. Each log entry includes the elapsed time since the logger started and the time since the last log, enabling quick identification of latency patterns.
 - Logs are saved in the `logs/` directory with filenames based on the start timestamp, allowing easy identification of log sessions.
 - This logger is for development use only, as it is not optimized for production environments.
****************************************************/

const LOG_DIR = path.join(__dirname, "../logs");
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
} catch (error) {
  console.log("unable to create logs directory", error);
}

// clean up old log files
const LOG_FILE_LIMIT = process.env.LOG_FILE_LIMIT
  ? parseInt(process.env.LOG_FILE_LIMIT)
  : 25;

try {
  const filesToDelete = fs
    .readdirSync(LOG_DIR)
    .map((file) => ({
      name: file,
      path: path.join(LOG_DIR, file),
      ctime: fs.statSync(path.join(LOG_DIR, file)).ctime,
    }))
    .sort((a, b) => b.ctime.getTime() - a.ctime.getTime())
    .slice(LOG_FILE_LIMIT);

  if (filesToDelete.length > 0) {
    console.log(`deleting the ${filesToDelete.length} oldest log files`);
    filesToDelete.forEach((file) => fs.unlinkSync(file.path));
  }
} catch (error) {
  console.log("error cleaning up old log files", error);
}

const NS_PAD = 17;

const COLORS = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",

  cyan: "\x1b[36m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",

  clear: "\x1b[0m",
};

const Levels = {
  DEBUG: COLORS.cyan,
  INFO: "", // empty, so it defaults to the user's terminal style settings
  ERROR: COLORS.red,
  WARN: COLORS.yellow,

  CLEAR: "\x1b[0m",
  INVERT: "\x1b[7m",
} as const;

export class StopwatchLogger {
  start: number; // initialization timestamp
  prev: number; // previous log's timestamp

  date: Date;
  logDateString?: string;
  logPath?: string;
  private _logStream?: fs.WriteStream;

  constructor() {
    this.date = new Date();
    this.prev = Date.now();
    this.start = Date.now();

    this.reset();
  }

  callSid: string | null = null;
  setCallSid = (callSid: string | null) => {
    if (callSid === this.callSid) return;
    this.callSid = callSid;
    this.reset();
  };

  reset = () => {
    this.date = new Date();
    this.start = Date.now();
    this.prev = Date.now();

    const dateStr = `${this.date.getMonth() + 1}-${this.date.getDate()}`;
    const timeStr = `${this.date
      .getHours()
      .toString()
      .padStart(2, "0")}:${this.date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${this.date
      .getSeconds()
      .toString()
      .padStart(2, "0")}:${this.date
      .getMilliseconds()
      .toString()
      .padStart(3, "0")}`;
    const dtStr = `${dateStr}_${timeStr}`;
    this.logDateString = dtStr;
    this.logPath = path.join(LOG_DIR, `${dtStr}.txt`);
    this._logStream = undefined;
  };

  get logStream() {
    if (this._logStream) return this._logStream;

    if (!this.logPath) return undefined;

    if (!fs.existsSync(this.logPath)) fs.writeFileSync(this.logPath, ``);

    this._logStream = fs.createWriteStream(this.logPath, {});
    this._logStream?.write(`${this.date.toString()}\n`);

    return this._logStream;
  }

  sinceStart = () => {
    const elapsed = Date.now() - this.start;
    const min = Math.floor(elapsed / (60 * 1000));
    const sec = Math.floor((elapsed % (60 * 1000)) / 1000);
    const ms = elapsed % 1000;

    return (
      `${min.toString().padStart(2, "0")}m ` +
      `${sec.toString().padStart(2, "0")}s ` +
      `${ms.toString().padStart(3, "0")}ms`
    );
  };

  sinceLast = () => {
    const elapsed = Date.now() - this.prev;
    this.prev = Date.now();

    const sec = Math.floor((elapsed % (60 * 1000)) / 1000);
    const ms = elapsed % 1000;

    return (
      "+" +
      sec.toString().padStart(2, "0") +
      "." +
      ms.toString().padStart(3, "0")
    );
  };

  hasWarned = false;
  log = (level: keyof typeof Levels, namespace: string, ...msgs: any[]) => {
    const timeStamp = `${this.sinceStart()} ${this.sinceLast()}`;

    const ns = namespace.padEnd(NS_PAD, " ");

    if (this.callSid) {
      try {
        const formattedMsg = msgs
          .map((m) => (typeof m === "object" ? JSON.stringify(m, null, 2) : m))
          .join(" ");

        this.logStream?.write(
          `${level.padEnd(7, " ")} ${timeStamp} ${ns} ${formattedMsg}\n`
        );
      } catch (error) {}
    }

    const color = Levels[level];

    let _msgs = msgs.flatMap((msg) =>
      (typeof msg === "object" && msg !== null) || Array.isArray(msg)
        ? [Levels.CLEAR, msg, color]
        : String(msg)
    );

    console.log(
      `${color}${Levels.INVERT}${timeStamp} ${ns}${Levels.CLEAR}${color} `,
      ..._msgs,
      Levels.CLEAR
    );
  };

  debug = (ns: string, ...msg: any) => this.log("DEBUG", ns, ...msg);
  error = (ns: string, ...msg: any) => this.log("ERROR", ns, ...msg);
  info = (ns: string, ...msg: any) => this.log("INFO", ns, ...msg);
  warn = (ns: string, ...msg: any) => this.log("WARN", ns, ...msg);

  green = (...[first, ...msgs]: any) =>
    console.log(`${COLORS.green}${first}`, ...msgs, COLORS.clear);
  red = (...[first, ...msgs]: any) =>
    console.log(`${COLORS.red}${first}`, ...msgs, COLORS.clear);
  yellow = (...[first, ...msgs]: any) =>
    console.log(`${COLORS.yellow}${first}`, ...msgs, COLORS.clear);
}

const log = new StopwatchLogger();
export default log;
