---
name: Bug report
about: Create a report to help us improve
title: "Issue title"
labels: ''
assignees: ''

---

**ISSUES will not receive priority that do not follow this template or cannot be easily reproduced or diagnosed**

**Describe the bug**
A clear and complete description of what the bug is. Please explain in detail what the bug is. Most people are too brief in the description and it results in delays addressing issues as we go back and forth with questions. Please spend some time writing a complete description.

**To Reproduce**

Steps to reproduce the behavior:

1. Clone this repository. Must test against the current master branch in the repository.
2. Edit your reproducible, MINIMAL, stand-alone test case into the test/debug.ts file.
3. Run via `jest debug` or run VS code in the top level directory.

If you don't edit debug.ts and provide snippets of code, then your issue may not receive priority.

Ensure that your debug.ts includes:

1. Your OneTable schema (complete schema with indexes and models).
2. Actual API code that is failing. Don't use code snippets. Add comments where helpful.
3. Run API with params of {log: true} and include generated DynamoDB API calls
4. The test case is a minimal as possible. Remove all unnecessary code and options.

Check that:

1. You are using a current version of Node and NPM

**Cut/Paste**

Include the code from your debug.ts here and replace the CODE segment. Remember to preserve the three backticks above and below the code block.  See [Formatting Code](https://www.freecodecamp.org/news/how-to-format-code-in-markdown/) for details.

```
PUT YOUR DEBUG.TS CODE HERE.
```

```
PUT YOUR LOG OUTPUT HERE showing the actual DynamoDB command issued.
```

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - OS
 - Node Version
 - OneTable Version
 - TypeScript Version
 - Any other relevant environment information

**Additional context**
Add any other context about the problem here.
