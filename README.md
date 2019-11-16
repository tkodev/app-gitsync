# app-gitsync
CLI application to batch sync local git repos with cloud git providers

# Code Architecture
- Uses functional approad to code structure.
  - modules store and export functions in their scope
  - schema store and export object templates
- Example program flow:
  - index.js initializes cli module
  - cli function returns required tasks to run
  - index.js runs appropriate task function which calculates changes needed, calls functions in github.js and local.js
  - github.js and local.js functions execute actions on their respective services (local git or github api);