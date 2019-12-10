// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import inquirer from 'inquirer';

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export function log(...messages) {
  console.log(...messages);
}

export async function ask(prefix, message, choices) {
  return inquirer
    .prompt({
      type: 'rawlist',
      name: 'answer',
      message,
      prefix,
      choices: [...choices, new inquirer.Separator(), { name: 'skip', value: 'skip' }],
      default: 'skip'
    })
    .then((response) => response.answer);
}
