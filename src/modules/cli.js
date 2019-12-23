// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { prompt as iqPrompt, Separator as IqSeparator } from 'inquirer';

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export function log(...messages) {
  console.log(...messages);
}

export async function ask(prefix, message, choices) {
  return iqPrompt({
    type: 'rawlist',
    name: 'answer',
    message,
    prefix,
    choices: choices.map((choice) => (choice.name === 'separator' || choice.name === '-' ? new IqSeparator() : choice)),
    default: 'skip'
  }).then((response) => response.answer);
}
