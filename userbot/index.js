'use strict';

const puppeteer = require('puppeteer'); 
const Instauto = require('./my-instauto');
const process = require('node:process');
const fs = require('fs');

// Custom logger with timestamps
const log = (fn, ...args) => console[fn](new Date().toISOString(), ...args);
const logger = Object.fromEntries(['log', 'info', 'debug', 'error', 'trace', 'warn'].map((fn) => [fn, (...args) => log(fn, ...args)]));

const data = require('../accounts/' + process.argv[2] + '/data.json');

// Graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

// Options
const options = {
  cookiesPath: './accounts/' + process.argv[2] + '/cookies.json',

  username: data["username"],
  password: data["password"],

  maxFollowsPerHour: data["maxFollowsPerHour"] != null ? parseInt(data["maxFollowsPerHour"], 10) : 20,
  
  maxFollowsPerDay: data["maxFollowsPerDay"] != null ? parseInt(data["maxFollowsPerDay"], 10) : 150,

  maxLikesPerDay: data["maxLikesPerDay"] != null ? parseInt(data["maxLikesPerDay"], 10) : 500,

  // Ratio = followers / followed
  followUserRatioMin: data["followUserRatioMin"] != null ? parseFloat(data["followUserRatioMin"]) : 0.1,
  followUserRatioMax: data["followUserRatioMax"] != null ? parseFloat(data["followUserRatioMax"]) : 10.0,
  
  followUserMaxFollowers: data["followUserMaxFollowers"] != null ? parseInt(data["followUserMaxFollowers"], 10) : 5000,
  followUserMaxFollowing: null,
  
  followUserMinFollowers: data["followUserMinFollowers"] != null ? parseInt(data["followUserMinFollowers"], 10) : 20,
  followUserMinFollowing: null,

  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

  // Usernames that we should not touch, e.g. your friends and actual followings
  excludeUsers: [],

  // If true, will not do any actions (defaults to true)
  dryRun: false,

  logger,
};

