import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

const REGISTER_COMMAND = {
  name: 'register',
  description: 'Register a Final Fantasy XIV Character',
  type: 1,
  options: [
    {
      name: 'character',
      description: 'Character Name',
      type: 3,
      required: true
    },
    {
      name: 'discord-user',
      description: 'Discord User',
      type: 6,
      required: false
    }
  ]
};

const RANK_COMMAND = {
  name: 'rank',
  description: 'Check the rank of a Final Fantasy XIV Character',
  type: 1,
  options: [
    {
      name: 'character',
      description: 'Character Name',
      type: 3,
      required: false
    },
    {
      name: 'discord-user',
      description: 'Discord User',
      type: 6,
      required: false
    }
  ]
}

const TOP100_COMMAND = {
  name: 'top100',
  description: 'Show the top 100 CC players',
  type: 1
}

// Command containing options
/*const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
};*/

const ALL_COMMANDS = [TEST_COMMAND, REGISTER_COMMAND, TOP100_COMMAND, RANK_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);