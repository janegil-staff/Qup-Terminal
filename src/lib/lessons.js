// src/lib/lessons.js
import pty from "node-pty";

export const LESSONS = [
  {
    id: "1-first-command",
    title: "Your first command",
    explanation:
      "The shell is where you type commands to control Linux. The command " +
      "`pwd` (print working directory) shows which folder you're currently in. " +
      "Try running it.",
    task: "Run the command:  pwd",
    check: 'pwd >/dev/null 2>&1 && echo PASS',
    pass: "PASS",
    hint: "Type the three letters p, w, d and press Enter.",
  },
  {
    id: "2-make-a-folder",
    title: "Make a folder",
    explanation:
      "`mkdir` (make directory) creates a new folder. Folders keep your files " +
      "organised. Create one called `myproject`.",
    task: "Create a directory called  myproject  (hint: mkdir myproject)",
    check: 'test -d ~/myproject && echo PASS',
    pass: "PASS",
    hint: "Run:  mkdir myproject",
  },
  {
    id: "3-create-a-file",
    title: "Create a file",
    explanation:
      "You can create a file and put text in it with `echo` and `>`. The `>` " +
      "sends the output into a file instead of the screen. Make a file called " +
      "`hello.txt` containing the word `hi`.",
    task: 'Create hello.txt containing "hi"  (hint: echo hi > hello.txt)',
    check: 'grep -qx hi ~/hello.txt 2>/dev/null && echo PASS',
    pass: "PASS",
    hint: 'Run:  echo hi > hello.txt',
  },
];

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

export function verifyInContainer(containerName, lesson, timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!containerName) return resolve({ passed: false, output: "no container" });
    let out = "";
    let done = false;
    const finish = (passed) => {
      if (done) return;
      done = true;
      resolve({ passed, output: out });
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    let child;
    try {
      child = pty.spawn(
        "docker",
        ["exec", containerName, "bash", "-lc", lesson.check],
        { name: "xterm-color", cols: 80, rows: 24 }
      );
    } catch {
      clearTimeout(timer);
      return finish(false);
    }
    child.onData((d) => (out += d));
    child.onExit(() => {
      clearTimeout(timer);
      finish(out.includes(lesson.pass));
    });
  });
}
