---
name: Bug report
about: Create a report to help us improve
title: "Issue title"
labels: ''
assignees: ''

---

**ISSUES will not receive priority that do not complete this template. They will be flagged as "Insufficient Information" and may be closed without any action.**

**Describe the bug**

A clear and complete description of what the bug is. Please explain in detail what the bug is. Most people are too brief in the description and it results in delays addressing issues as we go back and forth with questions. Please spend some time writing a complete description.

Please don't just paste an issue with this template not completed with all required information.

**To Reproduce**

Include a link to a gist or repository containing a debug.ts that reproduces your issue. Reproductions must be short, correct, self-contained and must not contain code that isn't relevant to the issue. Please do NOT just paste code from your project. Explaining how to reproduce is most often insufficient. It may be clear to you, but typically is less than clear to others. Furthermore, it puts the burden of creating a test case onto the volunteer maintainers and isn't scalable. If such a reproduction is not provided, the issue may be closed without comment.

Steps to reproduce the behavior:

1. Clone this repository. Must test against the current master branch in the repository.
2. Edit your reproducible, MINIMAL, stand-alone test case into the test/debug.ts file.
3. Run via `jest debug` or run VS code in the top level directory.

If you don't provide a complete debug.ts that demonstrates your issue, then your issue will not receive priority and may be closed without comment.

Ensure that your debug.ts includes:

1. Your OneTable schema (complete schema with indexes and models).
2. Actual API code that is failing. Don't use code snippets. Add comments where helpful.
3. Run API with params of {log: true} and include generated DynamoDB API calls
4. The test case is a minimal as possible. Remove all unnecessary code and options.

Check that:

1. You are using a current version of Node and NPM
2. The debug.ts actually executes using 'jest debug'

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
