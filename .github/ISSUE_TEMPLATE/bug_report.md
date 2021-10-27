---
name: Bug report
about: Create a report to help us improve
title: "[BUG]: Issue title"
labels: ''
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Reproduce by cloning this repository and then edit the test/debug.ts wnd test/schemas/debugSchema.ts ith your code and execute via `jest debug`. You can debug this by running VS code in the top level directory. It is setup to debug the debug.ts file. Alternatively, submit a completely stand-alone single file test case sample that demonstrates the issue.
2. Include your OneTable schema
3. Include actual API code that is failing
4. Include data values and context values
5. Run API with params of {log: true} and include generated DynamoDB API calls
6. Ensure you are using a current version of Node and NPM
7. Format all code in your issue using Markdown and 3 backticks. See [Formatting Code](https://www.freecodecamp.org/news/how-to-format-code-in-markdown/).

Using the Table logger and {log: true} in your API and include the DynamoDB command 
that is being generated.

```
Table({
    ...
    logger: true
})

and

await Model.get({...}, {log: true})
```

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - OS
 - Node Version

**Additional context**
Add any other context about the problem here.
