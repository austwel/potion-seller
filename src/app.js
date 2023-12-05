import { DiscordRequest } from './utils.js';

const cc_schedule = ['Palaistra → VH', 'Volcanic → CC', 'Clockwork → PL', 'Palaistra → C9', 'Cloud Nine → RS', 'Red Sands → PL']
const fl_schedule = ['Shatter → Onsal', 'Onsal → Seal Rock', 'Seal Rock → Shatter']

let retry = 0
let error = null
let loopcount = 0

const delay = ms => new Promise(res => setTimeout(res, ms));

while(true) {
  //Update Channels
  let current_timestamp = Date.now()
  let now = Math.floor((current_timestamp % 32400000)/5400000) //Which map
  let into_map = Math.round(Math.floor((current_timestamp % 5400000)/60000)/5)*5 //Minutes into map

  console.log(`${cc_schedule[now]} (${90-into_map}m)`)
  try{
    await DiscordRequest(`/channels/${process.env.CC_CHANNEL}`, {
      method: 'PATCH',
      body: {
        name: `${cc_schedule[now]} (${90-into_map}m)`
      }
    })
    error = null
  } catch (err) {
    error = JSON.parse(String(err).replace('Error: ', ''))
    console.log(error);
    retry = error['retry_after']
  }

  if(error != null) {
    await delay(retry * 1000)
  }

  if(loopcount%10==0) {
    await delay(60000)
    current_timestamp = Date.now()
    let day = Math.floor(((current_timestamp - 54000000) % 259200000)/86400000) //Which map
    let into_day = Math.floor(((current_timestamp - 54000000) % 86400000)/3600000) //Hours into map

    console.log(`${fl_schedule[day]} (${24-into_day}h)`)
    try{
      await DiscordRequest(`/channels/${process.env.FL_CHANNEL}`, {
        method: 'PATCH',
        body: {
          name: `${fl_schedule[day]} (${24-into_day}h)`
        }
      })
      error = null
    } catch (err) {
      error = JSON.parse(String(err).replace('Error: ', ''))
      console.log(error);
      retry = error['retry_after']
    }

    if(error != null) {
      await delay(retry * 1000)
    }
  }

  await delay(60000)
  loopcount += 1
}