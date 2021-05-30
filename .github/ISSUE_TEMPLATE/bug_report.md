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
1. Include your OneTable schema
2. Include actual API code that is failing
3. Include data values and context values
4. Run API with params of {log: true} and include generated DynamoDB API calls
5. Ensure you are using a current version of Node and NPM

Try using a Table logger and {log: true} in your API and include the DynamoDB command 
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