(async () => {
  let browser;
   
  try {
    // Browser initialization
    if (data["proxy"] && data["proxy"] != '0.0.0.0') {
      browser = await puppeteer.launch({
        headless: true,

        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--proxy-server=' + data["proxy"],
        ],
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,

        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
    }
    
    // Database initialization
    const instautoDb = await Instauto.JSONDB({
      followedDbPath: './accounts/' + process.argv[2] + '/followed.json',
      unfollowedDbPath: './accounts/' + process.argv[2] + '/unfollowed.json',
      likedPhotosDbPath: './accounts/' + process.argv[2] + '/liked-photos.json',
    });
    
    // Pass options and login
    const instauto = await Instauto(instautoDb, browser, options);
    
    // Get or load followers
    let followers;
    const pages = data["followersPages"] != null ? parseInt(data["followersPages"], 10) : 500
    if (fs.existsSync('./accounts/shared/' + data["followersOf"] + '-followers.json')) {
      followers = require('../accounts/shared/' + data["followersOf"] + '-followers.json');
    } else {
      console.log("No file for the selected user, downloading followers of: " + data["followersOf"]);
      followers = await instauto.processUser(data["followersOf"], pages);
    }

    // Action 
    switch (data["action"]) {
      case "follow":
	await actionFollow(data, followers, instauto);
        break;
      case "stories":
	await actionStories(data, followers, instauto);
        break;
      case "dms":
	await actionDms(data, followers, instauto);
        break;
      default:
        throw new Error("Nessuna azione selezionata!");
        break;
    } 

    console.log('Done running');
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Closing browser');
    if (browser) await browser.close();
  }
})();

// Action functions
async function actionFollow(data, followers, instauto) {
  const userToFollowFollowersOf = data["followersOf"];
    
  const fixedMaxFollows = data["fixedMaxFollows"] != null ? parseInt(data["fixedMaxFollows"], 10) : 20;
  const fixedSleepBetweenMaxFollows = data["fixedSleepBetweenMaxFollows"] != null ? parseInt(data["fixedSleepBetweenMaxFollows"], 10) : 3;
  const maxFollowsPerDay = data["maxFollowsPerDay"] != null ? parseInt(data["maxFollowsPerDay"], 10) : 150;
    
  let cicles = Math.floor(maxFollowsPerDay / fixedMaxFollows);
  if ((maxFollowsPerDay % fixedMaxFollows) != 0) {
    iterations++;
  }

  let result;
  while (cicles > 0 && followers.length > 0) {
    result = await instauto.followUserFollowers(userToFollowFollowersOf, followers, {
      maxFollowsPerUser: 2000,
      skipPrivate: false,
      enableLikeImages: true,
      likeImagesMin: 1,
      likeImagesMax: 3,
      fixedMaxFollows: fixedMaxFollows,
    });
    
    if (result.followers) followers = result.followers;
    if (!result.sleep) return;
    
    // Update followers or break
    if (followers && followers.length > 0) {
      followers = JSON.stringify(followers);
      fs.writeFileSync('./accounts/shared/' + data["followersOf"] + '-followers.json', followers);
    } 

    if (followers && followers.length == 0) {
      fs.unlinkSync('./accounts/shared/' + data["followersOf"] + '-followers.json');
      throw new Error("IMPORTANTE!!! Archivio terminato, cambiare il profilo da cui estrarre gli utenti!");
      break;
    }

    cicles--;
	
    if (cicles > 0) {
      console.log("Sleeping for: " + fixedSleepBetweenMaxFollows + " hours, remaining cicles: " + cicles);
      await instauto.sleepFixed(fixedSleepBetweenMaxFollows * 60 * 60 * 1000);
    }
  }
}

async function actionStories(data, followers, instauto) {
  const userToProcess = data["followersOf"];

  let cicles = data["storiesFixedCicles"] != null ? parseInt(data["storiesFixedCicles"], 10) : 3;
  const storiesPerHour = data["maxStoriesPerHour"] != null ? parseInt(data["maxStoriesPerHour"], 10) : 6;

  while (cicles > 0) {
    let endOfHour = Date.now() + 60 * 60 * 1000;

    followers = await instauto.processUserForStories(userToProcess, followers, storiesPerHour);
    
    // Update followers or break
    if (followers && followers.length > 0) {
      followers = JSON.stringify(followers);
      fs.writeFileSync('./accounts/shared/' + data["followersOf"] + '-followers.json', followers);
    } 

    if (followers && followers.length == 0) {
      fs.unlinkSync('./accounts/shared/' + data["followersOf"] + '-followers.json');
      throw new Error("IMPORTANTE!!! Archivio terminato, cambiare il profilo da cui estrarre gli utenti!");
      break;
    }

    cicles--;
   
    if (cicles > 0 && endOfHour > Date.now()) {
      let ms = endOfHour - Date.now();
      console.log("Sleeping for " + ms / 1000 + " seconds, remaining cicles: " + cicles);
      await instauto.sleepFixed(ms);
    }
  }
}

async function actionDms(data, followers, instauto) {
  const userToProcess = data["followersOf"];

  let cicles = data["dmsFixedCicles"] != null ? parseInt(data["dmsFixedCicles"], 10) : 3;
  const dmsPerHour = data["maxDmsPerHour"] != null ? parseInt(data["maxDmsPerHour"], 10) : 6;

  const messages = data["messages"] != null ? data["messages"].split(' / ') : [];

  while (cicles > 0 && followers.length > 0) {
    let endOfHour = Date.now() + 60 * 60 * 1000;

    followers = await instauto.processUserForDms(userToProcess, followers, messages, dmsPerHour);
   
    // Update followers or break
    if (followers && followers.length > 0) {
      followers = JSON.stringify(followers);
      fs.writeFileSync('./accounts/shared/' + data["followersOf"] + '-followers.json', followers);
    } 

    if (followers && followers.length == 0) {
      fs.unlinkSync('./accounts/shared/' + data["followersOf"] + '-followers.json');
      throw new Error("IMPORTANTE!!! Archivio terminato, cambiare il profilo da cui estrarre gli utenti!");
      break;
    }
	
    cicles--;

    if (cicles > 0 && endOfHour > Date.now() && followers.length > 0) {
      let ms = endOfHour - Date.now();
      console.log("Sleeping for " + ms / 1000 + " seconds, remaining cicles: " + cicles);
      await instauto.sleepFixed(ms);
    }
  }
}
