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
    choices: [...choices, new IqSeparator(), { name: 'skip', value: 'skip' }],
    default: 'skip'
  }).then((response) => response.answer);
}
