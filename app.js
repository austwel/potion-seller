import 'dotenv/config';
import express, { response } from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

const name_lookup_regex = /(?<=<h3>)(.{1,50})(?=<\/h3>)/g
const image_lookup_regex = /(?<=<div class="face-wrapper">\s+<img src=")([^ ]{1,100})(?=")/g
const rank_lookup_regex = /(?<=width="90" height="60" alt=")([^ ]{1,10})(?=")/g
const subrank_lookup_regex = /(?<=class="js--wolvesden-tooltip">\s+<p>)([^ ]{1,2})(?=<\/p>)/g
const wins_lookup_regex = /(?<=class="wins">\s+<div>\s+<p>)([^ ]{1,4})(?=<\/p>)/g

const crystal_image_url = 'https://img.finalfantasyxiv.com/lds/h/y/WFLIqCl8lscrYM-Sn50exwOc5k.png'
const diamond_image_url = 'https://img.finalfantasyxiv.com/lds/h/x/IjHuUaQ91TLc8jQS0CXOD8x2aI.png'

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

let discord_links = {}
let rank_data = {}

let t100_res = await fetch('https://na.finalfantasyxiv.com/lodestone/ranking/crystallineconflict/?dcgroup=Materia')
let t100_data = await t100_res.text()
let names = t100_data.match(name_lookup_regex)
//let player_images = t100_data.match(image_lookup_regex)
let ranks = t100_data.match(rank_lookup_regex)
let subranks = t100_data.match(subrank_lookup_regex)
let wins = t100_data.match(wins_lookup_regex)
for(let i=0;i<100;i++) {
  rank_data[names[i]] = `${ranks[i]} ${subranks[i]}`
}

let crystal = '[2;34m'
let diamond = '[2;36m'
let platinum = '[2;37m'
let gold = '[2;33m'
let silver = '[2;30m'
let bronze = '[2;31m'
let iron = '[2;30m'

let end = '[0;0m'

function colour(rank) {
  switch(rank) {
    case 'Crystal':
      return crystal
    case 'Diamond':
      return diamond
    case 'Platinum':
      return platinum
    case 'Gold':
      return gold
    case 'Silver':
      return silver
    case 'Bronze':
      return bronze
    case 'Iron':
      return iron
    default:
      return end
  }
}

