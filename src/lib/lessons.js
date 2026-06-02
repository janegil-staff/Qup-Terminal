// src/lib/lessons.js
// Linux-learning curriculum + verification. A lesson is pure data; the engine
// runs `check` inside the learner's sandbox container and looks for `pass`.
//
// Two verification styles (both just run as `check`):
//   • side-effect — inspect the filesystem for what the task should have made.
//   • history     — grep ~/.bash_history to confirm a command was RUN (needed
//                   for traceless commands like cd, ls, cat, pwd, man). The
//                   sandbox image writes history immediately (PROMPT_COMMAND).
//
// Every lesson is SELF-CONTAINED: its task sets up anything it needs, so a
// learner can do lessons in any order. Add lessons by appending here — no code.

import pty from "node-pty";

export const LESSONS = [
  {
    id: "01-pwd",
    title: "Where am I?",
    explanation:
      "The shell always has a 'current folder' you're working in. The command " +
      "`pwd` (print working directory) tells you where that is. Run it to see " +
      "your current location.",
    task: "Run:  pwd",
    check: 'grep -qE "(^| )pwd( |$)" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type pwd and press Enter.",
  },
  {
    id: "02-ls",
    title: "What's here?",
    explanation:
      "`ls` (list) shows the files and folders in your current location. It's " +
      "probably the command you'll use most. Try it.",
    task: "Run:  ls",
    check: 'grep -qE "(^| )ls( |$)" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type ls and press Enter.",
  },
  {
    id: "03-mkdir",
    title: "Make a folder",
    explanation:
      "`mkdir` (make directory) creates a new folder. Folders keep your files " +
      "organised. Create one called `myproject`.",
    task: "Create a folder called  myproject",
    check: 'test -d ~/myproject && echo PASS',
    pass: "PASS",
    hint: "Run:  mkdir myproject",
  },
  {
    id: "04-cd",
    title: "Move into a folder",
    explanation:
      "`cd` (change directory) moves you into a folder. Let's make a folder and " +
      "move into it, then create a file there to prove you arrived.",
    task:
      "Make a folder  lab , move into it with cd, and create a file there called  done.txt\n" +
      "(hint: mkdir lab ; cd lab ; touch done.txt)",
    check: 'test -f ~/lab/done.txt && echo PASS',
    pass: "PASS",
    hint: "mkdir lab   then   cd lab   then   touch done.txt",
  },
  {
    id: "05-create-file",
    title: "Create a file with text",
    explanation:
      "`echo` prints text. The `>` symbol sends that text into a file instead " +
      "of the screen. Together they create a file with contents.",
    task: 'Create a file  hello.txt  containing the word  hi',
    check: 'grep -qx hi ~/hello.txt 2>/dev/null && echo PASS',
    pass: "PASS",
    hint: "Run:  echo hi > hello.txt",
  },
  {
    id: "06-cat",
    title: "Read a file",
    explanation:
      "`cat` prints a file's contents to the screen. First make a file, then " +
      "read it back with cat.",
    task:
      'Create a file  note.txt  with the word  ok  in it, then read it with cat\n' +
      "(hint: echo ok > note.txt ; cat note.txt)",
    check:
      'grep -qx ok ~/note.txt 2>/dev/null && grep -qE "(^| )cat note.txt" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "echo ok > note.txt   then   cat note.txt",
  },
  {
    id: "07-cp",
    title: "Copy a file",
    explanation:
      "`cp` (copy) duplicates a file. The first name is the source, the second " +
      "is the copy.",
    task:
      'Make a file  src.txt  containing  data , then copy it to  copy.txt\n' +
      "(hint: echo data > src.txt ; cp src.txt copy.txt)",
    check: 'grep -qx data ~/copy.txt 2>/dev/null && test -f ~/src.txt && echo PASS',
    pass: "PASS",
    hint: "echo data > src.txt   then   cp src.txt copy.txt",
  },
  {
    id: "08-mv",
    title: "Rename a file",
    explanation:
      "`mv` (move) renames a file — or moves it to another folder. Here you'll " +
      "use it to rename.",
    task:
      'Make a file  old.txt , then rename it to  new.txt\n' +
      "(hint: touch old.txt ; mv old.txt new.txt)",
    check: 'test -f ~/new.txt && ! test -f ~/old.txt && echo PASS',
    pass: "PASS",
    hint: "touch old.txt   then   mv old.txt new.txt",
  },
  {
    id: "09-rm",
    title: "Delete a file",
    explanation:
      "`rm` (remove) deletes a file. Be careful — there's no recycle bin! " +
      "Practise on a throwaway file.",
    task:
      'Make a file  trash.txt , then delete it\n' +
      "(hint: touch trash.txt ; rm trash.txt)",
    check:
      'grep -qE "(^| )touch trash.txt" ~/.bash_history && ! test -f ~/trash.txt && echo PASS',
    pass: "PASS",
    hint: "touch trash.txt   then   rm trash.txt",
  },
  {
    id: "10-append",
    title: "Add to a file",
    explanation:
      "A single `>` overwrites a file. Double `>>` *appends* — it adds to the " +
      "end without erasing what's there. Build a two-line file with it.",
    task:
      'Create  list.txt  with two lines: first  apple  then append  banana\n' +
      "(hint: echo apple > list.txt ; echo banana >> list.txt)",
    check:
      'test "$(wc -l < ~/list.txt 2>/dev/null)" = "2" && grep -qx apple ~/list.txt && grep -qx banana ~/list.txt && echo PASS',
    pass: "PASS",
    hint: "echo apple > list.txt   then   echo banana >> list.txt",
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
