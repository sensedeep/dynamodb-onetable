---
name: Bug report
about: Create a report to help us improve
title: "Issue title"
labels: ''
assignees: ''

---

**ISSUES will not receive priority that do not follow this template or cannot be easily reproduced or diagnosed**

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**

Steps to reproduce the behavior:

1. Clone this repository
2. Edit your reproducible, minimal, stand-alone test case into the test/debug.ts file.
3. Run via `jest debug` or run VS code in the top level directory.

Ensure that your debug.ts includes:

1. Your OneTable schema
2. Actual API code that is failing. Add comments where helpful.
3. Run API with params of {log: true} and include generated DynamoDB API calls

Check that:

1. You are using a current version of Node and NPM

**Cut/Paste**

Include the code from your debug.ts here and replace the CODE segment. Remember to preserve the three backticks above and below the code block.  See [Formatting Code](https://www.freecodecamp.org/news/how-to-format-code-in-markdown/) for details.

```
PUT YOUR DEBUG.TS CODE HERE
```

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - OS
 - Node Version
 - OneTable Version

**Additional context**
Add any other context about the problem here.
