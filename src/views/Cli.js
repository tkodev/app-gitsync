// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import inquirer from 'inquirer';

// local dependencies

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class CliView {
  load() {
    console.log('[cli]', 'starting');
  }
  unload() {
    console.log('[cli]', 'exiting');
  }
  log(...messages) {
    console.log(...messages);
  }
  async ask(prefix, message, choices) {
    return inquirer
      .prompt({
        type: 'rawlist',
        name: 'answer',
        message,
        prefix,
        choices: [...choices.map((choice) => ({ name: choice, value: choice[0] })), new inquirer.Separator(), { name: 'skip', value: 's' }],
        default: 's'
      })
      .then((response) => response.answer);
  }
}