const cc_schedule = ['Red Sands', 'Palaistra', 'Volcanic', 'Clockwork', 'Palaistra', 'Cloud Nine']
const fl_schedule = ['Shatter', 'Onsal', 'Seize']
//Update Channels
setInterval(async function() {
  let current_timestamp = Date.now()
  let now = Math.floor((current_timestamp % 32400000)/5400000) //Which map
  let into_map = Math.floor((current_timestamp % 5400000)/60000) //Minutes into map

  let day = Math.floor(((current_timestamp - 54000000) % 259200000)/86400000) //Which map
  let into_day = Math.floor(((current_timestamp - 54000000) % 86400000)/3600000) //Hours into map
  console.log(`CC: ${cc_schedule[now]} (${90-into_map}m left)`)
  console.log(`FL: ${fl_schedule[day]} (${24-into_day}h left)`)
  try{
    await DiscordRequest('/channels/1174017778349506673', {
      method: 'PATCH',
      body: {
        name: `CC: ${cc_schedule[now]} (${90-into_map}m left)`
      }
    })
    await DiscordRequest('/channels/1174018685149642812', {
      method: 'PATCH',
      body: {
        name: `FL: ${fl_schedule[day]} (${24-into_day}h left)`
      }
    })
  } catch (err) {
    console.error(err);
  }
  
}, 1000 * 120) //5 Minutes

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'hello world ' + getRandomEmoji(),
        },
      });
    }

    if (name === 'register') {
      let discorder = req.body.member.user.id
      let character = null
      for(const option of req.body.data.options) {
        if(option.name == 'character') {
          character = option.value
        } else if(option.name == 'discord-user') {
          discorder = option.value
        }
      }
      discord_links[discorder] = character
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Registered character ' + character + ` to discord user <@${discorder}>`
        }
      })
    }

    if (name === 'rank') {
      let discorder = null
      let character = null
      if(req.body.data.options == null) {
        discorder = req.body.member.user.id
        character = discord_links[discorder]
      } else if(req.body.data.options[0].name == 'character'){
        character = req.body.data.options[0].value
      } else if(req.body.data.options[0].name == 'discord-user'){
        discorder = req.body.data.options[0].value
        character = discord_links[discorder]
      }
      let display = null
      if(discorder != null) {
        display = `<@${discorder}> (${character})`
      } else {
        display = character
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `${display} is ${rank_data[character]}.`
        }
      })
    }

    if (name === 'top100') {
      let t100_res = await fetch('https://na.finalfantasyxiv.com/lodestone/ranking/crystallineconflict/?dcgroup=Materia')
      let t100_data = await t100_res.text()
      let names = t100_data.match(name_lookup_regex)
      //let player_images = t100_data.match(image_lookup_regex)
      let ranks = t100_data.match(rank_lookup_regex)
      let subranks = t100_data.match(subrank_lookup_regex)
      for(let i=0;i<100;i++) {
        rank_data[names[i]] = `${ranks[i]} ${subranks[i]}`
      }

      let field1string = `${colour(ranks[0])}1. ${names[0].replaceAll('&#39;', "'")}${end}`
      let field2string = `${colour(ranks[0])}${ranks[0]} ${subranks[0]} ★☆☆${end}`
      let field3string = `${colour(ranks[0])}${wins[0]}${end}`
      let field4string = `${colour(ranks[25])}26. ${names[25].replaceAll('&#39;', "'")}${end}`
      let field5string = `${colour(ranks[25])}${ranks[25]} ${subranks[25]} ★★☆${end}`
      let field6string = `${colour(ranks[25])}${wins[25]}${end}`
      let field7string = `${colour(ranks[50])}51. ${names[50].replaceAll('&#39;', "'")}${end}`
      let field8string = `${colour(ranks[50])}${ranks[50]} ${subranks[50]} ★★☆${end}`
      let field9string = `${colour(ranks[50])}${wins[50]}${end}`
      let field10string = `${colour(ranks[75])}76. ${names[75].replaceAll('&#39;', "'")}${end}`
      let field11string = `${colour(ranks[75])}${ranks[75]} ${subranks[75]} ★★☆${end}`
      let field12string = `${colour(ranks[75])}${wins[75]}${end}`
      for(let i = 1; i < 25; i++) {
        field1string = field1string + '\n' + `${colour(ranks[i])}${i+1}. ${names[i].replaceAll('&#39;', "'")}`
        field2string = field2string + '\n' + `${colour(ranks[i])}${ranks[i]} ${subranks[i]} ★☆☆`
        field3string = field3string + '\n' + `${colour(ranks[i])}${wins[i]}`
      }
      for(let i = 26; i < 50; i++) {
        field4string = field4string + '\n' + `${colour(ranks[i])}${i+1}. ${names[i].replaceAll('&#39;', "'")}`
        field5string = field5string + '\n' + `${colour(ranks[i])}${ranks[i]} ${subranks[i]} ★★☆`
        field6string = field6string + '\n' + `${colour(ranks[i])}${wins[i]}`
      }
      for(let i = 51; i < 75; i++) {
        field7string = field7string + '\n' + `${colour(ranks[i])}${i+1}. ${names[i].replaceAll('&#39;', "'")}`
        field8string = field8string + '\n' + `${colour(ranks[i])}${ranks[i]} ${subranks[i]} ★★☆`
        field9string = field9string + '\n' + `${colour(ranks[i])}${wins[i]}`
      }
      for(let i = 76; i < 100; i++) {
        field10string = field10string + '\n' + `${colour(ranks[i])}${i+1}. ${names[i].replaceAll('&#39;', "'")}`
        field11string = field11string + '\n' + `${colour(ranks[i])}${ranks[i]} ${subranks[i]} ★★☆`
        field12string = field12string + '\n' + `${colour(ranks[i])}${wins[i]}`
      }

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: 'Crystalline Conflict Top 100',
              image: {
                url: 'https://img.finalfantasyxiv.com/lds/h/P/qwbCUl2i4zmeoDDdqJ-q6e8t3c.png'
              },
              footer: {
                text: 'Crystalline Conflict (Materia)',
                icon_url: 'https://img.finalfantasyxiv.com/lds/h/L/GRs6vMpBpvuo37ksmrL_Sv4Q_E.png'
              },
              type: 'rich',
              color: 255,
              fields: [
                {
                  name: '1-25',
                  value: '```ansi\n' + field1string + '```',
                  inline: true
                },
                {
                  name: 'Rank',
                  value: '```ansi\n' + field2string + '```',
                  inline: true
                },
                {
                  name: 'Wins',
                  value: '```ansi\n' + field3string + '```',
                  inline: true
                },
                {
                  name: '26-50',
                  value: '```ansi\n' + field4string + '```',
                  inline: true
                },
                {
                  name: 'Rank',
                  value: '```ansi\n' + field5string + '```',
                  inline: true
                },
                {
                  name: 'Wins',
                  value: '```ansi\n' + field6string + '```',
                  inline: true
                },
                {
                  name: '51-75',
                  value: '```ansi\n' + field7string + '```',
                  inline: true
                },
                {
                  name: 'Rank',
                  value: '```ansi\n' + field8string + '```',
                  inline: true
                },
                {
                  name: 'Wins',
                  value: '```ansi\n' + field9string + '```',
                  inline: true
                },
                {
                  name: '76-100',
                  value: '```ansi\n' + field10string + '```',
                  inline: true
                },
                {
                  name: 'Rank',
                  value: '```ansi\n' + field11string + '```',
                  inline: true
                },
                {
                  name: 'Wins',
                  value: '```ansi\n' + field12string + '```',
                  inline: true
                }
              ]
            }
          ]
        }
      })
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
