/*
LootGenerator
A Roll20 script for generating random loot

On Github:	https://github.com/blawson69
Contact me: https://app.roll20.net/users/1781274/ben-l
Like this script? Buy me a coffee: https://venmo.com/theRealBenLawson
*/

var LootGenerator = LootGenerator || (function () {
    'use strict';

    //---- INFO ----//

    var version = '0.2',
    debugMode = false,
    styles = {
        box:  'background-color: #fff; border: 1px solid #000; padding: 8px 10px; border-radius: 6px; margin-left: -40px; margin-right: 0px;',
        title: 'padding: 0 0 10px 0; color: ##591209; font-size: 1.5em; font-weight: bold; font-variant: small-caps; font-family: "Times New Roman",Times,serif;',
        sub: 'font-size: 0.75em; text-align: right;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 5px 8px; color: #fff; text-align: center;',
        buttonWrapper: 'text-align: center; margin: 10px 0; clear: both;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #591209; text-decoration: underline;',
        fullWidth: 'width: 100%; display: block; padding: 12px 0; text-align: center;',
        code: 'font-family: "Courier New", Courier, monospace; padding-bottom: 6px;',
        accent: 'background-color: ##eaeaea;'
    },

    checkInstall = function () {
        if (!_.has(state, 'LootGenerator')) {
            state['LootGenerator'] = state['LootGenerator'] || {};
            if (typeof state['LootGenerator'].useGems == 'undefined') state['LootGenerator'].useGems = true;
            if (typeof state['LootGenerator'].useArt == 'undefined') state['LootGenerator'].useArt = true;
            if (typeof state['LootGenerator'].useMundane == 'undefined') state['LootGenerator'].useMundane = true;
            if (typeof state['LootGenerator'].useMagic == 'undefined') state['LootGenerator'].useMagic = true;
            if (typeof state['LootGenerator'].gems == 'undefined') state['LootGenerator'].gems = null;
            if (typeof state['LootGenerator'].art == 'undefined') state['LootGenerator'].art = null;
            if (typeof state['LootGenerator'].mundane == 'undefined') state['LootGenerator'].mundane = null;
            if (typeof state['LootGenerator'].magic == 'undefined') state['LootGenerator'].magic = null;
            if (typeof state['LootGenerator'].spells == 'undefined') state['LootGenerator'].spells = null;
            adminDialog('Build Database', 'This is your first time using LootGenerator, so you must build your treasure database. '
            + '<br><div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --setup">Run Setup</a></div>');
        }

        log('--> LootGenerator v' + version + ' <-- Initialized');
		if (debugMode) {
            var d = new Date();
            adminDialog('Debug Mode', 'LootGenerator loaded at ' + d.toLocaleTimeString());
        }
    },

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!loot')) {
			var parms = msg.content.split(/\s+/i);
			if (parms[1] && playerIsGM(msg.playerid)) {
				switch (parms[1]) {
					case '--setup':
						commandSetup(msg);
						break;
                    case '--config':
						commandConfig();
						break;
					case '--show':
						commandGenerate(msg);
						break;
                    case '--toggle':
						commandToggle(msg.content);
						break;
                    case '--export':
						commandExport(msg.content);
						break;
                    case '--import':
						commandImport(msg.content);
						break;
					case '--help':
                    default:
						commandHelp();
				}
			}
		}
    },

    //----- COMMAND FUNCTIONS -----//

    commandGenerate = function (msg) {
        // Parse command and generate loot
        //!loot --show --type:Indv1 --loc:Wizard's Chest --recip:Player Name --mod:no-art,no-gems --incl:Special Quest Item
        var dieroll, type, level = 0, horde, mod = '', loc = '', recip = '', message, title = 'Loot', loot = [], treasure = [], coins = '', xtra = '',
        rm = /\-\-mod/gi, rx = /\-\-incl/gi, rl = /\-\-loc/gi, rr = /\-\-recip/gi, rd = /\d+/gi,
        cmds = msg.content.split('--');
        if (rl.test(msg.content)) loc = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('loc:') }).split(':')[1].trim();
        if (rr.test(msg.content)) recip = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('recip:') }).split(':')[1].trim();
        if (rm.test(msg.content)) mod = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('mod:') }).split(':')[1].trim();
        if (rx.test(msg.content)) xtra = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('incl:') }).split(':')[1].trim();

        type = _.find(cmds, function(tmpStr){ return tmpStr.startsWith('type:') }).trim();
        if (type) {
            type = type.split(':')[1];
            if (rd.test(type)) level = _.last(type.split('')); // 1-4 corresponding to CR levels 0-4, 5-10, 11-16 & 17+
            horde = (type.toLowerCase().startsWith('ind')) ? false : true; // Horde or Indiv
            dieroll = randomInteger(100);

            if (mod.search('no-coins') == -1) coins = generateCoins(modifyRoll(dieroll, 'coins', mod), horde, level);
            if (coins != '') loot.push(coins);

            if ((state['LootGenerator'].useMundane && mod.search('no-mundane') == -1) || mod.search(/[show|less|more]\-mundane/gi) >= 0) {
                treasure.push(generateMundane(modifyRoll(dieroll, 'mundane', mod), horde, level));
            }
            if (horde) {
                if ((state['LootGenerator'].useGems && mod.search('no-gems') == -1) || mod.search(/[show|less|more]\-gems/gi) >= 0) treasure.push(generateGems(modifyRoll(dieroll, 'gems', mod), level));
                if ((state['LootGenerator'].useArt && mod.search('no-art') == -1) || mod.search(/[show|less|more]\-art/gi) >= 0) treasure.push(generateArt(modifyRoll(dieroll, 'art', mod), level));
                if ((state['LootGenerator'].useMagic && mod.search('no-magic') == -1) || mod.search(/[show|less|more]\-magic/gi) >= 0) treasure.push(generateMagicItems(modifyRoll(dieroll, 'magic', mod), level));
            }
            if (xtra != '') {
                xtra = xtra.replace(/\\|\[|\]|\{|\}|\||\%|\$|\#|\@|\|/g, '');
                treasure.push(xtra.split(/\s*,\s*/));
            }
            treasure = _.shuffle(_.flatten(treasure));

            if (_.size(treasure) > 0) loot.push(treasure);
            loot = _.flatten(loot);

            title += (loc) ? ' from ' + loc : '';
            message = (recip) ? recip + ', you found: ' : 'You found: ';
            if (debugMode) message += '(on die roll ' + dieroll + ') ';
            message += enumerateItems(loot).join(', ');
            showDialog(title, message);

            // Provide access to PurseStrings functions
            if (typeof PurseStrings !== 'undefined' && coins != '' && coins != '[coins error]') {
                var psMessage = 'Coins found: ' + coins + '.'
                + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --dist ' + coins + '">Distribute to Party Members</a></div>'
                + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --add ' + coins + '">Add to <i>selected character</i></a></div>'
                + '<div style=\'' + styles.sub + '\'>via PurseStrings</div>';
                adminDialog('', psMessage);
            }

            // Provide access to PotionManager functions
            var potions = _.filter(loot, function (item) { return item.search('Potion of') >= 0; });
            if (typeof PotionManager !== 'undefined' && potions && _.size(potions) > 0) {
                potions = _.uniq(potions);
                let numText = ( _.size(potions) == 1) ? ' type of <b>Potion</b> was ' : ' types of <b>Potion</b> were ';
                let pmMessage = _.size(potions) + numText + 'found.<table style="border: 1px; width: 100%;">';
                _.each(potions, function(potion) {
                    pmMessage += '<tr><td style="width: 100%"><a style=\'' + styles.textButton + '\' href="!pm --add ' + potion + '">' + potion
                    + '</a></td><td><a style=\'' + styles.textButton + '\' href="!pm --view ' + potion + '">view</a></td></tr>';
                });
                pmMessage += '</table><div style=\'' + styles.sub + '\'>via PotionManager</div>';
                adminDialog('', pmMessage);
            }

            // Provide access to GearManager functions
            var ag = ['Acid','Alchemist\'s Fire','Antitoxin','Ball Bearings','Poison','Caltrops','Healer\'s Kit','Holy Water','Oil','Philter of Love','Torch'],
            wi = ['Dust of Disappearance','Dust of Dryness','Dust of Sneezing and Choking','Eyes of Charming','Gem of Seeing','Helm of Teleportation','Marvelous Pigments','Oil of Etherealness','Oil of Sharpness','Oil of Slipperiness','Pipes of Haunting','Pipes of the Sewers','Restorative Ointment','Robe of Scintillating Colors','Sovereign Glue','Universal Solvent'];
            var advGear = _.intersection(loot, ag);
            var wondItems = _.intersection(loot, wi);
            if (typeof GearManager !== 'undefined' && ((advGear && _.size(advGear) > 0) || (wondItems && _.size(wondItems) > 0))) {
                var nText, gmMessage = '';
                advGear = _.uniq(advGear);
                if (advGear && _.size(advGear) > 0) {
                    nText = (_.size(advGear) == 1) ? ' type of <b>Adventuring Gear</b> was ' : ' types of <b>Adventuring Gear</b> were ';
                    gmMessage += _.size(advGear) + nText + 'found.<table style="border: 1px; width: 100%;">';
                    _.each(advGear, function(item) {
                        gmMessage += '<tr><td style="width: 100%"><a style=\'' + styles.textButton + '\' href="!gm --add ' + item + '">' + item
                        + '</a></td><td><a style=\'' + styles.textButton + '\' href="!gm --view ' + item + '">view</a></td></tr>';
                    });
                    gmMessage += '</table>';
                }

                if (wondItems && _.size(wondItems) > 0) {
                    if (gmMessage != '') gmMessage += '<br>';
                    wondItems = _.uniq(wondItems);
                    nText = (_.size(wondItems) == 1) ? ' type of <b>Wondrous Item</b> was ' : ' types of <b>Wondrous Items</b> were ';
                    gmMessage += _.size(wondItems) + ' type of ' + nText + 'found.<table style="border: 1px; width: 100%;">';
                    _.each(wondItems, function(item) {
                        gmMessage += '<tr><td style="width: 100%"><a style=\'' + styles.textButton + '\' href="!gm --add ' + item + '">' + item
                        + '</a></td><td><a style=\'' + styles.textButton + '\' href="!gm --view ' + item + '">view</a></td></tr>';
                    });
                    gmMessage += '</table>';
                }

                gmMessage += '<div style=\'' + styles.sub + '\'>via GearManager</div>';
                adminDialog('', gmMessage);
            }

        } else {
            adminDialog('Error','No valid treasure level was provided. Please try again.');
        }
    },

    generateCoins = function (index, horde, level) {
        // Returns a string with all coins
        var coins = '';
        switch (level) {
            case '1':
                if (horde) {
                    coins += ((randomInteger(31) + 5) * 100) + ' cp, ' + ((randomInteger(16) + 2) * 100) + ' sp, ' + ((randomInteger(11) + 1) * 10) + ' gp';
                } else {
                    if (index <= 30) coins += (randomInteger(26) + 4) + ' cp';
                    else if (index > 30 && index <= 60) coins += (randomInteger(21) + 3) + ' sp';
                    else if (index > 60 && index <= 70) coins += (randomInteger(16) + 2) + ' ep';
                    else if (index > 70 && index <= 95) coins += (randomInteger(16) + 2) + ' gp';
                    else if (index > 95) coins += (randomInteger(6)) + ' pp';
                }
                break;
            case '2':
                if (horde) {
                    coins += ((randomInteger(11) + 1) * 100) + ' cp, ' + ((randomInteger(11) + 1) * 1000) + ' sp, ' + ((randomInteger(30) + 5) * 100)
                    + ' gp, ' + ((randomInteger(16) + 2) * 10) + ' pp';
                } else {
                    if (index <= 30) coins += ((randomInteger(21) + 3) * 100) + ' cp, ' + (randomInteger(6) * 10) + ' ep';
                    else if (index > 30 && index <= 60) coins += ((randomInteger(31) + 5) * 10) + ' sp, ' + ((randomInteger(11) + 1) * 10) + ' gp';
                    else if (index > 60 && index <= 70) coins += (randomInteger(16) + 2) + ' ep, ' + ((randomInteger(11) + 1) * 10) + ' gp';
                    else if (index > 70 && index <= 95) coins += ((randomInteger(21) + 3) * 10) + ' gp';
                    else if (index > 95) coins += ((randomInteger(11) + 1) * 10) + ' gp, ' + (randomInteger(16) + 2) + ' pp';
                }
                break;
            case '3':
                if (horde) {
                    coins += ((randomInteger(21) + 3) * 1000) + ' gp, ' + ((randomInteger(26) + 4) * 100) + ' pp';
                } else {
                    if (index <= 20) coins += ((randomInteger(21) + 3) * 100) + ' sp, ' + (randomInteger(6) * 100) + ' gp';
                    else if (index > 20 && index <= 35) coins += (randomInteger(6) * 100) + ' ep, ' + (randomInteger(6) * 100) + ' gp';
                    else if (index > 35 && index <= 75) coins += ((randomInteger(11) + 1) * 100) + ' gp, ' + (randomInteger(6) * 10) + ' pp';
                    else if (index > 75) coins += ((randomInteger(11) + 1) * 100) + ' gp, ' + ((randomInteger(11) + 1) * 10) + ' pp';
                }
                break;
            case '4':
                if (horde) {
                    coins += ((randomInteger(61) + 11) * 1000) + ' gp, ' + ((randomInteger(26) + 4) * 100) + ' pp';
                } else {
                    if (index <= 15) coins += ((randomInteger(11) + 1) * 1000) + ' ep, ' + ((randomInteger(41) * 7) * 100) + ' gp';
                    else if (index > 15 && index <= 55) coins += (randomInteger(6) * 1000) + ' gp, ' + (randomInteger(6) * 100) + ' pp';
                    else if (index > 55) coins += (randomInteger(6) * 1000) + ' gp, ' + ((randomInteger(11) + 1) * 100) + ' pp';
                }
                break;
            default:
                coins = '[coins error]';
                adminDialog('Error','The treasure level provided is invalid. Please try again.');
        }
        return coins;
    },

    generateGems = function (index, level) {
        // Returns an array of gems
        var count, gems = [];
        if (state['LootGenerator'].gems) {
            var size1 = _.size(state['LootGenerator'].gems.level1) - 1,
            size2 = _.size(state['LootGenerator'].gems.level2) - 1,
            size3 = _.size(state['LootGenerator'].gems.level3) - 1,
            size4 = _.size(state['LootGenerator'].gems.level4) - 1,
            size5 = _.size(state['LootGenerator'].gems.level5) - 1;

            // Gemstone levels by worth:
            // Level 1 = 10 gp, Level2 = 50 gp, level3 = 500 gp, Level4 = 1000 gp, Level5 = 5000 gp
            switch (level) {
                case '1':
                    if ((index >= 7 && index <= 16) || (index >= 37 && index <= 44) || (index >= 61 && index <= 65) || (index >= 76 && index <= 78)) {
                        count = randomInteger(11) + 1;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level1[randomInteger(size1)]);
                        }
                    } else if ((index >= 27 && index <= 36) || (index >= 53 && index <= 60) || (index >= 71 && index <= 75) || (index >= 81 && index <= 85) || (index >= 93 && index <= 97) || index == 100) {
                        count = randomInteger(11) + 1;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level2[randomInteger(size2)]);
                        }
                    }
                    break;
                case '2':
                    if ((index >= 11 && index <= 16) || (index >= 33 && index <= 36) || (index >= 50 && index <= 54) || (index >= 67 && index <= 69) || (index >= 77 && index <= 78) || (index >= 85 && index <= 88)) {
                        count = randomInteger(16) + 2;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level2[randomInteger(size2)]);
                        }
                    } else if ((index >= 17 && index <= 22) || (index >= 37 && index <= 40) || (index >= 55 && index <= 59) || (index >= 70 && index <= 72) || index == 79 || (index >= 89 && index <= 91) || index == 99) {
                        count = randomInteger(11) + 1;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level3[randomInteger(size3)]);
                        }
                    }
                    break;
                case '3':
                    if ((index >= 11 && index <= 12) || (index >= 24 && index <= 26) || (index >= 41 && index <= 45) || (index >= 59 && index <= 62) || (index >= 71 && index <= 72) || (index >= 79 && index <= 80) || (index >= 89 && index <= 90) || (index >= 95 && index <= 96)) {
                        count = randomInteger(16) + 2;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level3[randomInteger(size3)]);
                        }
                    } else if ((index >= 13 && index <= 15) || (index >= 27 && index <= 29) || (index >= 46 && index <= 50) || (index >= 63 && index <= 66) || (index >= 73 && index <= 74) || (index >= 81 && index <= 82) || (index >= 91 && index <= 92) || (index >= 97 && index <= 98) || index >= 99) {
                        count = randomInteger(11) + 1;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level4[randomInteger(size4)]);
                        }
                    }
                    break;
                case '4':
                    if ((index >= 3 && index <= 5) || (index >= 15 && index <= 22) || (index >= 47 && index <= 52) || index == 69 || (index >= 73 && index <= 74) || (index >= 81 && index <= 85)) {
                        count = randomInteger(16) + 2;
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level4[randomInteger(size4)]);
                        }
                    } else if ((index >= 12 && index <= 14) || (index >= 39 && index <= 46) || index == 72 || (index >= 79 && index <= 80) || index >= 96) {
                        count = randomInteger(8);
                        for (var x = 0; x < count; x++) {
                            gems.push(state['LootGenerator'].gems.level5[randomInteger(size5)]);
                        }
                    }
                    break;
                default:
                    gems.push('[gems error]');
                    adminDialog('Error','The treasure level provided is invalid. Please try again.');
            }
        } else {
            gems.push('[gems error]');
            adminDialog('Error','No gems can be found in the database!');
        }
        return enumerateItems(gems);
    },

    generateArt = function (index, level) {
        // Returns an array of art items
        var count, art = [];
        if (state['LootGenerator'].art) {
            var size1 = _.size(state['LootGenerator'].art.level1) - 1,
            size2 = _.size(state['LootGenerator'].art.level2) - 1,
            size3 = _.size(state['LootGenerator'].art.level3) - 1,
            size4 = _.size(state['LootGenerator'].art.level4) - 1,
            size5 = _.size(state['LootGenerator'].art.level5) - 1;

            // Art Object levels by worth:
            // Level 1 = 25 gp, Level2 = 250 gp, level3 = 750 gp, Level4 = 2500 gp, Level5 = 7500 gp
            switch (level) {
                case '1':
                    if ((index >= 17 && index <= 26) || (index >= 45 && index <= 52) || (index >= 79 && index <= 80) || (index >= 86 && index <= 92) || index == 98 || index == 99) {
                        count = randomInteger(7) + 1;
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level1[randomInteger(size1)]);
                        }
                    }
                    break;
                case '2':
                    if ((index >= 5 && index <= 10) || (index >= 23 && index <= 32) || (index >= 45 && index <= 49) || (index >= 64 && index <= 66) || (index >= 75 && index <= 76) || (index >= 81 && index <= 84)) {
                        count = randomInteger(7) + 1;
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level1[randomInteger(size1)]);
                        }
                    } else if ((index >= 41 && index <= 44) || (index >= 60 && index <= 63) || (index >= 73 && index <= 74)|| index == 80 || (index >= 92 && index <= 94) || (index >= 97 && index <= 98) || index == 100) {
                        count = randomInteger(7) + 1;
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level2[randomInteger(size2)]);
                        }
                    }
                    break;
                case '3':
                    if ((index >= 4 && index <= 6) || (index >= 16 && index <= 19) || (index >= 33 && index <= 35) || (index >= 51 && index <= 54) || (index >= 67 && index <= 68) || (index >= 75 && index <= 76) || (index >= 83 && index <= 85) || (index >= 93 && index <= 94)) {
                        count = randomInteger(7) + 1;
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level2[randomInteger(size2)]);
                        }
                    } else if ((index >= 7 && index <= 10) || (index >= 20 && index <= 23) || (index >= 36 && index <= 40) || (index >= 55 && index <= 58) || (index >= 69 && index <= 70) || (index >= 77 && index <= 78) || (index >= 86 && index <= 88) || index == 100) {
                        count = randomInteger(7) + 1;
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level3[randomInteger(size3)]);
                        }
                    }
                    break;
                case '4':
                    if ((index >= 6 && index <= 8) || (index >= 23 && index <= 30) || (index >= 53 && index <= 58) || index == 70 || (index >= 75 && index <= 76) || (index >= 86 && index <= 90)) {
                        count = randomInteger(10);
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level4[randomInteger(size4)]);
                        }
                    } else if ((index >= 9 && index <= 11) || (index >= 59 && index <= 63) || index == 71 || (index >= 77 && index <= 78) || (index >= 91 && index <= 95)) {
                        count = randomInteger(4);
                        for (var x = 0; x < count; x++) {
                            art.push(state['LootGenerator'].art.level5[randomInteger(size5)]);
                        }
                    }
                    break;
                default:
                    art.push('[art error]');
                    adminDialog('Error','The treasure level provided is invalid. Please try again.');
            }
        } else {
            art.push('[art error]');
            adminDialog('Error','No art can be found in the database!');
        }
        return enumerateItems(art);
    },

    generateMundane = function (index, horde, level) {
        // Returns an array of magic items
        var count, tmpItem, diceExp, tmpArray = [], items = [], err = false;
        if (debugMode) log('Generating Mundane Items on die roll ' + index + '...');
        if (state['LootGenerator'].mundane) {
            switch (level) {
                case '1':
                    if (horde) {
                        tmpArray.push(randomMundane(randomInteger(6)));
                    } else {
                        if (index >= 50 && index <= 80) {
                            tmpArray.push(randomMundane(1));
                        } else if (index >= 81 && index <= 95) {
                            tmpArray.push(randomMundane(randomInteger(2)));
                        } else if (index >= 96) {
                            tmpArray.push(randomMundane(randomInteger(3)));
                        }
                    }
                    break;
                case '2':
                    if (horde) {
                        tmpArray.push(randomMundane(randomInteger(8)));
                    } else {
                        if (index >= 30 && index <= 60) {
                            tmpArray.push(randomMundane(1));
                        } else if (index >= 61 && index <= 80) {
                            tmpArray.push(randomMundane(randomInteger(4)));
                        } else if (index >= 81 && index <= 90) {
                            tmpArray.push(randomMundane(randomInteger(8)));
                        } else if (index >= 91) {
                            tmpArray.push(randomMundane((randomInteger(11) + 1)));
                        }
                    }
                    break;
                case '3':
                    if (horde) {
                        tmpArray.push(randomMundane((randomInteger(11) + 1)));
                    } else {
                        if (index >= 30 && index <= 60) {
                            tmpArray.push(randomMundane(randomInteger(4)));
                        } else if (index >= 61 && index <= 80) {
                            tmpArray.push(randomMundane(randomInteger(6)));
                        } else if (index >= 81 && index <= 90) {
                            tmpArray.push(randomMundane(randomInteger(10)));
                        } else if (index >= 91) {
                            tmpArray.push(randomMundane((randomInteger(7) + 1)));
                        }
                    }
                    break;
                case '4':
                    if (horde) {
                        tmpArray.push(randomMundane((randomInteger(15) + 1)));
                    } else {
                        if (index >= 1 && index <= 40) {
                            tmpArray.push(randomMundane(randomInteger(4)));
                        } else if (index >= 41 && index <= 75) {
                            tmpArray.push(randomMundane(randomInteger(10)));
                        } else if (index >= 76 && index <= 85) {
                            tmpArray.push(randomMundane((randomInteger(11) + 1)));
                        } else if (index >= 86 && index <= 96) {
                            tmpArray.push(randomMundane((randomInteger(16) + 1)));
                        } else if (index >= 97) {
                            tmpArray.push(randomMundane((randomInteger(16) + 2)));
                        }
                    }
                    break;
                default:
                    items.push('[mundane error]');
                    err = true;
                    adminDialog('Error','The treasure level provided is invalid. Please try again.');
            }

            if (!err) {
                tmpArray = _.flatten(tmpArray);

                _.each(tmpArray, function(item) {
                    // Check for item calling internal function (weapons, etc.)
                    if (item.search('%%') != -1) {
                        if (item.search('%%weapons%%') != -1) item = item.replace('%%weapons%%', randomWeapon().toString());
                        if (item.search('%%ammo%%') != -1) item = item.replace('%%ammo%%', randomMundane(1, 'ammo').toString());
                        if (item.search('%%armor%%') != -1) item = item.replace('%%armor%%', randomArmor().toString());
                        if (item.search('%%tools%%') != -1) item = item.replace('%%tools%%', randomMundane(1, 'tools').toString());
                        if (item.search('%%instruments%%') != -1) item = item.replace('%%instruments%%', randomMundane(1, 'instruments').toString());
                    }

                    // Check for die roll expressions
                    if (item.search('@') != -1) {
                        diceExp = item.replace(/.*\@(.+)\@.*/gi, '$1');
                        item = item.replace('@' + diceExp + '@', rollDice(diceExp));
                    }

                    // Push item into items array
                    items.push(item);
                });
            }
        } else {
            items.push('[mundane error]');
            adminDialog('Error','No mundane items can be found in the database!');
        }
        return items;
    },

    generateMagicItems = function (index, level) {
        // Returns an array of magic items
        var count, tmpItem, diceExp, tmpArray = [], items = [], err = false;
        if (state['LootGenerator'].magic) {
            switch (level) {
                case '1':
                    if (index >= 37 && index <= 60) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableA'));
                    } else if (index >= 61 && index <= 75) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableB'));
                    } else if (index >= 76 && index <= 85) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableC'));
                    } else if (index >= 86 && index <= 97) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableF'));
                    } else if (index >= 98 && index <= 100) {
                        tmpArray.push(randomMagic(1, 'tableG'));
                    }
                    break;
                case '2':
                    if (index >= 29 && index <= 44) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableA'));
                    } else if (index >= 45 && index <= 63) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableB'));
                    } else if (index >= 64 && index <= 74) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableC'));
                    } else if (index >= 75 && index <= 80) {
                        tmpArray.push(randomMagic(1, 'tableD'));
                    } else if (index >= 81 && index <= 94) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableF'));
                    } else if (index >= 95 && index <= 96) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG'));
                    } else if (index >= 97 && index <= 98) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableG'));
                    } else if (index >= 99) {
                        tmpArray.push(randomMagic(1, 'tableH'));
                    }
                    break;
                case '3':
                    if (index >= 16 && index <= 29) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableA'));
                        tmpArray.push(randomMagic(randomInteger(6), 'tableB'));
                    } else if (index >= 30 && index <= 50) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableC'));
                    } else if (index >= 51 && index <= 66) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableD'));
                    } else if (index >= 67 && index <= 74) {
                        tmpArray.push(randomMagic(1, 'tableE'));
                    } else if (index >= 75 && index <= 82) {
                        tmpArray.push(randomMagic(1, 'tableF'));
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG'));
                    } else if (index >= 83 && index <= 92) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableH'));
                    } else if (index >= 93) {
                        tmpArray.push(randomMagic(1, 'tableI'));
                    }
                    break;
                case '4':
                    if (index >= 3 && index <= 14) {
                        tmpArray.push(randomMagic(randomInteger(8), 'tableC'));
                    } else if (index >= 15 && index <= 46) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableD'));
                    } else if (index >= 47 && index <= 68) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableE'));
                    } else if (index >= 69 && index <= 72) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG'));
                    } else if (index >= 73 && index <= 80) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableH'));
                    } else if (index >= 91 && index <= 95) {
                        tmpArray.push(randomMagic(1, 'tableF'));
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG'));
                    } else if ((index >= 81 && index <= 90) || index >= 96) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableI'));
                    }
                    break;
                default:
                    items.push('[magic error]');
                    err = true;
                    adminDialog('Error','The treasure level provided is invalid. Please try again.');
            }

            if (!err) {
                tmpArray = _.flatten(tmpArray);
                tmpArray = _.uniq(tmpArray);

                _.each(tmpArray, function(item) {
                    // Check for item calling internal function (weapons, etc.)
                    if (item.search('%%') != -1) {
                        if (item.search('%%damage_types%%') != -1) item = item.replace('%%damage_types%%', randomMagic(1, 'damageTypes').toString());
                        if (item.search('%%monster_types%%') != -1) item = item.replace('%%monster_types%%', randomMagic(1, 'monsterTypes').toString());
                        if (item.search('%%magic_armor%%') != -1) item = item.replace('%%magic_armor%%', randomMagic(1, 'magicArmor').toString());
                        if (item.search('%%metal_armor%%') != -1) item = item.replace('%%metal_armor%%', randomMundane(1, 'metalArmor').toString());
                        if (item.search('%%leather_armor%%') != -1) item = item.replace('%%leather_armor%%', randomMundane(1, 'leatherArmor').toString());
                        if (item.search('%%figurines%%') != -1) item = item.replace('%%figurines%%', randomMagic(1, 'figurines').toString());
                        if (item.search('%%crystal_balls%%') != -1) item = item.replace('%%crystal_balls%%', randomMagic(1, 'crystalBalls').toString());
                        if (item.search('%%answers%%') != -1) item = item.replace('%%answers%%', randomMagic(1, 'answers').toString());
                        if (item.search('%%ammo%%') != -1) item = item.replace('%%ammo%%', randomMundane(1, 'ammo').toString());
                        if (item.search('%%weapons%%') != -1) item = item.replace('%%weapons%%', randomWeapon());
                        if (item.search('%%swords%%') != -1) item = item.replace('%%swords%%', randomWeapon('swords'));
                        if (item.search('%%scroll') != -1) {
                            let spellLevel = item.replace(/\D/gi,'');
                            item = 'Scroll of ' + ((spellLevel == 0) ? randomSpell('cantrips') : randomSpell('level' + spellLevel));
                        }
                        if (item.search('%%beads%%') != -1) {
                            var beads = [], bCount = randomInteger(4) + 2;
                            for (var x = 0; x < bCount; x++) {
                                beads.push(randomMagic(1, 'beads'));
                            }
                            beads = enumerateItems(beads);
                            item = item.replace('%%beads%%', '(' + beads.join(', ') + ')');
                        }
                    }

                    // Check for die roll expressions
                    if (item.search('@') != -1) {
                        diceExp = item.replace(/.*\@(.+)\@.*/gi, '$1');
                        item = item.replace('@' + diceExp + '@', rollDice(diceExp));
                    }

                    // Push into items array
                    items.push(item);
                });
            }
        } else {
            items.push('[magic error]');
            adminDialog('Error','No magic items can be found in the database!');
        }
        return items;
    },

    randomWeapon = function (magic = '') {
        // Returns a string with a weapon name
        var count, weapon, tmpItem;
        count = randomInteger(100);
        if (count < 75) weapon = randomMundane(1, 'simpleWeapons');
        else if (count >= 75 && count < 95) weapon = randomMundane(1, 'martialWeapons');
        else if (count >= 95) weapon = randomMundane(1, 'silverWeapons');
        if (magic == 'swords') weapon = randomMundane(1, 'swords');
        return weapon;
    },

    randomArmor = function () {
        // Returns a string with an armor name
        var count, armor;
        count = randomInteger(100);
        if (count < 60) armor = randomMundane(1, 'lightArmor');
        else if (count >= 60 && count < 85) armor = randomMundane(1, 'mediumArmor');
        else if (count >= 85) armor = randomMundane(1, 'heavyArmor');
        return armor;
    },

    randomMundane = function (times, table = 'gear') {
        // Returns an array of mundane items from a specific items table
        var index, items = [], tmpItems = [];

        _.each(state['LootGenerator'].mundane[table], function(item) {
            var weight = item.weight;
            for (var x = 0; x < weight; x++) {
                tmpItems.push(item.name);
            }
        });

        for (var y = 0; y < times; y++) {
            index = randomInteger(tmpItems.length) - 1;
            items.push(tmpItems[index]);
        }
        return items;
    },

    randomMagic = function (times, table) {
        // Returns an array of magic items from a specific magic table
        var index, items = [], tmpItem, origItem, tmpItems = [];

        _.each(state['LootGenerator'].magic[table], function(item) {
            var weight = item.weight;
            for (var x = 0; x < weight; x++) {
                tmpItems.push(item.name);
            }
        });

        for (var y = 0; y < times; y++) {
            index = randomInteger(tmpItems.length) - 1;
            tmpItem = tmpItems[index];

            // Check for and remove unique items
            origItem = _.find(state['LootGenerator'].magic[table], function (uItem) { return uItem.name == tmpItem; });
            if (origItem && origItem.unique) {
                if (debugMode) tmpItem = '<i>' + tmpItem + '</i>';
                tmpItems = _.reject(tmpItems, function (oItem) { return origItem.name == oItem.name; });
                var oldMagic = _.reject(state['LootGenerator'].magic[table], function (oItem) { return origItem.name == oItem.name; });
                state['LootGenerator'].magic[table] = oldMagic;
            }

            items.push(tmpItem);
        }
        return items;
    },

    randomSpell = function (table = 'cantrips') {
        // Returns a spell of a specific level
        var spells = state['LootGenerator'].spells[table];
        return spells[randomInteger(_.size(spells)) - 1];
    },

    commandHelp = function () {
        var message = 'Use the <span style=\'' + styles.code + '\'>--show</span> command to generate loot. Syntax (all on one line):';
        message += '<div style=\'' + styles.code + '\'>!loot --show --type:&lt;loot_type&gt; --loc:&lt;location&gt; --recip:&lt;recipient&gt; --mod:&lt;modifications&gt; --incl:&lt;special_item&gt;</div><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;loot_type&gt;:</b><br>Mandatory. Either <i>Indiv</i> or <i>Horde</i>, plus <i>1 - 4</i> corresponding to CR 0-4, CR 5-10, CR 11-16, and CR 17+ respectfully.<br>Examples: <i>Indiv1, Horde3</i><br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;location&gt;:</b><br>Optional. The name of the location where the loot is found/discovered.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;recipient&gt;:</b><br>Optional. The name of the character who found the loot.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;modifications&gt;:</b><br>Optional. Modifications (comma delimited) to the default parameters for generating loot. Possible values are <i>no-, less-, show-,</i> or <i>more-</i> followed by <i>coins, gems, art, mundane,</i> or <i>magic.</i><br>Examples: <i>more-coins</i> and <i>no-magic, less-art</i><br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;special_item&gt;:</b><br>Optional. One or more special items (comma delimited) to add to the loot.<br><br>';
        message += 'See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --config">Show Config Menu</a></div>';
        adminDialog('Help Menu', message);
    },

    commandConfig = function () {
        // Set default options for loot generation
        var message = '<div style=\'' + styles.title + '\'>Defaults</div>These are the values that will be used if the <span style=\''
        + styles.code + '\'>--mod</span> parameter is not used during loot generation.';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --toggle gems" title="Turn '
        + ((state['LootGenerator'].useGems) ? 'off' : 'on') + ' use of Gems">Gems '
        + ((state['LootGenerator'].useGems) ? 'ON' : 'OFF') + '</a></div>';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --toggle art" title="Turn '
        + ((state['LootGenerator'].useArt) ? 'off' : 'on') + ' use of Art Objects">Art Objects '
        + ((state['LootGenerator'].useArt) ? 'ON' : 'OFF') + '</a></div>';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --toggle mundane" title="Turn '
        + ((state['LootGenerator'].useMundane) ? 'off' : 'on') + ' use of Mundane Items">Mundane Items '
        + ((state['LootGenerator'].useMundane) ? 'ON' : 'OFF') + '</a></div>';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --toggle magic" title="Turn '
        + ((state['LootGenerator'].useMagic) ? 'off' : 'on') + ' use of Magic Items">Magic Items '
        + ((state['LootGenerator'].useMagic) ? 'ON' : 'OFF') + '</a></div><hr>';

        message += '<div style=\'' + styles.title + '\'>Import/Export</div>Use the export button below to export Magic Items, Mundane Items, and Spells to handouts for customization:';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --export">Export Data</a></div>';
        message += 'Edit the exported handouts to add your own Items and Spells, then use the import command to update the database.<br><br>';
        message += 'Syntax for importing is as follows (all on one line): <div style=\'' + styles.code
        + '\'>!loot --import --tables:&lt;table_name&gt;</div>';
        message += '<b style=\'' + styles.code + '\'>&lt;table_name&gt;:</b><br>Mandatory. Indicates which handouts (comma delimited) to import. Available values are <i>Table A, Table B, Table C, Table D, Table E, Table F, Table G, Table H, Table I</i> for Magic Item tables; <i>Mundane</i> for Mundane Items, and <i>Spells</i> for Spells.<br><br>';
        message += 'See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.';

        if (typeof PurseStrings !== 'undefined' || typeof PotionManager !== 'undefined' || typeof GearManager !== 'undefined') {
            message += '<hr><div style=\'' + styles.title + '\'>Script Integration</div>Commands for relevant loot items will be generated for following installed scripts:<ul>';
            if (typeof PurseStrings !== 'undefined') message += '<li>PurseStrings</li>';
            if (typeof PotionManager !== 'undefined') message += '<li>PotionManager</li>';
            if (typeof GearManager !== 'undefined') message += '<li>GearManager</li>';
            message += '</ul>';
        }

        message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --help">Show Help Menu</a></div>';
        adminDialog('', message);
    },

    commandToggle = function (msg) {
        // Toggle defaults off and on
        var parms = msg.split(/\s+/i), message = '';
        if (parms[2]) {
            if (parms[2].search('gems') >= 0) state['LootGenerator'].useGems = !state['LootGenerator'].useGems;
            if (parms[2].search('art') >= 0) state['LootGenerator'].useArt = !state['LootGenerator'].useArt;
            if (parms[2].search('mundane') >= 0) state['LootGenerator'].useMundane = !state['LootGenerator'].useMundane;
            if (parms[2].search('magic') >= 0) state['LootGenerator'].useMagic = !state['LootGenerator'].useMagic;
        } else {
            adminDialog('Toggle Default Error', 'No valid parameters were sent.');
        }
        commandConfig();
    },

    commandSetup = function (msg) {
		// Build/Rebuild database of loot items
        var reset, rx = /\-\-reset/gi;
        if (rx.test(msg.content)) {
            state['LootGenerator'].gems = null;
            state['LootGenerator'].art = null;
            state['LootGenerator'].mundane = null;
            state['LootGenerator'].magic = null;
            state['LootGenerator'].spells = null;
        }

        if (!state['LootGenerator'].gems) {
            if (debugMode) log('Building gems database...');
            state['LootGenerator'].gems = GEMS;
        }
        if (!state['LootGenerator'].art) {
            if (debugMode) log('Building art database...');
            state['LootGenerator'].art = ART;
        }
        if (!state['LootGenerator'].mundane) {
            if (debugMode) log('Building mundane items database...');
            state['LootGenerator'].mundane = MUNDANE;
        }
        if (!state['LootGenerator'].magic) {
            if (debugMode) log('Building magic items database...');
            state['LootGenerator'].magic = MAGIC;
        }
        if (!state['LootGenerator'].spells) {
            if (debugMode) log('Building spells database...');
            state['LootGenerator'].spells = SPELLS;
        }
        adminDialog('Setup Complete','The Loot Generator database has been loaded with loot items.');
	},

    commandExport = function (msg) {
        var parsedData, magic = [{heading:'Table A',table:'tableA'}, {heading:'Table B',table:'tableB'}, {heading:'Table C',table:'tableC'}, {heading:'Table D',table:'tableD'}, {heading:'Table E',table:'tableE'}, {heading:'Table F',table:'tableF'}, {heading:'Table G',table:'tableG'}, {heading:'Table H',table:'tableH'}, {heading:'Table I',table:'tableI'}];
        _.each(magic, function (level) {
            var mNote = findObjs({name: 'Loot Generator: Magic ' + level.heading, type: 'handout'})[0];
            if (!mNote) mNote = createObj("handout", {name: 'Loot Generator: Magic ' + level.heading});
            if (mNote) {
                parsedData = '';
                _.each(state['LootGenerator'].magic[level.table], function (item) { parsedData += stringifyForExport(item); });
                mNote.set({ notes: parsedData });
                if (debugMode) log('Magic ' + level.heading + ' has exported successfully.');
            }
        });

        var muNote = findObjs({name: 'Loot Generator: Mundane Items', type: 'handout'})[0];
        if (!muNote) muNote = createObj("handout", {name: 'Loot Generator: Mundane Items'});
        if (muNote) {
            parsedData = '';
            _.each(state['LootGenerator'].mundane.gear, function (item) { parsedData += stringifyForExport(item); });
            muNote.set({ notes: parsedData });
            if (debugMode) log('Mundane Items has exported successfully.');
        }

        var spNote = findObjs({name: 'Loot Generator: Spells', type: 'handout'})[0];
        if (!spNote) spNote = createObj("handout", {name: 'Loot Generator: Spells'});
        if (spNote) {
            parsedData = '';
            parsedData += '<p>CANTRIPS:</p><p>' + state['LootGenerator'].spells.cantrips.join(', ') + '</p>';
            parsedData += '<p>1ST LEVEL:</p><p>' + state['LootGenerator'].spells.level1.join(', ') + '</p>';
            parsedData += '<p>2ND LEVEL:</p><p>' + state['LootGenerator'].spells.level2.join(', ') + '</p>';
            parsedData += '<p>3RD LEVEL:</p><p>' + state['LootGenerator'].spells.level3.join(', ') + '</p>';
            parsedData += '<p>4TH LEVEL:</p><p>' + state['LootGenerator'].spells.level4.join(', ') + '</p>';
            parsedData += '<p>5TH LEVEL:</p><p>' + state['LootGenerator'].spells.level5.join(', ') + '</p>';
            parsedData += '<p>6TH LEVEL:</p><p>' + state['LootGenerator'].spells.level6.join(', ') + '</p>';
            parsedData += '<p>7TH LEVEL:</p><p>' + state['LootGenerator'].spells.level7.join(', ') + '</p>';
            parsedData += '<p>8TH LEVEL:</p><p>' + state['LootGenerator'].spells.level8.join(', ') + '</p>';
            parsedData += '<p>9TH LEVEL:</p><p>' + state['LootGenerator'].spells.level9.join(', ') + '</p>';
            spNote.set({ notes: parsedData });
            if (debugMode) log('Spells have exported successfully.');
        }
        adminDialog('Export Complete', 'Your data export has been completed.');
    },

    commandImport = function (msg) {
        // Import items from handouts
        // !loot --import --tables:Table A, Spells
        var err = {probs: [], tables: []}, oldData, message, title, tables,
        ra = /\-\-action/gi, rt = /\-\-tables/gi, cmds = msg.split('--');
        if (rt.test(msg)) tables = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('tables:') }).split(':')[1].trim().split(/,\s*/);

        if (tables) {
            var magic = [{heading:'Table A',table:'tableA'}, {heading:'Table B',table:'tableB'}, {heading:'Table C',table:'tableC'}, {heading:'Table D',table:'tableD'}, {heading:'Table E',table:'tableE'}, {heading:'Table F',table:'tableF'}, {heading:'Table G',table:'tableG'}, {heading:'Table H',table:'tableH'}, {heading:'Table I',table:'tableI'}];
            _.each(magic, function (level) {
                var mNote = findObjs({name: 'Loot Generator: Magic ' + level.heading, type: 'handout'})[0];
                if (mNote) {
                    mNote.get('notes', function (notes) {
                        var items = decodeEditorText(notes, {asArray:true});
                        oldData = [];
                        _.each(items, function (item) {
                            if (item.search(/\|/) > 0) {
                                let aItem = item.split('|'), tmpItem = {};
                                if (!isNaN(aItem[0]) && aItem[1]) {
                                    tmpItem.weight = parseInt(aItem[0]);
                                    tmpItem.name = aItem[1].trim();
                                    if (aItem[2] && aItem[2].toLowerCase().trim() == 'unique') tmpItem.unique = true;
                                    oldData.push(tmpItem);
                                } else {
                                    err.probs.push('One or more Magic Items did not contain the minimum number of items.');
                                    err.tables.push(level.heading);
                                }
                            } else {
                                err.probs.push('One or more Magic Items did not contain any pipe separators.');
                                err.tables.push(level.heading);
                            }
                        });
                        state['LootGenerator'].magic[level.table] = oldData;
                    });
                } else {
                    err.probs.push('One or more handouts do not exist.');
                    err.tables.push(level.heading);
                }
            });

            if (_.find(tables, function(x) { return x.toLowerCase() == 'mundane'; })) {
                var muNote = findObjs({name: 'Loot Generator: Mundane Items', type: 'handout'})[0];
                if (muNote) {
                    muNote.get('notes', function (notes) {
                        var oldData = [], items = decodeEditorText(notes, {asArray:true});
                        _.each(items, function (item) {
                            if (item.search(/\|/) > 0) {
                                let aItem = item.split('|'), tmpItem = {};
                                if (!isNaN(aItem[0]) && aItem[1]) {
                                    tmpItem.weight = parseInt(aItem[0]);
                                    tmpItem.name = aItem[1].trim();
                                    if (aItem[2] && aItem[2].toLowerCase().trim() == 'unique') tmpItem.unique = true;
                                    oldData.push(tmpItem);
                                } else {
                                    err.probs.push('One or more Mundane Items did not contain the minimum number of items.');
                                    err.tables.push('Mundane Items');
                                }
                            } else {
                                err.probs.push('One or more Mundane Items did not contain any pipe separators.');
                                err.tables.push('Mundane Items');
                            }
                        });
                        state['LootGenerator'].mundane.gear = oldData;
                    });
                } else {
                    err.probs.push('One or more handouts do not exist.');
                    err.tables.push('Mundane Items');
                }
            }

            if (_.find(tables, function(x) { return x.toLowerCase() == 'spells'; })) {
                var spNote = findObjs({name: 'Loot Generator: Spells', type: 'handout'})[0];
                if (spNote) {
                    spNote.get('notes', function (notes) {
                        var items = decodeEditorText(notes, {asArray:true}),
                        levels = [{heading:'CANTRIPS:',level:'cantrips'}, {heading:'0 LEVEL:',level:'cantrips'}, {heading:'1ST LEVEL:',level:'level1'}, {heading:'2ND LEVEL:',level:'level2'}, {heading:'3RD LEVEL:',level:'level3'}, {heading:'4TH LEVEL:',level:'level4'}, {heading:'5TH LEVEL:',level:'level5'}, {heading:'6TH LEVEL:',level:'level6'}, {heading:'7TH LEVEL:',level:'level7'}, {heading:'8TH LEVEL:',level:'level8'}, {heading:'9TH LEVEL:',level:'level9'}];

                        _.each(levels, function(level) {
                            if (_.find(items, function (x) { return x.search(level.heading) >= 0; })) {
                                let index = _.indexOf(items, level.heading) + 1;
                                if (items[index] && items[index].trim() != '') {
                                    oldData = [];
                                    oldData.push(items[index].split(/,\s*/));
                                    oldData = _.flatten(oldData);
                                    state['LootGenerator'].spells[level.level] = oldData;
                                }
                            }
                        });
                    });
                } else {
                    err.probs.push('One or more handouts do not exist.');
                    err.tables.push('Spells');
                }
            }
        } else {
            err.probs.push('The minimum parameters were not provided for import.');
        }

        if (err.probs.length && err.probs.length > 0) {
            err.probs = _.unique(err.probs);
            err.tables = _.unique(err.tables);
            title = 'Import Error';
            message = 'The following errors were encountered during import:<ul><li>' + err.probs.join('</li><li>') + '</li></ul>';
            if (err.tables.length && err.tables.length > 0) message += 'These errors occured for these tables:' + err.tables.join(', ') + '.<br><br>';
            if (_.find(err.probs, function(x) { return x.search('pipe') >= 0 || x.search('number of items') >= 0; })) message += 'Each magic item should follow this format:<div style=\'' + styles.code + '\'>weight|Item Name</div> or <div style=\'' + styles.code + '\'>weight|Item Name|unique</div>';
            if (_.find(err.probs, function(x) { return x.search('minimum parameters') >= 0; })) message += 'The import syntax is as follows:<br>'
            + '<div style=\'' + styles.code + '\'>!loot --import --tables:Table A, Spells</div>';
        } else {
            title = 'Import Complete';
            message = 'Items have been successfully imported to the following tables: ' + tables.join(', ') + '.';
        }

        adminDialog(title, message);
    },

    //---- UTILITY FUNCTIONS ----//

    enumerateItems = function (items) {
        // Collects multiple instances into one instance with an item count
        var uniqItems, retItems = [], count;
        uniqItems = _.uniq(items);
        _.each(uniqItems, function(item) {
            count = _.size(_.filter(items, function (x) { return x == item; }));
            if (count > 1) retItems.push(item + ' (' + count + ')');
            else retItems.push(item);
        });
        return retItems;
    },

    modifyRoll = function (roll, type, mods) {
        // Returns a modified die roll based on the "more" and "less" commands
        var newRoll = roll;
        if (mods.search('more-' + type) >= 0) newRoll = (roll >= 75) ? 100 : roll + 25;
        if (mods.search('less-' + type) >= 0) newRoll = (roll <= 25) ? 1 : roll - 25;
        return newRoll;
    },

    rollDice = function (exp) {
        exp = exp.split(/\D/gi);
        var roll, num = (exp[0]) ? parseInt(exp[0]) : 1,
        die = (exp[1]) ? parseInt(exp[1]) : 6,
        plus = (exp[2]) ? parseInt(exp[2]) : 0;
        roll = (num == 1) ? randomInteger(die) : randomInteger(die * num - (num - 1)) + (num - 1);
        return roll + plus;
    },

	showDialog = function (title, content) {
        title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
        var body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
        sendChat('LootGenerator', body, null, {noarchive:true});
	},

	adminDialog = function (title, content) {
        title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
        var body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
        sendChat('LootGenerator','/w GM ' + body, null, {noarchive:true});
	},

    stringifyForExport = function (item) {
        // Prepares an object for export
        var tmp = '';
        tmp += '<p>' + item.weight + '|' + item.name;
        if (item.unique) tmp += '|' + 'unique';
        tmp += '</p>';
        return tmp;
    },

    decodeEditorText = function (t, o) {
        // Strips the editor encoding from GMNotes (thanks to The Aaron!)
        let w = t;
        o = Object.assign({ separator: '\r\n', asArray: false }, o);
        /* Token GM Notes */
        if (/^%3Cp%3E/.test(w)) {
            w = unescape(w);
        }
        if (/^<p>/.test(w)) {
            let lines = w.match(/<p>.*?<\/p>/g).map( l => l.replace(/^<p>(.*?)<\/p>$/,'$1'));
            return o.asArray ? lines : lines.join(o.separator);
        }
        /* neither */
        return t;
    },

    esRE = function (s) {
        var escapeForRegexp = /(\\|\/|\[|\]|\(|\)|\{|\}|\?|\+|\*|\||\.|\^|\$)/g;
        return s.replace(escapeForRegexp,"\\$1");
    },

    HE = (function() {
        var entities={
                '<' : '&'+'lt'+';',
                '>' : '&'+'gt'+';',
                "'" : '&'+'#39'+';',
                '@' : '&'+'#64'+';',
                '{' : '&'+'#123'+';',
                '|' : '&'+'#124'+';',
                '}' : '&'+'#125'+';',
                '[' : '&'+'#91'+';',
                ']' : '&'+'#93'+';',
                '"' : '&'+'quot'+';'
            },
            re = new RegExp('('+_.map(_.keys(entities),esRE).join('|')+')','g');
        return function(s){
            return s.replace(re, function(c){ return entities[c] || c; });
        };
    }()),

    //---- DEFAULT LOOT VALUES ----//

    GEMS={level1:['Azurite','Banded Agate','Blue Quartz','Eye Agate','Hematite','Lapis Lazuli','Malachite','Moss Agate','Obsidian','Rhodochrosite','Tiger Eye','Turquoise'],level2:['Bloodstone','Carnelian','Chalcedony','Chrysoprase','Citrine','Jasper','Moonstone','Onyx','Quartz','Sardonyx','Star Rose Quartz','Zircon'],level3:['Alexandrite','Aquamarine','Black pearl','Blue spinel','Peridot','Topaz'],level4:['Black Opal','Blue Sapphire','Emerald','Fire Opal','Opal','Star Ruby','Star Sapphire','Yellow Sapphire'],level5:['Black Sapphire','Diamond','Jacinth','Ruby']},
    ART={level1:['Silver Ewer','Carved Bone Statuette','Small Gold Bracelet','Cloth-of-Gold Vestments','Black Velvet Mask stitched with Silver Thread','Copper Chalice with Silver Filigree','Pair of Engraved Bone Dice','Small Mirror set in a Painted Wooden Frame','Embroidered Silk Handkerchief','Gold Locket with a Painted Portrait Inside'],level2:['Gold Ring set with Bloodstones','Carved Ivory Statuette','Large Gold Bracelet','Silver Necklace with a Gemstone Pendant','Bronze Crown','Silk Robe with Gold Embroidery','Large Well-Made Tapestry','Brass Mug with Jade Inlay','Box of Turquoise Animal Figurines','Gold Bird Cage with Electrum Filigree'],level3:['Silver Chalice set with Moonstones','Silver-Plated Steel Longsword with Jet set in Hilt','Carved Harp of Exotic Wood with Ivory Inlay and Zircon Gems','Small Gold Idol','Gold Dragon Comb set with Red Garnets as Eyes','Bottle Stopper Cork embossed with Gold Leaf and set with Amethysts','Ceremonial Electrum Dagger with a Black Pearl in the Pommel','Silver and Gold Brooch','Obsidian Statuette with Gold Fittings and Inlay','Painted Gold War Mask'],level4:['Fine Gold Chain set with a Fire Opal','Old Masterpiece Painting','Embroidered Silk and Velvet Mantle set with Numerous Moonstones','Platinum Bracelet set with a Sapphire','Embroidered Glove set with Jewel Chips','Jeweled Anklet','Gold Music Box','Gold Circlet set with Four Aquamarines','Eye Patch with a Mock Eye set in Blue Sapphire and Moonstone','A Necklace String of Small Pink Pearls'],level5:['Jeweled Gold Crown','Jeweled Platinum Ring','Small Gold Statuette set with Rubies','Gold Cup set with Emeralds','Gold Jewelry Box with Platinum Filigree','Painted Gold Child\'s Sarcophagus','Jade Game Board with Solid Gold Playing Pieces','Bejeweled Ivory Drinking Horn with Gold Filigree']},
    MUNDANE={gear:[{weight:45,name:'%%weapons%%'},{weight:35,name:'%%armor%%'},{weight:30,name:'Potion of Healing'},{weight:25,name:'%%ammo%%s (@1d8@)'},{weight:25,name:'Hempen Rope'},{weight:20,name:'Alchemist\'s Fire'},{weight:20,name:'Silk Rope'},{weight:15,name:'Acid'},{weight:15,name:'Caltrops'},{weight:15,name:'Healer\'s Kit'},{weight:15,name:'Tinderbox'},{weight:10,name:'Ball Bearings'},{weight:10,name:'Climber\'s Kit'},{weight:10,name:'Holy Water'},{weight:10,name:'Hooded Lantern'},{weight:10,name:'Torch'},{weight:10,name:'Empty Vial'},{weight:5,name:'Antitoxin'},{weight:5,name:'Bullseye Lantern'},{weight:5,name:'Piton'},{weight:5,name:'Quiver'},{weight:5,name:'Rations (1 day)'},{weight:5,name:'Waterskin'},{weight:5,name:'Signal Whistle'},{weight:1,name:'Abacus'},{weight:1,name:'Backpack'},{weight:1,name:'Bedroll'},{weight:1,name:'Bell'},{weight:1,name:'Blanket'},{weight:1,name:'Block and Tackle'},{weight:1,name:'Glass Bottle'},{weight:1,name:'Candle'},{weight:1,name:'Chain (10 feet)'},{weight:1,name:'Chalk'},{weight:1,name:'Component Pouch'},{weight:1,name:'Crowbar'},{weight:1,name:'Grappling Hook'},{weight:1,name:'Hammer'},{weight:1,name:'Hourglass'},{weight:1,name:'Hunting Trap'},{weight:1,name:'Bottle of Ink'},{weight:1,name:'Ink Pen'},{weight:1,name:'Jug'},{weight:1,name:'Lamp'},{weight:1,name:'Lock & Key'},{weight:1,name:'Lock (no key)'},{weight:1,name:'Magnifying Glass'},{weight:1,name:'Manacles (no key)'},{weight:1,name:'Mess Kit'},{weight:1,name:'Steel Mirror'},{weight:1,name:'Oil'},{weight:1,name:'Sheet of Paper'},{weight:1,name:'Sheet of Parchment'},{weight:1,name:'Perfume'},{weight:1,name:'Poison'},{weight:1,name:'Iron Pot'},{weight:1,name:'Pouch'},{weight:1,name:'Sealing Wax'},{weight:1,name:'Signet Ring'},{weight:1,name:'Soap'},{weight:1,name:'Iron Spikes (@1d10@)'},{weight:1,name:'Spyglass'},{weight:1,name:'Two-person Tent'},{weight:1,name:'Whetsone'},{weight:1,name:'%%instruments%%'},{weight:1,name:'%%tools%%'}],instruments:[{weight:15,name:'A Drum'},{weight:15,name:'A Horn'},{weight:15,name:'A Flute'},{weight:10,name:'A Pan Flute'},{weight:7,name:'A Lute'},{weight:7,name:'A Lyre'},{weight:5,name:'A Viol'},{weight:1,name:'Bagpipes'},{weight:1,name:'A Dulcimer'},{weight:1,name:'A Shawm'},],tools:[{weight:20,name:'Woodcarver\'s Tools'},{weight:15,name:'Thieves\' Tools'},{weight:15,name:'Carpenter\'s Tools'},{weight:15,name:'Cook\'s Utensils'},{weight:10,name:'Alchemist\'s Supplies'},{weight:10,name:'Leatherworker\'s Tools'},{weight:10,name:'Painter\'s Supplies'},{weight:10,name:'Tinker\'s Tools'},{weight:5,name:'Jeweler\'s Tools'},{weight:3,name:'Navigator\'s Tools'},{weight:3,name:'Smith\'s Tools'},{weight:1,name:'Brewer\'s Supplies'},{weight:1,name:'Calligrapher\'s Supplies'},{weight:1,name:'Cartographer\'s Tools'},{weight:5,name:'Cobbler\'s Tools'},{weight:1,name:'Glassblower\'s Tools'},{weight:1,name:'Mason\'s Tools'},{weight:1,name:'Potter\'s Tools'},{weight:1,name:'Weaver\'s Tools'},],ammo:[{weight:25,name:'Arrow'},{weight:10,name:'Crossbow Bolt'},{weight:5,name:'Sling Bullet'},{weight:1,name:'Blowgun Needle'}],lightArmor:[{weight:5,name:'Padded Armor'},{weight:3,name:'Leather Armor'},{weight:1,name:'Studded Leather'}],mediumArmor:[{weight:40,name:'Hide Armor'},{weight:30,name:'Chain Shirt'},{weight:20,name:'Scale Mail'},{weight:7,name:'Breastplate'},{weight:1,name:'Half Plate'}],heavyArmor:[{weight:25,name:'Ring Mail'},{weight:15,name:'Chain Mail'},{weight:5,name:'Splint'},{weight:1,name:'Plate'}],metalArmor:[{weight:30,name:'Chain Shirt'},{weight:20,name:'Scale Mail'},{weight:7,name:'Breastplate'},{weight:1,name:'Half Plate'},{weight:25,name:'Ring Mail'},{weight:15,name:'Chain Mail'},{weight:5,name:'Splint'},{weight:1,name:'Plate'}],leatherArmor:[{weight:5,name:'Padded Armor'},{weight:3,name:'Leather Armor'},{weight:1,name:'Studded Leather'},{weight:40,name:'Hide Armor'}],simpleWeapons:[{weight:25,name:'Club'},{weight:25,name:'Dagger'},{weight:20,name:'Shortbow'},{weight:10,name:'Javelin'},{weight:10,name:'Quarterstaff'},{weight:10,name:'Spear'},{weight:7,name:'Sling'},{weight:7,name:'Mace'},{weight:3,name:'Greatclub'},{weight:3,name:'Handaxe'},{weight:3,name:'Light Crossbow'},{weight:1,name:'Light Hammer'},{weight:1,name:'Sickle'},{weight:1,name:'Dart'}],martialWeapons:[{weight:25,name:'Shortsword'},{weight:20,name:'Battleaxe'},{weight:10,name:'Longbow'},{weight:7,name:'Heavy Crossbow'},{weight:5,name:'Scimitar'},{weight:5,name:'Longsword'},{weight:3,name:'Lance'},{weight:3,name:'Halberd'},{weight:3,name:'Glaive'},{weight:3,name:'Morningstar'},{weight:1,name:'Maul'},{weight:1,name:'Pike'},{weight:1,name:'Rapier'},{weight:1,name:'Trident'},{weight:1,name:'Greataxe'},{weight:1,name:'Greatsword'},{weight:1,name:'War Pick'},{weight:1,name:'Warhammer'},{weight:1,name:'Flail'},{weight:1,name:'Whip'},{weight:1,name:'Blowgun'},{weight:1,name:'Hand Crossbow'},{weight:1,name:'Net'}],silverWeapons:[{weight:20,name:'Silver Shortsword'},{weight:15,name:'Silver Dagger'},{weight:7,name:'Silver Longsword'},{weight:1,name:'Silver Greatsword'},{weight:1,name:'Silver Spear'},{weight:1,name:'Silver Mace'}],swords:[{weight:10,name:'Shortsword'},{weight:5,name:'Longsword'},{weight:1,name:'Greatsword'}],},
    MAGIC={tableA:[{weight:50,name:'Potion of Healing'},{weight:10,name:'%%scroll0%%'},{weight:10,name:'Potion of Climbing'},{weight:20,name:'%%scroll1%%'},{weight:4,name:'%%scroll2%%'},{weight:4,name:'Potion of Greater Healing'},{weight:1,name:'Bag of Holding'},{weight:1,name:'Driftglobe'}],tableB:[{weight:15,name:'Potion of Greater Healing'},{weight:7,name:'Potion of Fire Breath'},{weight:7,name:'Potion of  %%damage_types%% Resistance'},{weight:5,name:'+1 %%ammo%%s (@1d6@)'},{weight:5,name:'Potion of Animal Friendship'},{weight:5,name:'Potion of Hill Giant Strength'},{weight:5,name:'Potion of Growth'},{weight:5,name:'Potion of Water Breathing'},{weight:5,name:'%%scroll2%%'},{weight:5,name:'%%scroll2%%'},{weight:3,name:'Bag of Holding'},{weight:3,name:'Keoghtom\'s Ointment'},{weight:3,name:'Oil of Slipperiness'},{weight:2,name:'Dust of Disappearance'},{weight:2,name:'Dust of Dryness'},{weight:2,name:'Dust of Sneezing And Choking'},{weight:2,name:'Elemental Gem'},{weight:2,name:'Philter of Love'},{weight:1,name:'Alchemy Jug'},{weight:1,name:'Cap of Water Breathing'},{weight:1,name:'Cloak of the Manta Ray'},{weight:1,name:'Driftglobe'},{weight:1,name:'Goggles of Night'},{weight:1,name:'Helm of Comprehending Languages'},{weight:1,name:'Immovable Rod'},{weight:1,name:'Lantern of Revealing'},{weight:1,name:'Mariner\'s %%armor%%'},{weight:1,name:'Mithral %%metal_armor%%'},{weight:1,name:'Potion of Poison'},{weight:1,name:'Ring of Swimming'},{weight:1,name:'Robe of Useful Items'},{weight:1,name:'Rope of Climbing'},{weight:1,name:'Saddle of the Cavalier'},{weight:1,name:'Wand of Magic Detection'},{weight:1,name:'Wand of Secrets'}],tableC:[{weight:15,name:'Potion of Superior Healing'},{weight:7,name:'%%scroll4%%'},{weight:5,name:'+2 %%ammo%%s (@1d6@)'},{weight:5,name:'Potion of Clairvoyance'},{weight:5,name:'Potion of Diminution'},{weight:5,name:'Potion of Gaseous Form'},{weight:5,name:'Potion of Frost Giant Strength'},{weight:5,name:'Potion of Stone Giant Strength'},{weight:5,name:'Potion of Heroism'},{weight:5,name:'Potion of Invulnerability'},{weight:5,name:'Potion of Mind Reading'},{weight:5,name:'%%scroll5%%'},{weight:3,name:'Elixir of Health'},{weight:3,name:'Oil of Etherealness'},{weight:3,name:'Potion of Fire Giant Strength'},{weight:3,name:'Quaal\'s Feather Token'},{weight:3,name:'Scroll of Protection from %%monster_types%%'},{weight:2,name:'Bag of Beans'},{weight:2,name:'Bead of Force'},{weight:1,name:'Chime of Opening'},{weight:1,name:'Decanter of Endless Water'},{weight:1,name:'Eyes of Minute Seeing'},{weight:1,name:'Folding Boat'},{weight:1,name:'Heward\'s Handy Haversack'},{weight:1,name:'Horseshoes of Speed'},{weight:1,name:'Necklace of Fireballs'},{weight:1,name:'Periapt of Health'},{weight:1,name:'Sending Stones'}],tableD:[{weight:20,name:'Potion of Supreme Healing'},{weight:10,name:'Potion of Invisibility'},{weight:10,name:'Potion of Speed'},{weight:10,name:'%%scroll6%%'},{weight:7,name:'%%scroll7%%'},{weight:5,name:'+3 %%ammo%%s (@1d6@)'},{weight:5,name:'Oil of Sharpness'},{weight:5,name:'Potion of Flying'},{weight:5,name:'Potion of Cloud Giant Strength'},{weight:5,name:'Potion of Longevity'},{weight:5,name:'Potion of Vitality'},{weight:5,name:'%%scroll8%%'},{weight:3,name:'Horseshoes of a Zephyr'},{weight:3,name:'Nolzur\'s Marvelous Pigments'},{weight:1,name:'Bag of Devouring'},{weight:1,name:'Portable Hole'}],tableE:[{weight:30,name:'%%scroll8%%'},{weight:25,name:'Potion of Storm Giant Strength',unique:true},{weight:15,name:'Potion of Supreme Healing'},{weight:15,name:'%%scroll9%%'},{weight:8,name:'Universal Solvent',unique:true},{weight:5,name:'Arrow of %%monster_types%% Slaying'},{weight:2,name:'Sovereign Glue',unique:true}],tableF:[{weight:15,name:'+1 %%weapons%%'},{weight:3,name:'+1 Shield'},{weight:3,name:'Sentinel Shield'},{weight:2,name:'Amulet of Proof Against Detection and Location'},{weight:2,name:'Boots of Elvenkind'},{weight:2,name:'Boots of Striding and Springing'},{weight:3,name:'Bracers of Archery'},{weight:2,name:'Brooch of Shielding'},{weight:2,name:'Broom of Flying'},{weight:2,name:'Cloak of Elvenkind'},{weight:2,name:'Cloak of Protection'},{weight:2,name:'Gauntlets of Ogre Power'},{weight:2,name:'Hat of Disguise'},{weight:2,name:'Javelin of Lightning'},{weight:2,name:'Pearl of Power'},{weight:2,name:'+1 Rod of the Pact Keeper'},{weight:2,name:'Slippers of Spider Climbing'},{weight:2,name:'Staff of the Adder'},{weight:2,name:'Staff of the Python'},{weight:2,name:'%%swords%% of Vengeance'},{weight:2,name:'Trident of Fish Command'},{weight:2,name:'Wand of Magic Missiles'},{weight:2,name:'+1 Wand of the War Mage'},{weight:2,name:'Wand of Web'},{weight:2,name:'%%weapons%% of Warning'},{weight:1,name:'Adamantine Armor (Chain Mail)'},{weight:1,name:'Adamantine Armor (Chain Shirt)'},{weight:1,name:'Adamantine Armor (Scale Mail)'},{weight:1,name:'Bag of Tricks (Gray)'},{weight:1,name:'Bag of Tricks (Rust)'},{weight:1,name:'Bag of Tricks (Tan)'},{weight:1,name:'Boots of the Winterlands'},{weight:1,name:'Circlet of Blasting'},{weight:1,name:'Deck of Illusions'},{weight:1,name:'Eversmoking Bottle'},{weight:1,name:'Eyes of Charming'},{weight:1,name:'Eyes of the Eagle'},{weight:1,name:'Figurine of Wondrous Power (Silver Raven)'},{weight:1,name:'Gem of Brightness'},{weight:1,name:'Gloves of Missile Snaring'},{weight:1,name:'Gloves of Swimming and Climbing'},{weight:1,name:'Gloves of Thievery'},{weight:1,name:'Headband of Intellect'},{weight:1,name:'Helm of Telepathy'},{weight:1,name:'Instrument of the Bards (Doss Lute)'},{weight:1,name:'Instrument of the Bards (Fochlucan Bandore)'},{weight:1,name:'Instrument of the Bards (Mac-Fuimidh Cittern)'},{weight:1,name:'Medallion of Thoughts'},{weight:1,name:'Necklace of Adaptation'},{weight:1,name:'Periapt of Wound Closure'},{weight:1,name:'Pipes of Haunting'},{weight:1,name:'Pipes of the Sewers'},{weight:1,name:'Ring of Jumping'},{weight:1,name:'Ring of Mind Shielding'},{weight:1,name:'Ring of Warmth'},{weight:1,name:'Ring of Water Walking'},{weight:1,name:'Quiver of Ehlonna'},{weight:1,name:'Stone of Good Luck'},{weight:1,name:'Wind Fan'},{weight:1,name:'Winged Boots'}],tableG:[{weight:11,name:'+2 %%weapons%%'},{weight:3,name:'Figurine of Wondrous Power (%%figurines%%)'},{weight:1,name:'Adamantine Armor (Breastplate)'},{weight:1,name:'Adamantine Armor (Splint)'},{weight:1,name:'Amulet of Health'},{weight:1,name:'Armor of Vulnerability'},{weight:1,name:'Arrow-Catching Shield'},{weight:1,name:'Belt of Dwarvenkind'},{weight:1,name:'Belt of Hill Giant Strength'},{weight:1,name:'Berserker Axe'},{weight:1,name:'Boots of Levitation'},{weight:1,name:'Boots of Speed'},{weight:1,name:'Bowl of Commanding Water Elementals'},{weight:1,name:'Bracers of Defense'},{weight:1,name:'Brazier of Commanding Fire Elementals'},{weight:1,name:'Cape of the Mountebank'},{weight:1,name:'Censer of Controlling Air Elementals'},{weight:1,name:'+1 Chain Mail'},{weight:1,name:'Armor of Resistance (Chain Mail)'},{weight:1,name:'Armor of Resistance (Chain Shirt)'},{weight:1,name:'+ 1 Chain Shirt'},{weight:1,name:'Cloak of Displacement'},{weight:1,name:'Cloak of the Bat'},{weight:1,name:'Cube of Force'},{weight:1,name:'Daern\'s Instant Fortress'},{weight:1,name:'Dagger of Venom'},{weight:1,name:'Dimensional Shackles'},{weight:1,name:'Dragon Slayer (%%swords%%)'},{weight:1,name:'Elven Chain'},{weight:1,name:'Flame Tongue (%%swords%%)'},{weight:1,name:'Gem of Seeing'},{weight:1,name:'Giant Slayer (%%swords%%)'},{weight:1,name:'Glamoured Studded Leather'},{weight:1,name:'Helm of Teleportation'},{weight:1,name:'Horn of Blasting'},{weight:1,name:'Horn of Valhalla (Silver Or Brass)'},{weight:1,name:'Instrument of the Bards (Canaith Mandolin)'},{weight:1,name:'Instrument ofthe Bards (Cii Lyre)'},{weight:1,name:'Ioun Stone (Awareness)'},{weight:1,name:'Ioun Stone (Protection)'},{weight:1,name:'Ioun Stone (Reserve)'},{weight:1,name:'Ioun Stone (Sustenance)'},{weight:1,name:'Iron Bands of Bilarro'},{weight:1,name:'+1 Leather Armor'},{weight:1,name:'Leather Armor of Resistance'},{weight:1,name:'Mace of Disruption'},{weight:1,name:'Mace of Smiting'},{weight:1,name:'Mace of Terror'},{weight:1,name:'Mantle of Spell Resistance'},{weight:1,name:'Necklace of Prayer Beads (%%beads%%)'},{weight:1,name:'Periapt of Proof Against Poison'},{weight:1,name:'Ring of Animal Influence'},{weight:1,name:'Ring of Evasion'},{weight:1,name:'Ring of Feather Falling'},{weight:1,name:'Ring of Free Action'},{weight:1,name:'Ring of Protection'},{weight:1,name:'Ring of Resistance'},{weight:1,name:'Ring of Spell Storing'},{weight:1,name:'Ring of the Ram'},{weight:1,name:'Ring of X-Ray Vision'},{weight:1,name:'Robe of Eyes'},{weight:1,name:'Rod of Rulership'},{weight:1,name:'+2 Rod of the Pact Keeper'},{weight:1,name:'Rope of Entanglement'},{weight:1,name:'+1 Scale Mail'},{weight:1,name:'Scale Mail of Resistance'},{weight:1,name:'+2 Shield'},{weight:1,name:'Shield of Missile Attraction'},{weight:1,name:'Staff of Charming'},{weight:1,name:'Staff of Healing'},{weight:1,name:'Staff of Swarming Insects'},{weight:1,name:'Staff of the Woodlands'},{weight:1,name:'Staff of Withering'},{weight:1,name:'Stone of Controlling Earth Elementals'},{weight:1,name:'Sun Blade (%%swords%%)'},{weight:1,name:'%%swords%% of Life Stealing'},{weight:1,name:'%%swords%% of Wounding'},{weight:1,name:'Tentacle Rod'},{weight:1,name:'Vicious %%weapons%%'},{weight:1,name:'Wand of Binding'},{weight:1,name:'Wand of Enemy Detection'},{weight:1,name:'Wand of Fear'},{weight:1,name:'Wand of Fireballs'},{weight:1,name:'Wand of Lightning Bolts'},{weight:1,name:'Wand of Paralysis'},{weight:1,name:'+2 Wand of the War Mage'},{weight:1,name:'Wand of Wonder'},{weight:1,name:'Wings of Flying'}],tableH:[{weight:10,name:'+3 %%weapons%%'},{weight:3,name:'Amulet of the Planes',unique:true},{weight:2,name:'Carpet of Flying'},{weight:2,name:'Crystal Ball (Scrying)',unique:true},{weight:2,name:'Ring of Regeneration'},{weight:2,name:'Ring of Shooting Stars'},{weight:2,name:'Ring of Telekinesis',unique:true},{weight:2,name:'Robe of Scintillating Colors'},{weight:2,name:'Robe of Stars'},{weight:2,name:'Rod of Absorption'},{weight:2,name:'Rod of Alertness'},{weight:2,name:'Rod of Security'},{weight:2,name:'+3 Rod of the Pact Keeper'},{weight:2,name:'Scimitar of Speed'},{weight:2,name:'+3 Shield'},{weight:2,name:'Staff of Fire'},{weight:2,name:'Staff of Frost'},{weight:2,name:'Staff of Power'},{weight:2,name:'Staff of Striking'},{weight:2,name:'Staff of Thunder and Lightning'},{weight:2,name:'%%swords%% of Sharpness'},{weight:2,name:'Wand of Polymorph'},{weight:2,name:'+3 Wand of the War Mage'},{weight:1,name:'Adamantine Half Plate'},{weight:1,name:'Adamantine Plate'},{weight:1,name:'Animated Shield'},{weight:1,name:'Belt of Fire Giant Strength'},{weight:1,name:'Belt of Stone Giant Strength'},{weight:1,name:'+1 Breastplate'},{weight:1,name:'Breastplate of Resistance'},{weight:1,name:'Candle of Invocation'},{weight:1,name:'+2 Chain Mail'},{weight:1,name:'+2 Chain Shirt'},{weight:1,name:'Cloak of Arachnida'},{weight:1,name:'Dancing %%swords%%'},{weight:1,name:'Demon Armor'},{weight:1,name:'Dragon Scale Mail'},{weight:1,name:'Dwarven Plate'},{weight:1,name:'Dwarven Thrower'},{weight:1,name:'Efreeti Bottle',unique:true},{weight:1,name:'Figurine of Wondrous Power (Obsidian Steed)'},{weight:1,name:'Frost Brand (%%swords%%)'},{weight:1,name:'Helm of Brilliance'},{weight:1,name:'Horn of Valhalla (Bronze)'},{weight:1,name:'Instrument of the Bards (Anstruth Harp)'},{weight:1,name:'Ioun Stone (Absorption)'},{weight:1,name:'Ioun Stone (Agility)'},{weight:1,name:'Ioun Stone (Fortitude)'},{weight:1,name:'Ioun Stone (Insight)'},{weight:1,name:'Ioun Stone (Intellect)'},{weight:1,name:'Ioun Stone (Leadership)'},{weight:1,name:'Ioun Stone (Strength)'},{weight:1,name:'+2 Leather'},{weight:1,name:'Manual of Bodily Health'},{weight:1,name:'Manual of Gainful Exercise'},{weight:1,name:'Manual of Golems'},{weight:1,name:'Manual of Quickness of Action'},{weight:1,name:'Mirror of Life Trapping',unique:true},{weight:1,name:'Nine Lives Stealer',unique:true},{weight:1,name:'Oathbow'},{weight:1,name:'+2 Scale Mail'},{weight:1,name:'Spellguard Shield',unique:true},{weight:1,name:'+1 Splint'},{weight:1,name:'Armor of Resistance (Splint)'},{weight:1,name:'+1 Studded Leather'},{weight:1,name:'Studded Leather Armor of Resistance'},{weight:1,name:'Tome of Clear Thought'},{weight:1,name:'Tome of Leadership and Influence'},{weight:1,name:'Tome of Understanding'}],tableI:[{weight:5,name:'Defender (%%swords%%)',unique:true},{weight:5,name:'Hammer of Thunderbolts',unique:true},{weight:5,name:'Sword of Answering %%answers%%',unique:true},{weight:3,name:'Holy Avenger (%%swords%%)',unique:true},{weight:3,name:'Ring of Djinni Summoning',unique:true},{weight:3,name:'Ring of Invisibility',unique:true},{weight:3,name:'Ring of Spell Turning',unique:true},{weight:3,name:'Rod of Lordly Might',unique:true},{weight:3,name:'Vorpal %%swords%%',unique:true},{weight:2,name:'Belt of Cloud Giant Strength',unique:true},{weight:2,name:'+2 Breastplate'},{weight:2,name:'+3 Chain Mail'},{weight:2,name:'+3 Chain Shirt'},{weight:2,name:'Cloak of Invisibility',unique:true},{weight:2,name:'Crystal Ball %%crystal_balls%%',unique:true},{weight:2,name:'+ 1 Half Plate'},{weight:2,name:'Iron Flask',unique:true},{weight:2,name:'+3 Leather'},{weight:2,name:'+1 Plate'},{weight:2,name:'Robe of the Archmagi',unique:true},{weight:2,name:'Rod of Resurrection',unique:true},{weight:2,name:'+1 Scale Mail'},{weight:2,name:'Scarab of Protection',unique:true},{weight:2,name:'+2 Splint'},{weight:2,name:'+2 Studded Leather'},{weight:2,name:'Well of Many Worlds',unique:true},{weight:1,name:'%%magic_armor%%'},{weight:1,name:'Armor of Invulnerability',unique:true},{weight:1,name:'Belt of Storm Giant Strength',unique:true},{weight:1,name:'Cubic Gate',unique:true},{weight:1,name:'Deck of Many Things',unique:true},{weight:1,name:'Efreeti Chain',unique:true},{weight:1,name:'Half Plate Armor of Resistance'},{weight:1,name:'Horn of Valhalla (Iron)',unique:true},{weight:1,name:'Instrument of the Bards (Ollamh Harp)',unique:true},{weight:1,name:'Ioun Stone (Greater Absorption)',unique:true},{weight:1,name:'Ioun Stone (Mastery)',unique:true},{weight:1,name:'Ioun Stone (Regeneration)',unique:true},{weight:1,name:'Plate Armor of Etherealness',unique:true},{weight:1,name:'Plate Armor of Resistance'},{weight:1,name:'Ring of Air Elemental Command',unique:true},{weight:1,name:'Ring of Earth Elemental Command',unique:true},{weight:1,name:'Ring of Fire Elemental Command',unique:true},{weight:1,name:'Ring of Three Wishes',unique:true},{weight:1,name:'Ring of Water Elemental Command',unique:true},{weight:1,name:'Sphere of Annihilation',unique:true},{weight:1,name:'Talisman of Pure Good',unique:true},{weight:1,name:'Talisman of the Sphere',unique:true},{weight:1,name:'Talisman of Ultimate Evil',unique:true},{weight:1,name:'Tome of the Stilled Tongue',unique:true}],magicArmor:[{weight:2,name:'+2 Half Plate'},{weight:2,name:'+2 Plate'},{weight:2,name:'+3 Studded Leather'},{weight:2,name:'+3 Breastplate'},{weight:2,name:'+3 Splint'},{weight:1,name:'+3 Half Plate'},{weight:1,name:'+3 Plate'}],figurines:[{weight:1,name:'Bronze Griffon'},{weight:1,name:'Ebony Fly'},{weight:1,name:'Golden Lions'},{weight:1,name:'Ivory Goats'},{weight:1,name:'Marble Elephant'},{weight:2,name:'Onyx Dog'},{weight:1,name:'Serpentine Owl'}],crystalBalls:[{weight:1,name:'of Mind Reading',unique:true},{weight:2,name:'of Telepathy',unique:true},{weight:1,name:'of True Seeing',unique:true},],answers:[{weight:1,name:'Answerer',unique:true},{weight:1,name:'Back Talker',unique:true},{weight:1,name:'Concluder',unique:true},{weight:1,name:'Last Quip',unique:true},{weight:1,name:'Rebutter',unique:true},{weight:1,name:'Replier',unique:true},{weight:1,name:'Retorter',unique:true},{weight:1,name:'Scather',unique:true},{weight:1,name:'Squelcher',unique:true}],monsterTypes:[{weight:20,name:'Humanoid'},{weight:15,name:'Beast'},{weight:10,name:'Giant'},{weight:10,name:'Dragon'},{weight:5,name:'Fey'},{weight:5,name:'Undead'},{weight:3,name:'Fiend'},{weight:3,name:'Monstrosity'},{weight:2,name:'Construct'},{weight:1,name:'Aberration'},{weight:1,name:'Celestial'},{weight:1,name:'Elemental'},{weight:1,name:'Ooze'},{weight:1,name:'Plant'}],damageTypes:[{weight:6,name:'Acid'},{weight:10,name:'Cold'},{weight:10,name:'Fire'},{weight:1,name:'Force'},{weight:3,name:'Lightning'},{weight:2,name:'Necrotic'},{weight:5,name:'Poison'},{weight:1,name:'Radiant'},{weight:1,name:'Thunder'}],beads:[{weight:6,name:'Blessing'},{weight:6,name:'Curing'},{weight:4,name:'Favor'},{weight:2,name:'Smiting'},{weight:1,name:'Summons'},{weight:1,name:'Wind walking'}]},
    SPELLS={cantrips:['Acid Splash','Blade Ward','Chill Touch','Dancing Lights','Druidcraft','Eldritch Blast','Fire Bolt','Friends','Guidance','Light','Mage Hand','Mending','Message','Minor Illusion','Poison Spray','Prestidigitation','Produce Flame','Ray of Frost','Resistance','Sacred Flame','Shillelagh','Shocking Grasp','Spare the Dying','Thaumaturgy','Thorn Whip','True Strike','Vicious Mockery'],level1:['Alarm','Animal Friendship','Armor of Agathys','Arms of Hadar','Bane','Bless','Burning Hands','Charm Person','Chromatic Orb','Color Spray','Command','Compelled Duel','Comprehend Languages','Create or Destroy Water','Cure Wounds','Detect Evil and Good','Detect Magic','Detect Poison and Disease','Disguise Self','Dissonant Whispers','Divine Favor','Ensnaring Strike','Entangle','Expeditious Retreat','Faerie Fire','False Life','Feather Fall','Find Familiar','Fog Cloud','Goodberry','Grease','Guiding Bolt','Hail of Thorns','Healing Word','Hellish Rebuke','Heroism','Hex','Hunter\'s Mark','Identify','Illusory Script','Inflict Wounds','Jump','Longstrider','Mage Armor','Magic Missile','Protection from Evil and Good','Purify Food and Drink','Ray of Sickness','Sanctuary','Searing Smite','Shield','Shield of Faith','Silent Image','Sleep','Speak with Animals','Tasha\'s Hideous Laughter','Tenser\'s Floating Disk','Thunderous Smite','Thunderwave','Unseen Servant','Witch Bolt','Wrathful Smite'],level2:['Aid','Alter Self','Animal Messenger','Arcane Lock','Augury','Barkskin','Beast Sense','Blindness/Deafness','Blur','Branding Smite','Calm Emotions','Cloud of Daggers','Continual Flame','Cordon of Arrows','Crown of Madness','Darkness','Darkvision','Detect Thoughts','Enhance Ability','Enlarge/Reduce','Enthrall','Find Steed','Find Traps','Flame Blade','Flaming Sphere','Gentle Repose','Gust of Wind','Heat Metal','Hold Person','Invisibility','Knock','Lesser Restoration','Levitate','Locate Animals or Plants','Locate Object','Magic Mouth','Magic Weapon','Melf\'s Acid Arrow','Mirror Image','Misty Step','Moonbeam','Nystul\'s Magic Aura','Pass without Trace','Phantasmal Force','Prayer of Healing','Protection from Poison','Ray of Enfeeblement','Rope Trick','Scorching Ray','See Invisibility','Shatter','Silence','Spider Climb','Spike Growth','Spiritual Weapon','Suggestion','Warding Bond','Web','Zone of Truth'],level3:['Animate Dead','Aura of Vitality','Beacon of Hope','Bestow Curse','Blinding Smite','Blink','Call Lightning','Clairvoyance','Conjure Animals','Conjure Barrage','Counterspell','Create Food and Water','Crusader\'s Mantle','Daylight','Dispel Magic','Elemental Weapon','Fear','Feign Death','Fireball','Fly','Gaseous Form','Glyph of Warding','Haste','Hunger of Hadar','Hypnotic Pattern','Leomund\'s Tiny Hut','Lightning Arrow','Lightning Bolt','Magic Circle','Major Image','Mass Healing Word','Meld into Stone','Nondetection','Phantom Steed','Plant Growth','Protection from Energy','Remove Curse','Revivify','Sending','Sleet Storm','Slow','Speak with Dead','Speak with Plants','Spirit Guardians','Stinking Cloud','Tongues','Vampiric Touch','Water Breathing','Water Walk','Wind Wall'],level4:['Arcane Eye','Aura of Life','Aura of Purity','Banishment','Blight','Compulsion','Confusion','Conjure Minor Elementals','Conjure Woodland Beings','Control Water','Death Ward','Dimension Door','Divination','Dominate Beast','Evard\'s Black Tentacles','Fabricate','Fire Shield','Freedom of Movement','Giant Insect','Grasping Vine','Greater Invisibility','Guardian of Faith','Hallucinatory Terrain','Ice Storm','Leomund\'s Secret Chest','Locate Creature','Mordenkainen\'s Faithful Hound','Mordenkainen\'s Private Sanctum','Otiluke\'s Resilient Sphere','Phantasmal Killer','Polymorph','Staggering Smite','Stone Shape','Stoneskin','Wall of Fire'],level5:['Animate Objects','Antilife Shell','Awaken','Banishing Smite','Bigby\'s Hand','Circle of Power','Cloudkill','Commune','Commune with Nature','Cone of Cold','Conjure Elemental','Conjure Volley','Contact Other Plane','Contagion','Creation','Destructive Wave','Dispel Evil and Good','Dominate Person','Dream','Flame Strike','Geas','Greater Restoration','Hallow','Hold Monster','Insect Plague','Legend Lore','Mass Cure Wounds','Mislead','Modify Memory','Passwall','Planar Binding','Raise Dead','Rary\'s Telepathic Bond','Reincarnate','Scrying','Seeming','Swift Quiver','Telekinesis','Teleportation Circle','Tree Stride','Wall of Force','Wall of Stone'],level6:['Arcane Gate','Blade Barrier','Chain Lightning','Circle of Death','Conjure Fey','Contingency','Create Undead','Disintegrate','Drawmij\'s Instant Summons','Eyebite','Find the Path','Flesh to Stone','Forbiddance','Globe of Invulnerability','Guards and Wards','Harm','Heal','Heroes\' Feast','Magic Jar','Mass Suggestion','Move Earth','Otiluke\'s Freezing Sphere','Otto\'s Irresistible Dance','Planar Ally','Programmed Illusion','Sunbeam','Transport via Plants','True Seeing','Wall of Ice','Wall of Thorns','Wind Walk','Word of Recall'],level7:['Conjure Celestial','Delayed Blast Fireball','Divine Word','Etherealness','Finger of Death','Fire Storm','Forcecage','Mirage Arcane','Mordenkainen\'s Magnificent Mansion','Mordenkainen\'s Sword','Plane Shift','Prismatic Spray','Project Image','Regenerate','Resurrection','Reverse Gravity','Sequester','Simulacrum','Symbol','Teleport'],level8:['Animal Shapes','Antimagic Field','Antipathy/Sympathy','Clone','Control Weather','Demiplane','Dominate Monster','Earthquake','Feeblemind','Glibness','Holy Aura','Incendiary Cloud','Maze','Mind Blank','Power Word Stun','Sunburst','Telepathy','Tsunami'],level9:['Astral Projection','Foresight','Gate','Imprisonment','Mass Heal','Meteor Swarm','Power Word Heal','Power Word Kill','Prismatic Wall','Shapechange','Storm of Vengeance','Time Stop','True Polymorph','True Resurrection','Weird','Wish']},

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers
	};
}());

on("ready", function () {
    LootGenerator.checkInstall();
    LootGenerator.registerEventHandlers();
});
