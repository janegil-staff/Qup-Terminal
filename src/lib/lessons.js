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

// Course units (the topic breakdown). Lessons reference a unit by id. Units
// give the curriculum structure and let the app group + show per-unit progress.
// Author new exercises by adding them to LESSONS with the matching unit id.
export const UNITS = [
  { id: "u1-getting-around", title: "Getting around", order: 1 },
  { id: "u2-files", title: "Files & folders", order: 2 },
  { id: "u3-viewing", title: "Viewing & reading", order: 3 },
  { id: "u4-searching", title: "Searching", order: 4 },
  { id: "u5-pipes", title: "Pipes & redirection", order: 5 },
  { id: "u6-permissions", title: "Permissions", order: 6 },
  { id: "u7-processes", title: "Processes & system", order: 7 },
  { id: "u8-scripting", title: "Editing & scripting", order: 8 },
];

export const LESSONS = [
  {
    id: "01-pwd",
    unit: "u1-getting-around",
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
    unit: "u1-getting-around",
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
    id: "02b-ls-l",
    unit: "u1-getting-around",
    title: "See the details",
    explanation:
      "`ls -l` shows a 'long' listing — one item per line with extra detail: " +
      "permissions, owner, size, and date. The `-l` is an option (a flag) that " +
      "changes how ls behaves.",
    task: "Run:  ls -l",
    check: 'grep -qE "ls +-[a-z]*l" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type ls -l (that's a lowercase L) and press Enter.",
  },
  {
    id: "02c-ls-a",
    unit: "u1-getting-around",
    title: "Show hidden files",
    explanation:
      "Files whose name starts with a dot (like `.bashrc`) are hidden by " +
      "default. `ls -a` shows ALL files, including the hidden ones. Try it.",
    task: "Run:  ls -a",
    check: 'grep -qE "ls +-[a-z]*a" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type ls -a and press Enter. You can also combine flags: ls -la",
  },
  {
    id: "02d-cd-up",
    unit: "u1-getting-around",
    title: "Go up a level",
    explanation:
      "`..` means 'the folder above this one' (the parent). So `cd ..` moves " +
      "you up one level. It's how you back out of a folder you've entered.",
    task: "Move up one folder with:  cd ..",
    check: 'grep -qE "cd +\\.\\." ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type cd .. (cd, space, two dots) and press Enter.",
  },
  {
    id: "02e-cd-home",
    unit: "u1-getting-around",
    title: "Jump home",
    explanation:
      "`~` (tilde) is a shortcut for your home folder. No matter where you are, " +
      "`cd ~` (or just `cd` on its own) takes you straight home.",
    task: "Go to your home folder with:  cd ~",
    check: 'grep -qE "cd +~" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "Type cd ~ (cd, space, tilde) and press Enter.",
  },
  {
    id: "03-mkdir",
    unit: "u2-files",
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
    unit: "u1-getting-around",
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
    unit: "u2-files",
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
    unit: "u3-viewing",
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
    unit: "u2-files",
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
    unit: "u2-files",
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
    unit: "u2-files",
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
    unit: "u2-files",
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
  {
    id: "11-mkdir-p",
    unit: "u2-files",
    title: "Make nested folders",
    explanation:
      "Normally `mkdir` only makes one folder, and fails if the parent doesn't " +
      "exist. `mkdir -p` creates a whole chain of folders at once, making any " +
      "missing parents along the way.",
    task:
      "Create the nested path  a/b/c  in one command\n" +
      "(hint: mkdir -p a/b/c)",
    check: "test -d ~/a/b/c && echo PASS",
    pass: "PASS",
    hint: "Run:  mkdir -p a/b/c",
  },
  {
    id: "12-rmdir",
    unit: "u2-files",
    title: "Remove an empty folder",
    explanation:
      "`rmdir` removes a folder — but only if it's empty. It's a safer cousin " +
      "of `rm`, because it refuses to delete a folder that still has things in " +
      "it. Make an empty folder, then remove it with rmdir.",
    task:
      "Make a folder  empty , then remove it with rmdir\n" +
      "(hint: mkdir empty ; rmdir empty)",
    check:
      'grep -qE "rmdir +empty" ~/.bash_history && ! test -d ~/empty && echo PASS',
    pass: "PASS",
    hint: "mkdir empty   then   rmdir empty",
  },
  {
    id: "13-touch",
    unit: "u2-files",
    title: "Create an empty file",
    explanation:
      "`touch` creates an empty file if it doesn't exist (and updates its " +
      "timestamp if it does). It's the quickest way to make a blank file.",
    task:
      "Create an empty file called  marker\n" +
      "(hint: touch marker)",
    check: "test -f ~/marker && echo PASS",
    pass: "PASS",
    hint: "Run:  touch marker",
  },
  {
    id: "14-head",
    unit: "u3-viewing",
    title: "See the start of a file",
    explanation:
      "`head` shows the first lines of a file (10 by default, or use `-n` to " +
      "pick how many). Great for peeking at the top of a big file without " +
      "opening the whole thing.",
    task:
      "Make a file  numbers.txt  with the numbers 1 to 10, then save its first " +
      "3 lines into  top.txt\n" +
      "(hint: seq 10 > numbers.txt ; head -n 3 numbers.txt > top.txt)",
    check:
      'test "$(wc -l < ~/top.txt 2>/dev/null)" = "3" && head -n1 ~/top.txt | grep -qx 1 && tail -n1 ~/top.txt | grep -qx 3 && echo PASS',
    pass: "PASS",
    hint: "seq 10 > numbers.txt   then   head -n 3 numbers.txt > top.txt",
  },
  {
    id: "15-tail",
    unit: "u3-viewing",
    title: "See the end of a file",
    explanation:
      "`tail` is the opposite of head — it shows the LAST lines of a file. It's " +
      "handy for checking the most recent entries in a log.",
    task:
      "Make a file  numbers.txt  with the numbers 1 to 10, then save its last " +
      "3 lines into  bottom.txt\n" +
      "(hint: seq 10 > numbers.txt ; tail -n 3 numbers.txt > bottom.txt)",
    check:
      'test "$(wc -l < ~/bottom.txt 2>/dev/null)" = "3" && head -n1 ~/bottom.txt | grep -qx 8 && tail -n1 ~/bottom.txt | grep -qx 10 && echo PASS',
    pass: "PASS",
    hint: "seq 10 > numbers.txt   then   tail -n 3 numbers.txt > bottom.txt",
  },
  {
    id: "16-less",
    unit: "u3-viewing",
    title: "Page through a long file",
    explanation:
      "`less` opens a file in a scrollable viewer — useful for long files. " +
      "Scroll with the arrow keys, and press `q` to quit. (Make a file first so " +
      "you have something to view.)",
    task:
      "Make a file  big.txt  (any contents), then open it with less and press q " +
      "to quit\n" +
      "(hint: seq 50 > big.txt ; less big.txt   — then press q)",
    check: 'grep -qE "(^| )less +" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "seq 50 > big.txt   then   less big.txt   (press q to exit)",
  },
  {
    id: "17-wc",
    unit: "u3-viewing",
    title: "Count lines",
    explanation:
      "`wc` (word count) counts lines, words, and characters. With `-l` it " +
      "counts just lines — useful for 'how many entries are in this file?'",
    task:
      "Make a file  lines.txt  with 5 lines, then save its line count into  count.txt\n" +
      "(hint: seq 5 > lines.txt ; wc -l < lines.txt > count.txt)",
    check: 'grep -qE "(^| )5$" ~/count.txt 2>/dev/null && echo PASS',
    pass: "PASS",
    hint: "seq 5 > lines.txt   then   wc -l < lines.txt > count.txt",
  },
  {
    id: "18-file",
    unit: "u3-viewing",
    title: "What kind of file is it?",
    explanation:
      "`file` inspects a file and tells you what type it is (text, image, " +
      "program, …) by looking at its contents — not just its name. Try it on " +
      "any file.",
    task:
      "Make a file  thing.txt , then run file on it\n" +
      "(hint: touch thing.txt ; file thing.txt)",
    check: 'grep -qE "(^| )file +" ~/.bash_history && echo PASS',
    pass: "PASS",
    hint: "touch thing.txt   then   file thing.txt",
  },
  {
    id: "19-cat-multi",
    unit: "u3-viewing",
    title: "Join files together",
    explanation:
      "`cat` can take several files at once and print them one after another. " +
      "Combined with `>`, that lets you join files into a new one.",
    task:
      "Make  one.txt  containing  alpha  and  two.txt  containing  beta , then " +
      "join them into  both.txt\n" +
      "(hint: echo alpha > one.txt ; echo beta > two.txt ; cat one.txt two.txt > both.txt)",
    check:
      'grep -qx alpha ~/both.txt 2>/dev/null && grep -qx beta ~/both.txt 2>/dev/null && test "$(wc -l < ~/both.txt)" = "2" && echo PASS',
    pass: "PASS",
    hint: "cat one.txt two.txt > both.txt",
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
