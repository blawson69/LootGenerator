/*
LootGenerator
A Roll20 script for generating random loot for D&D 5e games. This script and its contents are permissible under the Wizards of the Coast's Fan Content Policy. Portions of the data used are property of and © Wizards of the Coast LLC.

On Github:	https://github.com/blawson69
Contact me: https://app.roll20.net/users/1781274/ben-l

Like this script? Buy me a coffee:
    https://venmo.com/theRealBenLawson
    https://paypal.me/theRealBenLawson
*/

var LootGenerator = LootGenerator || (function () {
    'use strict';

    //---- INFO ----//

    var version = '4.0',
    debugMode = false,
    styles = {
        box:  'background-color: #fff; border: 1px solid #000; padding: 8px 10px; border-radius: 6px; margin-left: -40px; margin-right: 0px;',
        title: 'padding: 0 0 10px 0; color: #591209; font-size: 1.5em; font-weight: bold; font-variant: small-caps; font-family: "Times New Roman",Times,serif;',
        subtitle: 'margin-top: -4px; padding-bottom: 4px; color: #666; font-size: 1.125em; font-variant: small-caps;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 5px 8px; color: #fff; text-align: center;',
        buttonAlt: 'background-color: #7a2016; border-width: 0px; border-radius: 5px; padding: 5px 8px; color: #fff; text-align: center;',
        buttonWrapper: 'text-align: center; margin: 10px 0; clear: both;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #591209; text-decoration: underline;',
        infoLink: 'background-color: transparent; border: none; padding: 0; color: #591209; text-decoration: none; font-family: Webdings;',
        imgLink: 'background-color: transparent; border: none; padding: 0;text-decoration: none;',
        fullWidth: 'width: 100%; display: block; padding: 12px 0; text-align: center;',
        code: 'font-family: "Courier New", Courier, monospace; padding-bottom: 6px;',
        hr: 'border-top: 1px dashed #8c8b8b; background-color: transparent;',
        accent: 'background-color: ##eaeaea;'
    },

    checkInstall = function () {
        if (!_.has(state, 'LootGenerator')) {
            state['LootGenerator'] = state['LootGenerator'] || {};
            if (typeof state['LootGenerator'].defaults == 'undefined') state['LootGenerator'].defaults = {coins: 'show-coins', gems: 'show-gems', art: 'show-art', mundane: 'show-mundane', magic: 'show-magic'};
            if (typeof state['LootGenerator'].loot == 'undefined') state['LootGenerator'].loot = [];
            if (typeof state['LootGenerator'].sheet == 'undefined') state['LootGenerator'].sheet = 'Unknown';
            if (typeof state['LootGenerator'].hideInfo == 'undefined') state['LootGenerator'].hideInfo = true;
            adminDialog('Build Database', 'This is your first time using LootGenerator, so you must build the default treasure database. This must be done before any customization can occur. '
            + '<br><div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --setup --reset">Run Setup</a></div>');
        }

        state['LootGenerator'].loot = _.reject(state['LootGenerator'].loot, function (x) { return x.coins == '' && _.size(x.treasure) == 0; });
        commandUnbestowedList(true);

        if (state['LootGenerator'].sheet == 'Unknown') {
            var message, sheet = detectSheet();
            if (sheet == 'Unknown') {
                message = 'LootGenerator was unable to detect the character sheet for your game! You must be using either the 5e Shaped Sheet or the 5th Edition OGL Sheet. Please indicate which sheet you are using.';
                message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --config --sheet|?{Choose Sheet|5e Shaped|5th Edition OGL}">SET SHEET</a></div>';
                adminDialog('Configuration Notice', message);
            } else {
                state['LootGenerator'].sheet = sheet;
            }
        }

        if (typeof state['LootGenerator'].mundane.swords != 'undefined' && !_.find(state['LootGenerator'].mundane.swords, function (x) {return x.name == 'Rapier';})) {
            adminDialog('⚠️ Database Warning', 'You just upgraded LootGenerator. Congratulations! But before you use the new version, you <b>must reset</b> the database! View the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.');
        }

        log('--> LootGenerator v' + version + ' <-- Initialized');
		if (debugMode) {
            var d = new Date();
            adminDialog('Debug Mode', 'LootGenerator v' + version + ' loaded at ' + d.toLocaleTimeString() + '<br><div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --config">Show Config</a></div>');
        }
    },

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!loot')) {
			var parms = msg.content.split(/\s+/i);
			if (parms[1] && playerIsGM(msg.playerid)) {
				switch (parms[1]) {
					case '--setup':
						commandSetup(msg.content);
						break;
                    case '--config':
						commandConfig(msg.content);
						break;
					case '--show':
						commandGenerate(msg);
						break;
                    case '--default':
						commandSetDefault(msg.content);
						break;
                    case '--disp':
						commandDispense(msg.content);
						break;
                    case '--list':
						commandUnbestowedList();
						break;
                    case '--export':
						commandExport(msg.content);
						break;
                    case '--import':
						commandImport(msg.content);
						break;
                    case '--bestow':
						commandBestow(msg);
						break;
                    case '--view':
						//commandView(msg);
						break;
					case '--help':
                    default:
						commandHelp();
				}
			} else {
                if (playerIsGM(msg.playerid)) commandHelp();
            }
		}
    },

    //----- COMMAND FUNCTIONS -----//

    commandGenerate = function (msg) {
        // Parse command and generate loot
        var dieroll, type, level = 0, horde, mod = '', loc = '', recip = '', message, title = 'Loot', loot = [], treasure = [], coins = '', xtra = '',
        rm = /\-\-mod/gi, rx = /\-\-incl/gi, rl = /\-\-loc/gi, rr = /\-\-recip/gi, rd = /\d+/gi, rw = /\-\-whisper/gi, rt = /\-\-test/gi,
        cmds = msg.content.split(/\s+\-\-/);
        var test_run = rt.test(msg.content);
        if (rl.test(msg.content)) loc = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('loc:') }).split(':')[1].trim();
        if (rr.test(msg.content)) recip = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('recip:') }).split(':')[1].trim();
        if (rm.test(msg.content)) mod = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('mod:') }).split(':')[1].trim();
        if (rx.test(msg.content)) xtra = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('incl:') }).split(':')[1].trim();

        type = _.find(cmds, function(tmpStr){ return tmpStr.startsWith('type:') });
        if (type) {
            type = type.trim().split(':')[1];
            if (rd.test(type)) level = _.last(type.split(''));
            horde = (type.toLowerCase().startsWith('ind')) ? false : true;
            mod = getMods(mod);
            dieroll = randomInteger(100);

            if (mod.coins.search(/(show|less|more|dbl)/i) > -1) coins = generateCoins(dieroll, mod.coins, horde, level);
            if (coins != '') loot.push(coins);

            if (mod.mundane.search(/(show|less|more|dbl)/i) > -1) treasure.push(generateMundane(dieroll, mod.mundane, horde, level));
            if (mod.mundane == 'dbl-mundane') treasure.push(generateMundane(dieroll, mod.mundane, horde, level));

            if (horde) {
                if (mod.gems.search(/(show|less|more|dbl)/i) > -1) treasure.push(generateGems(dieroll, mod.gems, level));
                if (mod.gems == 'dbl-gems') treasure.push(generateGems(dieroll, mod.gems, level));

                if (mod.art.search(/(show|less|more|dbl)/i) > -1) treasure.push(generateArt(dieroll, mod.art, level));
                if (mod.art == 'dbl-art') treasure.push(generateArt(dieroll, mod.art, level));

                if (mod.magic.search(/(show|less|more|dbl)/i) > -1) treasure.push(generateMagicItems(dieroll, mod.magic, level, test_run));
                if (mod.magic == 'dbl-magic') treasure.push(generateMagicItems(dieroll, mod.magic, level, test_run));
            }
            if (xtra != '') {
                xtra = xtra.replace(/[^a-zA-Z0-9\s\,\'\*]/g, '');
                treasure.push(xtra.split(/\s*,\s*/));
            }

            treasure = denumerateItems(_.shuffle(_.flatten(treasure)));
            if (_.size(treasure) > 0) loot.push(treasure);
            loot = _.flatten(loot);

            title += (loc) ? ' from ' + loc : '';
            message = (recip) ? recip + ', you found: ' : 'You found: ';
            if (_.size(loot) == 0) message = (recip ? recip + ', you' : 'You') + ' found nothing.';
            message += enumerateItems(loot).join(', ');

            if (!test_run) {
                var whispered = rw.test(msg.content);
                if (whispered) showDialog(title, message, (recip ? recip : 'GM'));
                else showDialog(title, message);
                saveLoot(title, coins, treasure, recip, whispered);
            } else {
                adminDialog(title, '<div style="' + styles.subtitle + '"><b>Test Run:</b> Rolled a ' + dieroll + '</div>' + message);
            }
        } else {
            adminDialog('Error','No valid treasure level was provided. Please try again.');
        }
    },

    showLoot = function (loot_id) {
        var message, loot = _.find(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });
        if (loot) {
            message = (loot.recip != '') ? loot.recip + ' found: ' : '';
            message += (loot.coins != '') ? loot.coins + ', ' : '';
            message += enumerateItems(loot.treasure).join(', ');
            if (loot.whispered) showDialog(loot.name, message, (loot.recip != '' ? loot.recip : 'GM'));
            else showDialog(loot.name, message);
        }
    },

    saveLoot = function (title, coins, treasure, recip, whispered = false) {
        var loot_id = generateUniqueID(), loot;
        if (title == 'Loot') title = title + ' ' + (_.size(_.filter(state['LootGenerator'].loot, function (x) { return x.name.search(/^Loot\s\d{1,3}$/) != -1; })) + 1);
        if (_.find(state['LootGenerator'].loot, function (x) { return x.name.startsWith(title); })) title = title + ' ' + (_.size(_.filter(state['LootGenerator'].loot, function (x) { return x.name.startsWith(title); })) + 1);
        loot = { name: title, id: loot_id, recip: recip, coins: coins, treasure: treasure, whispered: whispered };
        state['LootGenerator'].loot.push(loot);
        showDispensary(loot_id, false);
    },

    commandUnbestowedList = function (startup = false) {
        if (_.size(state['LootGenerator'].loot) > 0) {
            var message = (startup) ? '<p>Treasure Collection(s) from previous session(s) that have not been completely distributed:</p><ul>' : '<p>The following Treasure Collection(s) have not been completely distributed:</p><ul>';
            _.each(state['LootGenerator'].loot, function (loot) {
                message += '<li><a style=\'' + styles.textButton + '\' href="!loot --disp --id|' + loot.id + '" title="Show ' + loot.name + ' for distribution">' + loot.name + '</a>';
                message += (loot.whispered ? ' <span style="cursor: pointer;" title="Whispered Loot">🔇</span>' : '');
                message += ' &nbsp; <a style=\'' + styles.imgLink + 'font-size: 0.75em;\' href="!loot --disp --id|' + loot.id + ' --delete" title="Delete ' + loot.name + '">❌</a></li>';
            });
            message += '</ul>';
            adminDialog('Unbestowed Loot', message);
        } else {
            if (!startup) adminDialog('Unbestowed Loot', 'No Treasure Collections remain to be distributed.');
        }
    },

    commandDispense = function (msg) {
        var parms = msg.trim().split(/\s+\-\-/i), loot_id = '', delLoot = false;
        _.each(parms, function (x) {
            var parts = x.split(/\s*\|\s*/i);
            if (parts[0] == 'id' && parts[1] != '') loot_id = parts[1];
            if (parts[0] == 'delete') delLoot = true;
        });
        if (delLoot && loot_id != '') {
            state['LootGenerator'].loot = _.reject(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });
            commandUnbestowedList();
        }
        if (loot_id != '' && !delLoot) showDispensary(loot_id);
    },

    showDispensary = function (loot_id, player_view = true) {
        // Displays GM dialog for dispensing items from loot
        var message = '', title = '', loot = _.find(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });
        if (loot && (loot.coins != '' || _.size(loot.treasure) > 0)) {
            var tList = [];
            title = (loot.name.search(/^Loot\s\d{1,3}$/) != -1) ? 'Bestow Items from ' + loot.name : 'Bestow Items from ' + loot.name.replace(/Loot\s(from\s)?/i, '');

            if (loot.coins != '') {
                message += 'Coins found: ' + loot.coins + '.';
                var title_text = (usePurseStrings()) ? 'Add coins to the selected character\'s Purse' : 'Give coins to the selected character';
                message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --bestow --loot|COINS --dest|sel --id|' + loot_id + '" title="' + title_text + '">Bestow to Character</a></div>';
                if (usePurseStrings()) message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --bestow --loot|COINS --dest|party --id|' + loot_id + '" title="Distribute coins amongst the Party Members">Distribute to Party Members</a></div>';
            }

            if (_.size(loot.treasure) > 0) {
                if (loot.coins != '') message += '<hr style=\'' + styles.hr + '\'>';
                message += 'Treasure found:<br>';
                _.each(loot.treasure, function (item) {
                    item = item.replace(/<\/?(span|div|pre|img|code|b|i|h1|h2|h3|h4|h5|ol|ul|pre)[^>]*>/gi, '');
                    var tmp_item = '<a style=\'' + styles.textButton + '\' href="!loot --bestow --loot|' + item + ' --dest|sel --id|' + loot_id + '" title="Bestow ' + item + ' to the selected character">' + item + '</a>';
                    //if (useItemDB() && typeof ItemDB.get(item) != 'undefined') tmp_item += '&nbsp;<a style=\'' + styles.infoLink + '\' href="!loot --view ' + item + '" title="View info on ' + item + '">i</a>';
                    tList.push(tmp_item);
                });
                message += enumerateItems(tList).join(', ');
                message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --bestow --loot|ALL --dest|sel --id|' + loot_id + '" title="Bestow all treasure items to the selected character">Bestow to Character</a></div>';
            }

            // EVERYTHING left to the handout
            message += '<hr style=\'' + styles.hr + '\'><div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.buttonAlt + '\' href="!loot --bestow --loot|ALL --dest|party --id|' + loot_id + '" title="Save all coins and/or treasure to the Party Loot handout">💾 Save All to Handout</a></div>';

            if (player_view) showLoot(loot_id);
        } else {
            if (loot) {
                title = 'Distribution Complete';
                message = 'No more items found. The "' + loot.name + '" Treasure Collection has been removed from storage.';
                showDialog(loot.name, 'All loot has been distributed.');
            } else {
                title = 'Error';
                message = 'A Treasure Collection with that ID no longer exists.';
            }
        }
        if (loot.coins == '' && _.size(loot.treasure) == 0) {
            state['LootGenerator'].loot = _.reject(state['LootGenerator'].loot, function (x) { return x.id == loot_id; })
        }
        adminDialog(title, message);
    },

    commandBestow = function (msg) {
        var parms = msg.content.trim().split(/\s+\-\-/i), loot_id, loot_item, dest;
        _.each(parms, function (x) {
            var parts = x.split(/\s*\|\s*/i);
            if (parts[0] == 'id' && parts[1] != '') loot_id = parts[1];
            if (parts[0] == 'loot' && parts[1] != '') loot_item = parts[1];
            if (parts[0] == 'dest' && parts[1] != '') dest = parts[1];
        });

        var message = '', token, char, char_id,
        loot = _.find(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });
        if (loot) {
            if (msg.selected) token = getObj(msg.selected[0]._type, msg.selected[0]._id);
            if (token) {
                char = getObj('character', token.get('represents'));
                if (char) char_id = char.get('id');
            }

            var name = loot.name, coins = loot.coins, treasure = _.clone(loot.treasure), tList = [];
            var done, success_message, error_message;
            switch (loot_item) {
                case 'COINS':
                    if (dest == 'party') {
                        done = (usePurseStrings()) ? PurseStrings.distributeCoins(coins) : toPartyHandout(loot_id, [coins]);
                        success_message = (usePurseStrings()) ? coins + ' successfully distributed to Party Members.' : coins + ' successfully added to Party Loot handout.';
                        error_message = (usePurseStrings()) ? 'Unable to distribute coins to Party Members.' : 'Unable to add coins to Party Loot handout.';
                    } else { // dest == 'sel'
                        if (char_id) {
                            done = (usePurseStrings()) ? PurseStrings.changePurse(coins, char_id, 'add') : toCharNotes(char_id, loot_id, coins);
                            success_message = (usePurseStrings()) ? coins + ' successfully added to ' +  char.get('name') + '\'s Purse.' : coins + ' successfully bestowed to ' +  char.get('name') + '.';
                            error_message = (usePurseStrings()) ? 'Unable to add coins to ' +  char.get('name') + '\'s Purse.' : 'Unable to bestow coins to ' +  char.get('name') + '.';
                        } else {
                            error_message = 'No character token selected.';
                        }
                    }
                    if (done) {
                        if (loot.whispered && dest != 'party') showDialog('Coins Bestowed', success_message, char.get('name'));
                        else showDialog('Coins Bestowed', success_message);
                        loot.coins = '';
                    } else adminDialog('Bestow Error', error_message);
                    break;
                case 'ALL':
                    if (dest == 'party') {
                        toPartyHandout(loot_id, treasure);
                    } else { // dest == 'sel'
                        var errs = [];
                        if (char_id) {
                            _.each(treasure, function (item) {
                                var idb_items = denumerateItems([item]);
                                if (useItemDB() && typeof ItemDB.get(idb_items[0]) != 'undefined') {
                                    _.each(idb_items, function (x) {
                                        added = ItemDB.add(x, char_id);
                                        if (!added.success) log('Add error from LootGenerator: ' + added.err);
                                        else done = true;
                                    });
                                } else {
                                    done = toCharNotes(char_id, loot_id, item);
                                }
                                if (done) {
                                    var used = loot.treasure[_.lastIndexOf(loot.treasure, item)] = '';
                                    loot.treasure = _.compact(used);
                                } else errs.push('"' + item + '" failed to be added.');
                            });

                            if (_.size(errs) > 0) {
                                errs = _.unique(errs);
                                adminDialog('Bestow Error', 'The following errors occured bestowing loot to ' + char.get('name') + ':<ul><li>' + errs.join('</li><li>') + '</li><ul>');
                            } else {
                                if (loot.whispered) showDialog('Loot Bestowed', char.get('name') + ', you have been bestowed all of the loot.');
                                else showDialog('Loot Bestowed', 'All loot successfully bestowed to ' + char.get('name') + '.');
                            }
                        } else {
                            adminDialog('Bestow Error', 'No character token selected.');
                        }
                    }
                    break;
                default: // Single item
                    if (char_id) {
                        if (useItemDB() && typeof ItemDB.get(loot_item) != 'undefined') {
                            var added = ItemDB.add(loot_item, char_id);
                            done = added.success;
                        } else {
                            done = toCharNotes(char_id, loot_id, loot_item);
                        }

                        if (done) {
                            loot.treasure[_.lastIndexOf(loot.treasure, loot_item)] = '';
                            loot.treasure = _.compact(loot.treasure);
                            if (loot.whispered) showDialog('Loot Bestowed', char.get('name') + ', you have been bestowed ' + loot_item + '.');
                            else showDialog('Loot Bestowed', loot_item + ' bestowed to ' + char.get('name') + '.');
                        } else adminDialog('Bestow Error', 'Unable to bestow ' + loot_item + ' to ' + char.get('name') + '.');
                    } else {
                        adminDialog('Bestow Error', 'No character token selected.');
                    }
            }
            showDispensary(loot_id);
        }
    },

    toPartyHandout = function (loot_id, new_items) {
        // Save all remaining treasure to Party Loot handout
        var pLoot = findObjs({name: 'Party Loot', type: 'handout'})[0];
        if (!pLoot) pLoot = createObj("handout", {name: 'Party Loot'});
        if (pLoot) {
            var loot = _.find(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });
            var name = loot.name.toUpperCase() + ':', new_notes;
            if (typeof new_items == 'string') new_items = new_items.split(', ');
            new_items = denumerateItems(new_items);

            pLoot.get('notes', function (notes) {
                var lines = processHandout(notes);
                if (_.size(lines) != 0) lines.push('');
                if (loot.coins != '') name += ' ' + loot.coins + ',';
                lines.push(name + ' ' + enumerateItems(new_items).join(', '));

                if (lines[0] == '') lines.shift();
                new_notes = '<p>' + lines.join('</p><p>') + '</p>';

                setTimeout(function () {
                    pLoot.set({ notes: new_notes });
                    showDialog('Loot Saved', 'All remaining "' + loot.name + '" was successfully recorded in the <i>Party Loot</i> handout. The Treasure Collection has been removed from storage.');
                    state['LootGenerator'].loot = _.reject(state['LootGenerator'].loot, function (x) { return x.id == loot_id; })
                }, 0);
            });
        }
    },

    toCharNotes = function (char_id, loot_id, new_item) {
        // Save to character sheet notes
        var retval = true,
        loot = _.find(state['LootGenerator'].loot, function (x) { return x.id == loot_id; });

        var field = findObjs({ type: 'attribute', characterid: char_id, name: (state['LootGenerator'].sheet == '5e Shaped' ? 'miscellaneous_notes' : 'treasure') })[0];
        if (!field) field = createObj("attribute", {characterid: char_id, name: (state['LootGenerator'].sheet == '5e Shaped' ? 'miscellaneous_notes' : 'treasure'), current: ''});
        if (field) {
            var notes = field.get('current').split(/\n/), name = loot.name.toUpperCase() + ':', newLines = [], found = false;
            new_item = denumerateItems([new_item]);
            _.each(notes, function (line) {
                if (line.startsWith(name)) {
                    var items = denumerateItems(line.replace(name + ' ', '').split(/\,\s*/));
                    _.each(new_item, function (item) { items.push(item); });
                    line = name + ' ' + enumerateItems(items).join(', ');
                    found = true;
                }
                newLines.push(line);
            });

            if (!found) {
                if (notes != '') newLines.push('');
                newLines.push(name + ' ' + enumerateItems(new_item).join(', '));
            }

            if (newLines[0] == '') newLines.shift();
            field.set({ current: newLines.join('\n') });
        } else {
            retval = false;
        }
        return retval;
    },

    commandView = function (msg) {
        var loot_item = msg.content.replace(/\!loot\s+\-\-view/i, '').trim();
        if (useItemDB() && typeof ItemDB.get(loot_item) != 'undefined') {
            var item = ItemDB.describe(loot_item);
            if (state['LootGenerator'].hideInfo) showDialog(item.title, item.desc, msg.who);
            else showDialog(item.title, item.desc);
        }
    },

    getMods = function (mods = '') {
        var args = mods.trim().split(/\s*\,/i), newMods = {};
        newMods.coins = state['LootGenerator'].defaults.coins;
        newMods.gems = state['LootGenerator'].defaults.gems;
        newMods.art = state['LootGenerator'].defaults.art;
        newMods.mundane = state['LootGenerator'].defaults.mundane;
        newMods.magic = state['LootGenerator'].defaults.magic;
        _.each(args, function (arg) {
            if (arg.match(/[no|show|less|more|dbl]\-coins/gi)) newMods.coins = arg;
            if (arg.match(/[no|show|less|more|dbl]\-gems/gi)) newMods.gems = arg;
            if (arg.match(/[no|show|less|more|dbl]\-art/gi)) newMods.art = arg;
            if (arg.match(/[no|show|less|more|dbl]\-mundane/gi)) newMods.mundane = arg;
            if (arg.match(/[no|show|less|more|dbl]\-magic/gi)) newMods.magic = arg;
        });
        return newMods;
    },

    generateCoins = function (index, mod, horde, level) {
        // Returns a string with all coins
        index = modifyRoll(index, mod);
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

        if (mod == 'dbl-coins') {
            var num, aCoins = coins.split(', ');
            for (var x = 0; x < _.size(aCoins); x++) {
                num = parseInt(aCoins[x].replace(/[^\d]*/, ''));
                aCoins[x] = aCoins[x].replace(num, (num*2));
            }
            coins = aCoins.join(', ');
        }

        return coins;
    },

    generateGems = function (index, mod, level) {
        // Returns an array of gems
        index = modifyRoll(index, mod);
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

    generateArt = function (index, mod, level) {
        // Returns an array of art items
        index = modifyRoll(index, mod);
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

    generateMundane = function (index, mod, horde, level) {
        // Returns an array of magic items
        index = modifyRoll(index, mod);
        var count, tmpItem, diceExp, tmpArray = [], items = [], err = false;
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
                    // Check for custom randomized list
                    if (item.search(/\$\$/) != -1) {
                        var newItem = '', opts = item.split('$$');
                        _.each(opts, function (opt) {
                            if (opt.search('~') != -1) {
                                var choices = opt.split('~');
                                newItem += choices[randomInteger(_.size(choices) - 1)];
                            } else {
                                newItem += opt;
                            }
                        });
                        item = newItem;
                    }

                    // Check for item calling internal function (weapons, etc.)
                    if (item.search('%%') != -1) {
                        if (item.search('%%weapons%%') != -1) item = item.replace('%%weapons%%', randomWeapon().toString());
                        if (item.search('%%ammo%%') != -1) item = item.replace('%%ammo%%', randomMundane(1, 'ammo').toString());
                        if (item.search('%%armor%%') != -1) item = item.replace('%%armor%%', randomArmor().toString());
                        if (item.search('%%tools%%') != -1) item = item.replace('%%tools%%', randomMundane(1, 'tools').toString());
                        if (item.search('%%gaming_sets%%') != -1) item = item.replace('%%gaming_sets%%', randomMundane(1, 'gamingSets').toString());
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

    generateMagicItems = function (index, mod, level, test_run = false) {
        // Returns an array of magic items
        index = modifyRoll(index, mod);
        var count, tmpItem, diceExp, tmpArray = [], items = [], err = false;
        if (state['LootGenerator'].magic) {
            switch (level) {
                case '1':
                    if (index >= 37 && index <= 60) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableA', test_run));
                    } else if (index >= 61 && index <= 75) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableB', test_run));
                    } else if (index >= 76 && index <= 85) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableC', test_run));
                    } else if (index >= 86 && index <= 97) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableF', test_run));
                    } else if (index >= 98 && index <= 100) {
                        tmpArray.push(randomMagic(1, 'tableG', test_run));
                    }
                    break;
                case '2':
                    if (index >= 29 && index <= 44) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableA', test_run));
                    } else if (index >= 45 && index <= 63) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableB', test_run));
                    } else if (index >= 64 && index <= 74) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableC', test_run));
                    } else if (index >= 75 && index <= 80) {
                        tmpArray.push(randomMagic(1, 'tableD', test_run));
                    } else if (index >= 81 && index <= 94) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableF', test_run));
                    } else if (index >= 95 && index <= 96) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG', test_run));
                    } else if (index >= 97 && index <= 98) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableG', test_run));
                    } else if (index >= 99) {
                        tmpArray.push(randomMagic(1, 'tableH', test_run));
                    }
                    break;
                case '3':
                    if (index >= 16 && index <= 29) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableA', test_run));
                        tmpArray.push(randomMagic(randomInteger(6), 'tableB', test_run));
                    } else if (index >= 30 && index <= 50) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableC', test_run));
                    } else if (index >= 51 && index <= 66) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableD', test_run));
                    } else if (index >= 67 && index <= 74) {
                        tmpArray.push(randomMagic(1, 'tableE', test_run));
                    } else if (index >= 75 && index <= 82) {
                        tmpArray.push(randomMagic(1, 'tableF', test_run));
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG', test_run));
                    } else if (index >= 83 && index <= 92) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableH', test_run));
                    } else if (index >= 93) {
                        tmpArray.push(randomMagic(1, 'tableI', test_run));
                    }
                    break;
                case '4':
                    if (index >= 3 && index <= 14) {
                        tmpArray.push(randomMagic(randomInteger(8), 'tableC', test_run));
                    } else if (index >= 15 && index <= 46) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableD', test_run));
                    } else if (index >= 47 && index <= 68) {
                        tmpArray.push(randomMagic(randomInteger(6), 'tableE', test_run));
                    } else if (index >= 69 && index <= 72) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG', test_run));
                    } else if (index >= 73 && index <= 80) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableH', test_run));
                    } else if (index >= 91 && index <= 95) {
                        tmpArray.push(randomMagic(1, 'tableF', test_run));
                        tmpArray.push(randomMagic(randomInteger(4), 'tableG', test_run));
                    } else if ((index >= 81 && index <= 90) || index >= 96) {
                        tmpArray.push(randomMagic(randomInteger(4), 'tableI', test_run));
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
                    // Check for custom randomized list
                    if (item.search(/\$\$/) != -1) {
                        var newItem = '', opts = item.split('$$');
                        _.each(opts, function (opt) {
                            if (opt.search('~') != -1) {
                                var choices = opt.split('~');
                                newItem += choices[randomInteger(_.size(choices) - 1)];
                            } else {
                                newItem += opt;
                            }
                        });
                        item = newItem;
                    }

                    // Check for item calling internal function (weapons, etc.)
                    if (item.search('%%') != -1) {
                        if (item.search('%%damage_types%%') != -1) item = item.replace('%%damage_types%%', randomMagic(1, 'damageTypes').toString());
                        if (item.search('%%monster_types%%') != -1) item = item.replace('%%monster_types%%', randomMagic(1, 'monsterTypes').toString());
                        if (item.search('%%monster_protec%%') != -1) item = item.replace('%%monster_protec%%', randomMagic(1, 'monsterProtec').toString());
                        if (item.search('%%dragon_types%%') != -1) item = item.replace('%%dragon_types%%', randomMagic(1, 'dragonTypes').toString());
                        if (item.search('%%magic_armor%%') != -1) item = item.replace('%%magic_armor%%', randomMagic(1, 'magicArmor').toString());
                        if (item.search('%%metal_armor%%') != -1) item = item.replace('%%metal_armor%%', randomMundane(1, 'metalArmor').toString());
                        if (item.search('%%leather_armor%%') != -1) item = item.replace('%%leather_armor%%', randomMundane(1, 'leatherArmor').toString());
                        if (item.search('%%figurines%%') != -1) item = item.replace('%%figurines%%', randomMagic(1, 'figurines').toString());
                        if (item.search('%%crystal_balls%%') != -1) {
                            item = item.replace('%%crystal_balls%%', randomMagic(1, 'crystalBalls').toString());
                            // If all unique crystal balls are gone, remove parent listing
                            if (_.size(state['LootGenerator'].magic.crystalBalls) == 0) {
                                var oldMagic = _.reject(state['LootGenerator'].magic.tableI, function (oItem) { return oItem.name == 'Crystal Ball %%crystal_balls%%'; });
                                state['LootGenerator'].magic.tableI = oldMagic;
                            }
                        }
                        if (item.search('%%answers%%') != -1) {
                            item = item.replace('%%answers%%', randomMagic(1, 'answers').toString());
                            // If all unique Swords of Answering are gone, remove parent listing
                            if (_.size(state['LootGenerator'].magic.answers) == 0) {
                                var oldMagic = _.reject(state['LootGenerator'].magic.tableI, function (oItem) { return oItem.name == 'Sword of Answering - %%answers%%'; });
                                state['LootGenerator'].magic.tableI = oldMagic;
                            }
                        }
                        if (item.search('%%armor%%') != -1) item = item.replace('%%armor%%', randomArmor().toString());
                        if (item.search('%%ammo%%') != -1) item = item.replace('%%ammo%%', randomMundane(1, 'ammo').toString());
                        if (item.search('%%weapons%%') != -1) item = item.replace('%%weapons%%', randomWeapon('magic'));
                        if (item.search('%%swords%%') != -1) item = item.replace('%%swords%%', randomWeapon('swords'));
                        if (item.search('%%bludgeoning_weapons%%') != -1) item = item.replace('%%bludgeoning_weapons%%', randomWeapon('bludgeoningWeapons'));
                        if (item.search('%%piercing_weapons%%') != -1) item = item.replace('%%piercing_weapons%%', randomWeapon('piercingWeapons'));
                        if (item.search('%%slashing_weapons%%') != -1) item = item.replace('%%slashing_weapons%%', randomWeapon('slashingWeapons'));
                        if (item.search('%%twohanded_weapons%%') != -1) item = item.replace('%%twohanded_weapons%%', randomWeapon('twoHandedWeapons'));
                        if (item.search('%%thrown_weapons%%') != -1) item = item.replace('%%thrown_weapons%%', randomWeapon('thrownWeapons'));
                        if (item.search('%%finesse_weapons%%') != -1) item = item.replace('%%finesse_weapons%%', randomWeapon('finesseWeapons'));
                        if (item.search('%%versatile_weapons%%') != -1) item = item.replace('%%versatile_weapons%%', randomWeapon('versatileWeapons'));
                        if (item.search('%%light_weapons%%') != -1) item = item.replace('%%light_weapons%%', randomWeapon('lightWeapons'));
                        if (item.search('%%heavy_weapons%%') != -1) item = item.replace('%%heavy_weapons%%', randomWeapon('heavyWeapons'));
                        if (item.search('%%light_armor%%') != -1) item = item.replace('%%light_armor%%', randomArmor('lightArmor'));
                        if (item.search('%%medium_armor%%') != -1) item = item.replace('%%medium_armor%%', randomArmor('mediumArmor'));
                        if (item.search('%%heavy_armor%%') != -1) item = item.replace('%%heavy_armor%%', randomArmor('heavyArmor'));
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
                    if (item.search(/\@[0-9d\-\+]{3,6}\@/) != -1) {
                        diceExp = item.replace(/.*\@([^\@]+)\@.*/gi, '$1');
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

    randomWeapon = function (type = '') {
        // Returns a weapon name
        var count, weapon, silvered = randomInteger(100);
        if (type != '' && type != 'magic') weapon = randomMundane(1, type);
        else {
            count = randomInteger(100);
            if (count < 70) weapon = randomMundane(1, 'simpleWeapons');
            else if (count >= 70) weapon = randomMundane(1, 'martialWeapons');
        }

        // Mundane weapons have a chance to be silvered
        if (silvered >= 95 && type == '') weapon = 'Silvered ' + weapon;

        return weapon;
    },

    randomArmor = function (type = '') {
        // Returns an armor name
        var count, armor;
        if (type != '') armor = randomMundane(1, type);
        else {
            count = randomInteger(100);
            if (count < 50) armor = randomMundane(1, 'lightArmor');
            else if (count >= 50 && count < 85) armor = randomMundane(1, 'mediumArmor');
            else if (count >= 85) armor = randomMundane(1, 'heavyArmor');
        }
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

    randomMagic = function (times, table, test_run = false) {
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
                tmpItems = _.reject(tmpItems, function (oItem) { return origItem.name == oItem.name; });
                if (!test_run) {
                    var oldMagic = _.reject(state['LootGenerator'].magic[table], function (oItem) { return origItem.name == oItem.name; });
                    state['LootGenerator'].magic[table] = oldMagic;
                }
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
        message += '<div style=\'' + styles.code + '\'>!loot --show --type:&lt;loot_type&gt; --loc:&lt;location&gt; --recip:&lt;recipient&gt; --mod:&lt;modifications&gt; --incl:&lt;special_item&gt; --whisper/test</div><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;loot_type&gt;:</b><br>Mandatory. Either <i>Indiv</i> or <i>Horde</i>, plus <i>1 - 4</i> corresponding to CR 0-4, CR 5-10, CR 11-16, and CR 17+ respectfully.<br>Examples: <i>Indiv1, Horde3</i><br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;location&gt;:</b><br>Optional. The name of the location where the loot is found/discovered.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;recipient&gt;:</b><br>Optional. The name of the character who found the loot.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;modifications&gt;:</b><br>Optional. Modifications (comma delimited) to the default parameters for generating loot. Possible values are <i>no-, less-, show-,</i> or <i>more-</i> followed by <i>coins, gems, art, mundane,</i> or <i>magic.</i><br>Examples: <i>more-coins</i> and <i>no-magic, less-art</i><br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;special_item&gt;:</b><br>Optional. One or more special items (comma delimited) to add to the loot.<br><br>';
        message += '<b style=\'' + styles.code + '\'>--whisper:</b><br>Optional. Whispers results to the recipient (if provided) or the GM.<br><br>';
        message += '<b style=\'' + styles.code + '\'>--test:</b><br>Optional. Whispers results to GM without saving list or removing unique items.';
        message += '<hr style=\'' + styles.hr + '\'>';
        message += 'See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.';
        adminDialog('Help Menu', message);
    },

    commandConfig = function (msg) {
        // Set default options for loot generation
        var parms = msg.replace('!loot --config', '').split(/\s+\-\-/i);
        _.each(parms, function (x) {
            var parts = x.trim().split(/\s*\|\s*/i);
            if (parts[0] == 'toggle-view') state['LootGenerator'].hideInfo = !state['LootGenerator'].hideInfo;
            if (parts[0] == 'sheet' && parts[1] != '') {
                if (parts[1] == '5e Shaped' || parts[1] == '5th Edition OGL') state['LootGenerator'].sheet = parts[1];
                else state['LootGenerator'].sheet = 'Unknown';
            }
        });

        if (typeof state['LootGenerator'].sheet == 'undefined' || state['LootGenerator'].sheet == 'Unknown') {
            var gm_message = '<p style=\'' + styles.alert + '\'>⚠️ Unknown character sheet!</p>';
            gm_message += '<p>LootGenerator was unable to detect the character sheet for your game. You must be using either the 5e Shaped Sheet or the 5th Edition OGL Sheet. Please tell LootGenerator what character sheet is in use before you can continue using the script.</p><br>';
            gm_message += 'See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/LootGenerator" target="_blank">documentation</a> for more details.'
            + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!loot --config --sheet|?{Choose Sheet|5e Shaped|5th Edition OGL}">SET SHEET</a></div>';
            adminDialog('Error', gm_message);
        } else {
            var message = '';
            if (_.size(state['LootGenerator'].loot) > 0) {
                message += '<div style=\'' + styles.title + '\'>Unbestowed Loot</div>You have ' + _.size(state['LootGenerator'].loot) + ' Treasure ' + (_.size(state['LootGenerator'].loot) == 1 ? 'Collection' : 'Collections') + ' with undistributed loot remaining.';
                message += '<div style=\'' + styles.buttonWrapper + '\'><a style="' + styles.button + '" href="!loot --list">Show List</a></div><hr style=\'' + styles.hr + '\'>';
            }

            message += '<div style=\'' + styles.title + '\'>Defaults</div>';
            message += '<b>Coins:</b> ' + state['LootGenerator'].defaults.coins + ' <a style="' + styles.imgLink + '" href="!loot --default ?{Coins Default|Show,show-coins|Less,less-coins|More,more-coins|Double,dbl-coins}">✏️</a><br>';
            message += '<b>Gems:</b> ' + state['LootGenerator'].defaults.gems + ' <a style="' + styles.imgLink + '" href="!loot --default ?{Gems Default|Show,show-gems|None,no-gems|Less,less-gems|More,more-gems|Double,dbl-gems}">✏️</a><br>';
            message += '<b>Art:</b> ' + state['LootGenerator'].defaults.art + ' <a style="' + styles.imgLink + '" href="!loot --default ?{Art Default|Show,show-art|None,no-art|Less,less-art|More,more-art|Double,dbl-art}">✏️</a><br>';
            message += '<b>Mundane Items:</b> ' + state['LootGenerator'].defaults.mundane + ' <a style="' + styles.imgLink + '" href="!loot --default ?{Mundane Items Default|Show,show-mundane|None,no-mundane|Less,less-mundane|More,more-mundane|Double,dbl-mundane}">✏️</a><br>';
            message += '<b>Magic Items:</b> ' + state['LootGenerator'].defaults.magic + ' <a style="' + styles.imgLink + '" href="!loot --default ?{Magic Items Default|Show,show-magic|None,no-magic|Less,less-magic|More,more-magic|Double,dbl-magic}">✏️</a><br>';

            //if (useItemDB()) message += '<br><b>ItemDB Info:</b> Info links in the Bestow dialog will show item descriptions to <b>' + (state['LootGenerator'].hideInfo ? 'GM only' : 'all players') + '</b>. <a style="' + styles.textButton + '" href="!loot --config --toggle-view">change</a><br>';

            message += '<hr style=\'' + styles.hr + '\'>';
            message += 'See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.';

            adminDialog('', message);
        }
    },

    commandSetDefault = function (msg) {
        var parms = msg.split(/\s+/i);
        if (parms[2]) {
            if (parms[2].match(/[show|less|more|dbl]\-coins/gi)) state['LootGenerator'].defaults.coins = parms[2];
            if (parms[2].match(/[no|show|less|more|dbl]\-gems/gi)) state['LootGenerator'].defaults.gems = parms[2];
            if (parms[2].match(/[no|show|less|more|dbl]\-art/gi)) state['LootGenerator'].defaults.art = parms[2];
            if (parms[2].match(/[no|show|less|more|dbl]\-mundane/gi)) state['LootGenerator'].defaults.mundane = parms[2];
            if (parms[2].match(/[no|show|less|more|dbl]\-magic/gi)) state['LootGenerator'].defaults.magic = parms[2];
        } else {
            adminDialog('Set Default Error', 'No valid parameters were sent.');
        }
        commandConfig(msg);
    },

    commandSetup = function (msg) {
		// Build/Rebuild database of loot items
        var rx = /\-\-reset/gi;
        if (rx.test(msg)) {
            state['LootGenerator'].gems = null;
            state['LootGenerator'].art = null;
            state['LootGenerator'].mundane = null;
            state['LootGenerator'].magic = null;
            state['LootGenerator'].spells = null;
        }

        if (!state['LootGenerator'].gems) {
            log('LootGenerator: Building gems database...');
            state['LootGenerator'].gems = GEMS;
        }
        if (!state['LootGenerator'].art) {
            log('LootGenerator: Building art database...');
            state['LootGenerator'].art = ART;
        }
        if (!state['LootGenerator'].mundane) {
            log('LootGenerator: Building mundane items database...');
            state['LootGenerator'].mundane = MUNDANE;
        }
        if (!state['LootGenerator'].magic) {
            log('LootGenerator: Building magic items database...');
            state['LootGenerator'].magic = MAGIC;
        }
        if (!state['LootGenerator'].spells) {
            log('LootGenerator: Building spells database...');
            state['LootGenerator'].spells = SPELLS;
        }
        adminDialog('Setup Complete','The Loot Generator database has been loaded with loot items.');
	},

    commandExport = function (msg) {
        // !loot --import --tables:Table A, Spells
        var rt = /\-\-tables/gi, cmds = msg.split('--'), tables = [];
        if (rt.test(msg)) tables = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('tables:') }).split(':')[1].trim().split(/\s*,\s*/);
        tables = _.reject(tables, function (x) { return x.match(/^(Table [A-I]|Mundane|Spells|Gems|Art)$/) === null; });

        var parsedData, magic = [{heading:'Table A',table:'tableA'}, {heading:'Table B',table:'tableB'}, {heading:'Table C',table:'tableC'}, {heading:'Table D',table:'tableD'}, {heading:'Table E',table:'tableE'}, {heading:'Table F',table:'tableF'}, {heading:'Table G',table:'tableG'}, {heading:'Table H',table:'tableH'}, {heading:'Table I',table:'tableI'}];
        _.each(magic, function (level) {
            if (_.find(tables, function (table) { return table == level.heading; })) {
                var mNote = findObjs({name: 'Loot Generator: Magic ' + level.heading, type: 'handout'})[0];
                if (!mNote) mNote = createObj("handout", {name: 'Loot Generator: Magic ' + level.heading});
                if (mNote) {
                    parsedData = '';
                    _.each(state['LootGenerator'].magic[level.table], function (item) { parsedData += stringifyForExport(item); });
                    mNote.set({ notes: parsedData });
                    if (debugMode) log('Loot Generator: Magic ' + level.heading + ' has exported successfully.');
                }
            }
        });

        if (_.find(tables, function (table) { return table == 'Mundane'; })) {
            var muNote = findObjs({name: 'Loot Generator: Mundane Items', type: 'handout'})[0];
            if (!muNote) muNote = createObj("handout", {name: 'Loot Generator: Mundane Items'});
            if (muNote) {
                parsedData = '';
                _.each(state['LootGenerator'].mundane.gear, function (item) { parsedData += stringifyForExport(item); });
                muNote.set({ notes: parsedData });
                if (debugMode) log('Loot Generator: Mundane Items has exported successfully.');
            }
        }

        if (_.find(tables, function (table) { return table == 'Spells'; })) {
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
                if (debugMode) log('Loot Generator: Spells have exported successfully.');
            }
        }

        if (_.find(tables, function (table) { return table == 'Gems'; })) {
            var gNote = findObjs({name: 'Loot Generator: Gems', type: 'handout'})[0];
            if (!gNote) gNote = createObj("handout", {name: 'Loot Generator: Gems'});
            if (gNote) {
                parsedData = '';
                parsedData += '<p>LEVEL 1:</p><p>' + state['LootGenerator'].gems.level1.join(', ') + '</p>';
                parsedData += '<p>LEVEL 2:</p><p>' + state['LootGenerator'].gems.level2.join(', ') + '</p>';
                parsedData += '<p>LEVEL 3:</p><p>' + state['LootGenerator'].gems.level3.join(', ') + '</p>';
                parsedData += '<p>LEVEL 4:</p><p>' + state['LootGenerator'].gems.level4.join(', ') + '</p>';
                parsedData += '<p>LEVEL 5:</p><p>' + state['LootGenerator'].gems.level5.join(', ') + '</p>';
                gNote.set({ notes: parsedData });
                if (debugMode) log('Loot Generator: Gems have exported successfully.');
            }
        }

        if (_.find(tables, function (table) { return table == 'Art'; })) {
            var aNote = findObjs({name: 'Loot Generator: Art', type: 'handout'})[0];
            if (!aNote) aNote = createObj("handout", {name: 'Loot Generator: Art'});
            if (aNote) {
                parsedData = '';
                parsedData += '<p>LEVEL 1:</p><p>' + state['LootGenerator'].art.level1.join(', ') + '</p>';
                parsedData += '<p>LEVEL 2:</p><p>' + state['LootGenerator'].art.level2.join(', ') + '</p>';
                parsedData += '<p>LEVEL 3:</p><p>' + state['LootGenerator'].art.level3.join(', ') + '</p>';
                parsedData += '<p>LEVEL 4:</p><p>' + state['LootGenerator'].art.level4.join(', ') + '</p>';
                parsedData += '<p>LEVEL 5:</p><p>' + state['LootGenerator'].art.level5.join(', ') + '</p>';
                aNote.set({ notes: parsedData });
                if (debugMode) log('Loot Generator: Art has exported successfully.');
            }
        }

        adminDialog('Export Complete', 'The following Loot Generator tables have been eported: ' + tables.join(', ') + '.');
    },

    commandImport = function (msg) {
        // !loot --import --tables:Table A, Spells
        var oldData, message, title, tables,
        ra = /\-\-action/gi, rt = /\-\-tables/gi, cmds = msg.split('--');
        if (rt.test(msg)) tables = _.find(cmds, function(tmpStr){ return tmpStr.toLowerCase().startsWith('tables:') }).split(':')[1].trim().split(/,\s*/);

        if (tables) {
            var doneTables = [], errs = [], warnings = [];
            var magic = [{heading:'Table A',table:'tableA'}, {heading:'Table B',table:'tableB'}, {heading:'Table C',table:'tableC'}, {heading:'Table D',table:'tableD'}, {heading:'Table E',table:'tableE'}, {heading:'Table F',table:'tableF'}, {heading:'Table G',table:'tableG'}, {heading:'Table H',table:'tableH'}, {heading:'Table I',table:'tableI'}];

            _.each(magic, function (level) {
                if (_.find(tables, function (x) {return level.heading == x;})) {
                    var mNote = findObjs({name: 'Loot Generator: Magic ' + level.heading, type: 'handout'})[0];
                    if (mNote) {
                        mNote.get('notes', function (notes) {
                            var items = processHandout(notes);
                            oldData = [];
                            _.each(items, function (item) {
                                if (item.search(/\|/) > 0) {
                                    let aItem = item.split('|'), tmpItem = {};
                                    if (isNumber(aItem[0]) && typeof aItem[1] != 'undefined') {
                                        tmpItem.weight = parseInt(aItem[0]);
                                        tmpItem.name = aItem[1].trim();
                                        if (typeof aItem[2] != 'undefined') {
                                            if (aItem[2].toLowerCase().trim() == 'unique') tmpItem.unique = true;
                                            else warnings.push('Magic ' + level.heading + ': <i>' + item + '</i><br><span style="color: orange;">Mispelling - Item not Unique.</span>');
                                        }
                                        oldData.push(tmpItem);
                                    } else {
                                        if (!isNumber(aItem[0])) errs.push('Magic ' + level.heading + ': <i>' + item + '</i><br><span style="color: red;">Weight missing or not a Number.</span>');
                                        else errs.push('Magic ' + level.heading + ': <i>' + item + '</i><br><span style="color: red;">Incorrect format or missing information.</span>');
                                    }
                                } else {
                                    errs.push('Magic ' + level.heading + ': <i>' + item + '</i><br><span style="color: red;">' + (item.length == 0 ? 'Blank line' : 'No pipe separators') + '.</span>');
                                }
                            });
                            state['LootGenerator'].magic[level.table] = oldData;
                            doneTables.push(level.heading);
                        });
                    } else {
                        errs.push('"Loot Generator: Magic ' + level.heading + '" <span style="color: red;">handout does not exist.</span>');
                    }
                }
            });

            if (_.find(tables, function(x) { return x.toLowerCase() == 'mundane'; })) {
                var muNote = findObjs({name: 'Loot Generator: Mundane Items', type: 'handout'})[0];
                if (muNote) {
                    muNote.get('notes', function (notes) {
                        var oldData = [], items = processHandout(notes);
                        _.each(items, function (item) {
                            if (item.search(/\|/) > 0) {
                                let aItem = item.split('|'), tmpItem = {};
                                if (isNumber(aItem[0]) && aItem[1] != '') {
                                    tmpItem.weight = parseInt(aItem[0]);
                                    tmpItem.name = aItem[1].trim();
                                    oldData.push(tmpItem);
                                } else {
                                    if (!isNumber(aItem[0])) errs.push('Mundane Items: <i>' + item + '</i><br><span style="color: red;">Weight must be a Number.</span>');
                                    else errs.push('Mundane Items: <i>' + item + '</i><br><span style="color: red;">Incorrect format or missing information.</span>');
                                }
                            } else {
                                errs.push('Mundane Items: <i>' + item + '</i><br><span style="color: red;">' + (item.length == 0 ? 'Blank line' : 'No pipe separators') + '.</span>');
                            }
                        });
                        state['LootGenerator'].mundane.gear = oldData;
                        doneTables.push('Mundane');
                    });
                } else {
                    errs.push('"Loot Generator: Mundane Items" <span style="color: red;">handout does not exist.</span>');
                }
            }

            if (_.find(tables, function(x) { return x.toLowerCase() == 'spells'; })) {
                var spNote = findObjs({name: 'Loot Generator: Spells', type: 'handout'})[0];
                if (spNote) {
                    spNote.get('notes', function (notes) {
                        var items = processHandout(notes),
                        levels = [{heading:'CANTRIPS:',level:'cantrips'}, {heading:'1ST LEVEL:',level:'level1'}, {heading:'2ND LEVEL:',level:'level2'}, {heading:'3RD LEVEL:',level:'level3'}, {heading:'4TH LEVEL:',level:'level4'}, {heading:'5TH LEVEL:',level:'level5'}, {heading:'6TH LEVEL:',level:'level6'}, {heading:'7TH LEVEL:',level:'level7'}, {heading:'8TH LEVEL:',level:'level8'}, {heading:'9TH LEVEL:',level:'level9'}];

                        _.each(levels, function(level) {
                            if (_.find(items, function (x) { return x.search(level.heading) >= 0; })) {
                                let index = _.indexOf(items, level.heading) + 1;
                                if (items[index] && items[index].trim() != '' && !_.find(_.pluck(levels, 'heading'), function (x) {return x == items[index]})) {
                                    oldData = [];
                                    oldData.push(items[index].split(/,\s*/));
                                    oldData = _.flatten(oldData);
                                    state['LootGenerator'].spells[level.level] = oldData;
                                } else {
                                    errs.push('Spells: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' spells empty or missing.</span>');
                                }
                            } else {
                                errs.push('Spells: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' spells not found.</span>');
                            }
                        });
                    });
                    doneTables.push('Spells');
                } else {
                    errs.push('"Loot Generator: Spells" <span style="color: red;">handout does not exist.</span>');
                }
            }

            if (_.find(tables, function(x) { return x.toLowerCase() == 'gems'; })) {
                var gNote = findObjs({name: 'Loot Generator: Gems', type: 'handout'})[0];
                if (gNote) {
                    gNote.get('notes', function (notes) {
                        var items = processHandout(notes),
                        levels = [{heading:'LEVEL 1:',level:'level1'}, {heading:'LEVEL 2:',level:'level2'}, {heading:'LEVEL 3:',level:'level3'}, {heading:'LEVEL 4:',level:'level4'}, {heading:'LEVEL 5:',level:'level5'}];

                        _.each(levels, function(level) {
                            if (_.find(items, function (x) { return x.search(level.heading) >= 0; })) {
                                let index = _.indexOf(items, level.heading) + 1;
                                if (items[index] && items[index].trim() != '' && !_.find(_.pluck(levels, 'heading'), function (x) {return x == items[index]})) {
                                    oldData = [];
                                    oldData.push(items[index].split(/,\s*/));
                                    oldData = _.flatten(oldData);
                                    state['LootGenerator'].gems[level.level] = oldData;
                                } else {
                                    errs.push('Gems: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' gems empty or missing.</span>');
                                }
                            } else {
                                errs.push('Gems: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' gems not found.</span>');
                            }
                        });
                    });
                    doneTables.push('Gems');
                } else {
                    errs.push('"Loot Generator: Gems" <span style="color: red;">handout does not exist.</span>');
                }
            }

            if (_.find(tables, function(x) { return x.toLowerCase() == 'art'; })) {
                var aNote = findObjs({name: 'Loot Generator: Art', type: 'handout'})[0];
                if (aNote) {
                    aNote.get('notes', function (notes) {
                        var items = processHandout(notes),
                        levels = [{heading:'LEVEL 1:',level:'level1'}, {heading:'LEVEL 2:',level:'level2'}, {heading:'LEVEL 3:',level:'level3'}, {heading:'LEVEL 4:',level:'level4'}, {heading:'LEVEL 5:',level:'level5'}];

                        _.each(levels, function(level) {
                            if (_.find(items, function (x) { return x.search(level.heading) >= 0; })) {
                                let index = _.indexOf(items, level.heading) + 1;
                                if (items[index] && items[index].trim() != '' && !_.find(_.pluck(levels, 'heading'), function (x) {return x == items[index]})) {
                                    oldData = [];
                                    oldData.push(items[index].split(/,\s*/));
                                    oldData = _.flatten(oldData);
                                    state['LootGenerator'].art[level.level] = oldData;
                                } else {
                                    errs.push('Art: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' art empty or missing.</span>');
                                }
                            } else {
                                errs.push('Art: <span style="color: red;">' + level.heading.toLowerCase().replace(':', '') + ' art not found.</span>');
                            }
                        });
                    });
                    doneTables.push('Art');
                } else {
                    errs.push('"Loot Generator: Art" <span style="color: red;">handout does not exist.</span>');
                }
            }

            setTimeout(function () {
                title = 'Import Complete';
                message = 'Items have been successfully imported to the following tables: ' + doneTables.join(', ') + '.';

                if (_.size(errs) != 0 || _.size(warnings) != 0) message += '<br><br><div style=\'' + styles.title + '\'>However...</div>';

                if (_.size(warnings) != 0) {
                    message += '<p>The following items may not have imported as expected:<ul><li>' + warnings.join('</li><li>') + '</li></ul></p>';
                }

                if (_.size(errs) != 0) {
                    message += '<p>The following errors were encountered during import:<ul><li>' + errs.join('</li><li>') + '</li></ul></p>';

                    if (_.find(errs, function(x) { return x.search('pipe') >= 0 || x.search('format') >= 0; })) message += '<p>Each Magic or Mundane item should follow this format:<div style=\'' + styles.code + '\'>Weight|Item Name</div>or <div style=\'' + styles.code + '\'>Weight|Item Name|"unique"</div>';
                    message += '<br>See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.</p>';
                }
                adminDialog(title, message);
            }, 500);
        } else {
            message = 'The minimum parameters were not provided for import.<br><br>The import syntax is as follows:<br><div style=\'' + styles.code + '\'>!loot --import --tables:<table_name>[, &lt;table_name&gt;[...]]</div>example:<br><div style=\'' + styles.code + '\'>!loot --import --tables:Table A, Spells, Mundane</div>';
            message += '<br>See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/LootGenerator">documentation</a> for complete instructions.';
            adminDialog('Import Error', message);
        }
    },

    //---- UTILITY FUNCTIONS ----//

    isNumber = function (num) {
        var retval;
        if (typeof num == 'number') retval = true;
        else if (typeof num == 'string') retval = (num.match(/^\d+$/i) !== null);
        return retval;
    },

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

    denumerateItems = function (items) {
        // Takes an array of enumerated items and expands it by count
        var tmpItems = [], re = /^[^\(]+\(\d+\)$/;
        _.each(items, function (item) {
            if (item.match(re)) {
                var parts = item.split(/\s*\(/);
                var count = parseInt(parts[1].replace(')', ''));
                var name = (count == 1 && parts[0].endsWith('s')) ? parts[0].replace(/s$/, '') : parts[0];
                for (var x = 0; x < count; x++) {
                    tmpItems.push(name);
                }
            } else {
                tmpItems.push(item);
            }
        });
        return tmpItems;
    },

    modifyRoll = function (roll, mod) {
        // Returns a modified die roll based on the "more" and "less" commands
        var newRoll = roll;
        if (mod.search('more-') >= 0) newRoll = (roll >= 75) ? 100 : roll + 25;
        if (mod.search('less-') >= 0) newRoll = (roll <= 25) ? 1 : roll - 25;
        return newRoll;
    },

    rollDice = function (expr) {
        expr = expr.replace(/\s+/g, '');
        var exp = expr.split(/[^\d]+/);
        var result = 0, dice = parseInt(exp[0]), die = parseInt(exp[1]);
        var bonus = (typeof exp[2] != 'undefined') ? parseInt(exp[2]) : 0;
        var re = new RegExp('^.+\-' + bonus + '$', 'i');
        if (expr.match(re) !== null) bonus = bonus * -1;
        for (var x = 0; x < dice; x++) {
            result += randomInteger(die);
        }
        result = result + bonus;
        return (result < 1 ? 1 : result);
    },

	showDialog = function (title, content, whisperTo = '') {
        var gm = /\(GM\)/i;
        title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
        var body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
        if (whisperTo.length > 0) {
            whisperTo = '/w ' + (gm.test(whisperTo) ? 'GM' : '"' + whisperTo + '"') + ' ';
            sendChat('LootGenerator', whisperTo + body);
        } else  {
            sendChat('LootGenerator', body);
        }
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

    processHandout = function (notes = '') {
        var retval = [], text = notes.trim();
        text = text.replace(/<p[^>]*>/gi, '<p>').replace(/\n(<p>)?/gi, '</p><p>').replace(/<br>/gi, '</p><p>');
        text = text.replace(/<\/?(span|div|pre|img|code|br|b|i|h1|h2|h3|h4|h5|ol|ul|pre)[^>]*>/gi, '');
        if (text != '' && /<p>.*?<\/p>/g.test(text)) retval = text.match(/<p>.*?<\/p>/g).map( l => l.replace(/^<p>(.*?)<\/p>$/,'$1'));
        return _.compact(retval);
    },

    detectSheet = function () {
        var sheet = 'Unknown', char = findObjs({type: 'character'})[0];
        if (char) {
            var charAttrs = findObjs({type: 'attribute', characterid: char.get('id')}, {caseInsensitive: true});
            if (_.find(charAttrs, function (x) { return x.get('name') == 'character_sheet' && x.get('current').search('Shaped') != -1; })) sheet = '5e Shaped';
            if (_.find(charAttrs, function (x) { return x.get('name').search('mancer') != -1; })) sheet = '5th Edition OGL';
        }
        return sheet;
    },

    usePurseStrings = function () {
        var use = false;
        if (typeof PurseStrings !== 'undefined' && typeof PurseStrings.changePurse !== 'undefined' && typeof PurseStrings.distributeCoins !== 'undefined') use = true;
        return use;
    },

    useItemDB = function () {
        return (typeof ItemDB !== 'undefined');
    },

    generateUniqueID = function () {
        "use strict";
        return generateUUID().replace(/_/g, "Z");
    },

    generateUUID = (function () {
        "use strict";
        var a = 0, b = [];
        return function() {
            var c = (new Date()).getTime() + 0, d = c === a;
            a = c;
            for (var e = new Array(8), f = 7; 0 <= f; f--) {
                e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
                c = Math.floor(c / 64);
            }
            c = e.join("");
            if (d) {
                for (f = 11; 0 <= f && 63 === b[f]; f--) {
                    b[f] = 0;
                }
                b[f]++;
            } else {
                for (f = 0; 12 > f; f++) {
                    b[f] = Math.floor(64 * Math.random());
                }
            }
            for (f = 0; 12 > f; f++){
                c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
            }
            return c;
        };
    }()),

    //---- DEFAULT LOOT VALUES ----//

    GEMS={level1:['Azurite','Banded Agate','Blue Quartz','Eye Agate','Hematite','Lapis Lazuli','Malachite','Moss Agate','Obsidian','Rhodochrosite','Tiger Eye','Turquoise'],level2:['Bloodstone','Carnelian','Chalcedony','Chrysoprase','Citrine','Jasper','Moonstone','Onyx','Quartz','Sardonyx','Star Rose Quartz','Zircon'],level3:['Alexandrite','Aquamarine','Black Pearl','Blue Spinel','Peridot','Topaz'],level4:['Black Opal','Blue Sapphire','Emerald','Fire Opal','Opal','Star Ruby','Star Sapphire','Yellow Sapphire'],level5:['Black Sapphire','Diamond','Jacinth','Ruby']},
    ART={level1:['Silver Ewer','Carved Bone Statuette','Small Gold Bracelet','Cloth-of-Gold Vestments','Black Velvet Mask stitched with Silver Thread','Copper Chalice with Silver Filigree','Pair of Engraved Bone Dice','Small Mirror set in a Painted Wooden Frame','Embroidered Silk Handkerchief','Gold Locket with a Painted Portrait Inside'],level2:['Gold Ring set with Bloodstones','Carved Ivory Statuette','Large Gold Bracelet','Silver Necklace with a Gemstone Pendant','Bronze Crown','Silk Robe with Gold Embroidery','Large Well-Made Tapestry','Brass Mug with Jade Inlay','Box of Turquoise Animal Figurines','Gold Bird Cage with Electrum Filigree'],level3:['Silver Chalice set with Moonstones','Silver-Plated Steel Longsword with Jet set in Hilt','Carved Harp of Exotic Wood with Ivory Inlay and Zircon Gems','Small Gold Idol','Gold Dragon Comb set with Red Garnets as Eyes','Bottle Stopper Cork embossed with Gold Leaf and set with Amethysts','Ceremonial Electrum Dagger with a Black Pearl in the Pommel','Silver and Gold Brooch','Obsidian Statuette with Gold Fittings and Inlay','Painted Gold War Mask'],level4:['Fine Gold Chain set with a Fire Opal','Old Masterpiece Painting','Embroidered Silk and Velvet Mantle set with Numerous Moonstones','Platinum Bracelet set with a Sapphire','Embroidered Glove set with Jewel Chips','Jeweled Anklet','Gold Music Box','Gold Circlet set with Four Aquamarines','Eye Patch with a Mock Eye set in Blue Sapphire and Moonstone','A Necklace String of Small Pink Pearls'],level5:['Jeweled Gold Crown','Jeweled Platinum Ring','Small Gold Statuette set with Rubies','Gold Cup set with Emeralds','Gold Jewelry Box with Platinum Filigree','Painted Gold Child\'s Sarcophagus','Jade Game Board with Solid Gold Playing Pieces','Bejeweled Ivory Drinking Horn with Gold Filigree']},
    MUNDANE={gear:[{weight:45,name:"%%weapons%%"},{weight:35,name:"%%armor%%"},{weight:30,name:"Potion of Healing"},{weight:25,name:"%%ammo%% (@1d8@)"},{weight:25,name:"Hempen Rope"},{weight:20,name:"Alchemist's Fire"},{weight:20,name:"Silk Rope"},{weight:15,name:"Acid"},{weight:15,name:"Caltrops"},{weight:15,name:"Healer's Kit"},{weight:15,name:"Tinderbox"},{weight:10,name:"Ball Bearings"},{weight:10,name:"Climber's Kit"},{weight:10,name:"Holy Water"},{weight:10,name:"Hooded Lantern"},{weight:10,name:"Torch"},{weight:10,name:"Vial"},{weight:5,name:"Antitoxin"},{weight:5,name:"Bullseye Lantern"},{weight:5,name:"Piton"},{weight:5,name:"Quiver"},{weight:5,name:"Rations"},{weight:5,name:"Waterskin"},{weight:5,name:"Signal Whistle"},{weight:1,name:"Abacus"},{weight:1,name:"Backpack"},{weight:1,name:"Bedroll"},{weight:1,name:"Bell"},{weight:1,name:"Blanket"},{weight:1,name:"Block and Tackle"},{weight:1,name:"Glass Bottle"},{weight:1,name:"Candle"},{weight:1,name:"Chain"},{weight:1,name:"Chalk"},{weight:1,name:"Component Pouch"},{weight:1,name:"Crowbar"},{weight:1,name:"Grappling Hook"},{weight:1,name:"Hammer"},{weight:1,name:"Hourglass"},{weight:1,name:"Hunting Trap"},{weight:1,name:"Ink"},{weight:1,name:"Ink Pen"},{weight:1,name:"Jug"},{weight:1,name:"Lamp"},{weight:1,name:"Lock"},{weight:1,name:"Magnifying Glass"},{weight:1,name:"Manacles"},{weight:1,name:"Mess Kit"},{weight:1,name:"Steel Mirror"},{weight:1,name:"Oil"},{weight:1,name:"Paper"},{weight:1,name:"Parchment"},{weight:1,name:"Perfume"},{weight:1,name:"Poison"},{weight:1,name:"Iron Pot"},{weight:1,name:"Pouch"},{weight:1,name:"Sealing Wax"},{weight:1,name:"Signet Ring"},{weight:1,name:"Soap"},{weight:1,name:"Iron Spikes (@1d3+7@)"},{weight:1,name:"Spyglass"},{weight:1,name:"Two-person Tent"},{weight:1,name:"Whetsone"},{weight:1,name:"%%instruments%%"},{weight:1,name:"%%gaming_sets%%"},{weight:1,name:"%%tools%%"},],instruments:[{weight:15,name:"Drum"},{weight:15,name:"Horn"},{weight:15,name:"Flute"},{weight:10,name:"Pan Flute"},{weight:7,name:"Lute"},{weight:7,name:"Lyre"},{weight:5,name:"Viol"},{weight:1,name:"Bagpipes"},{weight:1,name:"Dulcimer"},{weight:1,name:"Shawm"},],gamingSets:[{weight:2,name:"Dice Set"},{weight:1,name:"Playing Card Set"},{weight:1,name:"Dragonchess Set"},{weight:1,name:"Three-Dragon Ante Set"},],tools:[{weight:20,name:"Herbalism Kit"},{weight:20,name:"Thieves' Tools"},{weight:20,name:"Alchemist's Supplies"},{weight:15,name:"Woodcarver's Tools"},{weight:15,name:"Carpenter's Tools"},{weight:15,name:"Cook's Utensils"},{weight:15,name:"Leatherworker's Tools"},{weight:10,name:"Painter's Supplies"},{weight:10,name:"Tinker's Tools"},{weight:5,name:"Jeweler's Tools"},{weight:3,name:"Navigator's Tools"},{weight:3,name:"Smith's Tools"},{weight:1,name:"Brewer's Supplies"},{weight:1,name:"Calligrapher's Supplies"},{weight:1,name:"Cartographer's Tools"},{weight:1,name:"Cobbler's Tools"},{weight:1,name:"Glassblower's Tools"},{weight:1,name:"Mason's Tools"},{weight:1,name:"Potter's Tools"},{weight:1,name:"Weaver's Tools"},],ammo:[{weight:25,name:"Arrow"},{weight:10,name:"Crossbow Bolt"},{weight:5,name:"Sling Bullet"},{weight:1,name:"Blowgun Needle"},],lightArmor:[{weight:5,name:"Padded Armor"},{weight:3,name:"Leather Armor"},{weight:1,name:"Studded Leather Armor"},],mediumArmor:[{weight:40,name:"Hide Armor"},{weight:30,name:"Chain Shirt"},{weight:20,name:"Scale Mail"},{weight:7,name:"Breastplate"},{weight:1,name:"Half Plate Armor"},],heavyArmor:[{weight:25,name:"Ring Mail"},{weight:15,name:"Chain Mail"},{weight:5,name:"Splint Armor"},{weight:1,name:"Plate Armor"},],metalArmor:[{weight:30,name:"Chain Shirt"},{weight:25,name:"Breastplate"},{weight:15,name:"Chain Mail"},{weight:2,name:"Half Plate Armor"},{weight:1,name:"Plate Armor"},],leatherArmor:[{weight:40,name:"Hide Armor"},{weight:25,name:"Padded Armor"},{weight:10,name:"Leather Armor"},{weight:1,name:"Studded Leather Armor"},],simpleWeapons:[{weight:30,name:"Dagger"},{weight:25,name:"Club"},{weight:20,name:"Shortbow"},{weight:10,name:"Javelin"},{weight:10,name:"Quarterstaff"},{weight:10,name:"Spear"},{weight:7,name:"Sling"},{weight:7,name:"Mace"},{weight:3,name:"Greatclub"},{weight:3,name:"Handaxe"},{weight:3,name:"Light Crossbow"},{weight:1,name:"Light Hammer"},{weight:1,name:"Sickle"},{weight:1,name:"Dart"},],martialWeapons:[{weight:25,name:"Shortsword"},{weight:20,name:"Battleaxe"},{weight:10,name:"Longbow"},{weight:7,name:"Heavy Crossbow"},{weight:5,name:"Scimitar"},{weight:5,name:"Longsword"},{weight:3,name:"Lance"},{weight:3,name:"Halberd"},{weight:3,name:"Glaive"},{weight:3,name:"Morningstar"},{weight:1,name:"Hooked Shortspear"},{weight:1,name:"Maul"},{weight:1,name:"Pike"},{weight:1,name:"Rapier"},{weight:1,name:"Trident"},{weight:1,name:"Greataxe"},{weight:1,name:"Greatsword"},{weight:1,name:"War Pick"},{weight:1,name:"Warhammer"},{weight:1,name:"Flail"},{weight:1,name:"Whip"},{weight:1,name:"Blowgun"},{weight:1,name:"Hand Crossbow"},{weight:1,name:"Net"},],swords:[{weight:25,name:"Shortsword"},{weight:15,name:"Scimitar"},{weight:10,name:"Longsword"},{weight:5,name:"Rapier"},{weight:1,name:"Greatsword"},{weight:1,name:"Double-Bladed Scimitar"},],bludgeoningWeapons:[{weight:30,name:'Club'},{weight:25,name:'Quarterstaff'},{weight:15,name:'Mace'},{weight:10,name:'Greatclub'},{weight:10,name:'Sling'},{weight:5,name:'Flail'},{weight:5,name:'Light Hammer'},{weight:2,name:'Maul'},{weight:1,name:'Warhammer'},],slashingWeapons:[{weight:50,name:'Longsword'},{weight:45,name:'Battleaxe'},{weight:15,name:'Greataxe'},{weight:10,name:'Greatsword'},{weight:7,name:'Glaive'},{weight:7,name:'Scimitar'},{weight:5,name:'Handaxe'},{weight:5,name:'Sickle'},{weight:1,name:'Halberd'},{weight:1,name:'Whip'},],piercingWeapons:[{weight:50,name:'Dagger'},{weight:50,name:'Shortsword'},{weight:45,name:'Shortbow'},{weight:25,name:'Spear'},{weight:25,name:'Morningstar'},{weight:20,name:'Javelin'},{weight:20,name:'Longbow'},{weight:15,name:'Hand Crossbow'},{weight:10,name:'Light Crossbow'},{weight:7,name:'Rapier'},{weight:7,name:'Dart'},{weight:5,name:'Heavy Crossbow'},{weight:2,name:'Lance'},{weight:1,name:'Blowgun'},{weight:1,name:'Trident'},{weight:1,name:'Pike'},{weight:1,name:'War Pick'},],twoHandedWeapons:[{weight:50,name:'Greataxe'},{weight:50,name:'Shortbow'},{weight:45,name:'Greatsword'},{weight:45,name:'Longbow'},{weight:30,name:'Light Crossbow'},{weight:15,name:'Heavy Crossbow'},{weight:10,name:'Greatclub'},{weight:10,name:'Pike'},{weight:5,name:'Halberd'},{weight:5,name:'Maul'},{weight:1,name:'Glaive'},],thrownWeapons:[{weight:50,name:'Dagger'},{weight:45,name:'Spear'},{weight:30,name:'Javelin'},{weight:10,name:'Dart'},{weight:5,name:'Handaxe'},{weight:1,name:'Light Hammer'},{weight:1,name:'Net'},{weight:1,name:'Trident'},],finesseWeapons:[{weight:50,name:'Dagger'},{weight:45,name:'Shortsword'},{weight:30,name:'Scimitar'},{weight:15,name:'Rapier'},{weight:10,name:'Dart'},{weight:1,name:'Whip'},],versatileWeapons:[{weight:50,name:'Longsword'},{weight:40,name:'Quarterstaff'},{weight:25,name:'Battleaxe'},{weight:10,name:'Spear'},{weight:5,name:'Warhammer'},{weight:1,name:'Trident'},],lightWeapons:[{weight:50,name:'Dagger'},{weight:40,name:'Shortsword'},{weight:30,name:'Club'},{weight:15,name:'Scimitar'},{weight:10,name:'Hand Crossbow'},{weight:10,name:'Handaxe'},{weight:5,name:'Sickle'},{weight:1,name:'Light Hammer'},],heavyWeapons:[{weight:50,name:'Greatsword'},{weight:45,name:'Longbow'},{weight:25,name:'Greataxe'},{weight:10,name:'Halberd'},{weight:10,name:'Heavy Crossbow'},{weight:5,name:'Maul'},{weight:1,name:'Glaive'},{weight:1,name:'Pike'},],},
    MAGIC={tableA:[{weight:50,name:"Potion of Healing"},{weight:10,name:"%%scroll0%%"},{weight:10,name:"Potion of Climbing"},{weight:20,name:"%%scroll1%%"},{weight:4,name:"%%scroll2%%"},{weight:4,name:"Potion of Greater Healing"},{weight:1,name:"Bag of Holding"},{weight:1,name:"Driftglobe"},],tableB:[{weight:15,name:"Potion of Greater Healing"},{weight:7,name:"Potion of Fire Breath"},{weight:7,name:"Potion of %%damage_types%% Resistance"},{weight:5,name:"+1 %%ammo%% (@1d6@)"},{weight:5,name:"Potion of Animal Friendship"},{weight:5,name:"Potion of Hill Giant Strength"},{weight:5,name:"Potion of Growth"},{weight:5,name:"Potion of Water Breathing"},{weight:5,name:"%%scroll2%%"},{weight:5,name:"%%scroll2%%"},{weight:3,name:"Bag of Holding"},{weight:3,name:"Keoghtom's Ointment"},{weight:3,name:"Oil of Slipperiness"},{weight:2,name:"Dust of Disappearance"},{weight:2,name:"Dust of Dryness"},{weight:2,name:"Elemental Gem"},{weight:2,name:"Philter of Love"},{weight:1,name:"Alchemy Jug"},{weight:1,name:"Cap of Water Breathing"},{weight:1,name:"Cloak of the Manta Ray"},{weight:1,name:"Driftglobe"},{weight:1,name:"Goggles of Night"},{weight:1,name:"Helm of Comprehending Languages"},{weight:1,name:"Immovable Rod"},{weight:1,name:"Lantern of Revealing"},{weight:1,name:"Mariner's %%armor%%"},{weight:1,name:"Mithral %%metal_armor%%"},{weight:1,name:"Ring of Swimming"},{weight:1,name:"Robe of Useful Items"},{weight:1,name:"Rope of Climbing"},{weight:1,name:"Saddle of the Cavalier"},{weight:1,name:"Wand of Magic Detection"},{weight:1,name:"Wand of Secrets"},],tableC:[{weight:15,name:"Potion of Superior Healing"},{weight:7,name:"%%scroll4%%"},{weight:5,name:"+2 %%ammo%% (@1d6@)"},{weight:5,name:"Potion of Clairvoyance"},{weight:5,name:"Potion of Diminution"},{weight:5,name:"Potion of Gaseous Form"},{weight:5,name:"Potion of Frost Giant Strength"},{weight:5,name:"Potion of Stone Giant Strength"},{weight:5,name:"Potion of Heroism"},{weight:5,name:"Potion of Invulnerability"},{weight:5,name:"Potion of Mind Reading"},{weight:5,name:"%%scroll5%%"},{weight:3,name:"Elixir of Health"},{weight:3,name:"Oil of Etherealness"},{weight:3,name:"Potion of Fire Giant Strength"},{weight:3,name:"Quaal's Feather Token"},{weight:3,name:"Scroll of Protection from %%monster_protec%%"},{weight:2,name:"Bag of Beans"},{weight:2,name:"Bead of Force"},{weight:1,name:"Chime of Opening"},{weight:1,name:"Decanter of Endless Water"},{weight:1,name:"Eyes of Minute Seeing"},{weight:1,name:"Folding Boat"},{weight:1,name:"Heward's Handy Haversack"},{weight:1,name:"Horseshoes of Speed"},{weight:1,name:"Necklace of Fireballs with @1d6+3@ beads"},{weight:1,name:"Periapt of Health"},{weight:1,name:"Sending Stones"},],tableD:[{weight:20,name:"Potion of Supreme Healing"},{weight:10,name:"Potion of Invisibility"},{weight:10,name:"Potion of Speed"},{weight:10,name:"%%scroll6%%"},{weight:7,name:"%%scroll7%%"},{weight:5,name:"+3 %%ammo%% (@1d6@)"},{weight:5,name:"Oil of Sharpness"},{weight:5,name:"Potion of Flying"},{weight:5,name:"Potion of Cloud Giant Strength"},{weight:5,name:"Potion of Longevity"},{weight:5,name:"Potion of Vitality"},{weight:5,name:"%%scroll8%%"},{weight:3,name:"Horseshoes of a Zephyr"},{weight:3,name:"Nolzur's Marvelous Pigments"},{weight:1,name:"Portable Hole"},],tableE:[{weight:30,name:"%%scroll8%%"},{weight:25,name:"Potion of Storm Giant Strength",unique:true},{weight:15,name:"Potion of Supreme Healing"},{weight:15,name:"%%scroll9%%"},{weight:8,name:"Universal Solvent",unique:true},{weight:5,name:"Arrow of %%monster_types%% Slaying"},{weight:2,name:"Sovereign Glue",unique:true},],tableF:[{weight:15,name:"+1 %%weapons%%"},{weight:3,name:"+1 Shield"},{weight:3,name:"Sentinel Shield"},{weight:2,name:"Amulet of Proof Against Detection and Location"},{weight:2,name:"Boots of Elvenkind"},{weight:2,name:"Boots of Striding and Springing"},{weight:3,name:"Bracers of Archery"},{weight:2,name:"Brooch of Shielding"},{weight:2,name:"Broom of Flying"},{weight:2,name:"Cloak of Elvenkind"},{weight:2,name:"Cloak of Protection"},{weight:2,name:"Gauntlets of Ogre Power"},{weight:2,name:"Hat of Disguise"},{weight:2,name:"Javelin of Lightning"},{weight:2,name:"Pearl of Power"},{weight:2,name:"+1 Rod of the Pact Keeper"},{weight:2,name:"Slippers of Spider Climbing"},{weight:2,name:"Staff of the Adder"},{weight:2,name:"Staff of the Python"},{weight:2,name:"Trident of Fish Command"},{weight:2,name:"Wand of Magic Missiles"},{weight:2,name:"+1 Wand of the War Mage"},{weight:2,name:"Wand of Web"},{weight:2,name:"%%weapons%% of Warning"},{weight:1,name:"Adamantine Chain Mail"},{weight:1,name:"Adamantine Chain Shirt"},{weight:1,name:"Adamantine Scale Mail"},{weight:1,name:"Bag of Tricks - Gray"},{weight:1,name:"Bag of Tricks - Rust"},{weight:1,name:"Bag of Tricks - Tan"},{weight:1,name:"Boots of the Winterlands"},{weight:1,name:"Circlet of Blasting"},{weight:1,name:"Deck of Illusions"},{weight:1,name:"Eversmoking Bottle"},{weight:1,name:"Eyes of Charming"},{weight:1,name:"Eyes of the Eagle"},{weight:1,name:"Figurine of Wondrous Power - Silver Raven"},{weight:1,name:"Gem of Brightness"},{weight:1,name:"Gloves of Missile Snaring"},{weight:1,name:"Gloves of Swimming and Climbing"},{weight:1,name:"Gloves of Thievery"},{weight:1,name:"Headband of Intellect"},{weight:1,name:"Helm of Telepathy"},{weight:1,name:"Instrument of the Bards - Doss Lute"},{weight:1,name:"Instrument of the Bards - Fochlucan Bandore"},{weight:1,name:"Instrument of the Bards - Mac-Fuimidh Cittern"},{weight:1,name:"Medallion of Thoughts"},{weight:1,name:"Necklace of Adaptation"},{weight:1,name:"Periapt of Wound Closure"},{weight:1,name:"Pipes of Haunting"},{weight:1,name:"Pipes of the Sewers"},{weight:1,name:"Ring of Jumping"},{weight:1,name:"Ring of Mind Shielding"},{weight:1,name:"Ring of Warmth"},{weight:1,name:"Ring of Water Walking"},{weight:1,name:"Quiver of Ehlonna"},{weight:1,name:"Stone of Good Luck"},{weight:1,name:"Wind Fan"},{weight:1,name:"Winged Boots"},],tableG:[{weight:11,name:"+2 %%weapons%%"},{weight:3,name:"Figurine of Wondrous Power - %%figurines%%"},{weight:1,name:"Adamantine Breastplate"},{weight:1,name:"Adamantine Splint Armor"},{weight:1,name:"Amulet of Health"},{weight:1,name:"Arrow-Catching Shield"},{weight:1,name:"Belt of Dwarvenkind"},{weight:1,name:"Belt of Hill Giant Strength"},{weight:1,name:"Boots of Levitation"},{weight:1,name:"Boots of Speed"},{weight:1,name:"Bowl of Commanding Water Elementals"},{weight:1,name:"Bracers of Defense"},{weight:1,name:"Brazier of Commanding Fire Elementals"},{weight:1,name:"Cape of the Mountebank"},{weight:1,name:"Censer of Controlling Air Elementals"},{weight:1,name:"+1 Chain Mail"},{weight:1,name:"Chain Mail of %%damage_types%% Resistance"},{weight:1,name:"Chain Shirt of %%damage_types%% Resistance"},{weight:1,name:"+ 1 Chain Shirt"},{weight:1,name:"Cloak of Displacement"},{weight:1,name:"Cloak of the Bat"},{weight:1,name:"Cube of Force"},{weight:1,name:"Daern's Instant Fortress"},{weight:1,name:"Dagger of Venom"},{weight:1,name:"Dimensional Shackles"},{weight:1,name:"Dragon Slayer %%swords%%"},{weight:1,name:"Elven Chain"},{weight:1,name:"Flame Tongue %%swords%%"},{weight:1,name:"Gem of Seeing"},{weight:1,name:"Giant Slayer %%swords%%"},{weight:1,name:"Glamoured Studded Leather"},{weight:1,name:"Helm of Teleportation"},{weight:1,name:"Horn of Blasting"},{weight:1,name:"Horn of Valhalla - Silver"},{weight:1,name:"Horn of Valhalla - Brass"},{weight:1,name:"Instrument of the Bards - Canaith Mandolin"},{weight:1,name:"Instrument ofthe Bards - Cii Lyre"},{weight:1,name:"Ioun Stone - Awareness"},{weight:1,name:"Ioun Stone - Protection"},{weight:1,name:"Ioun Stone - Reserve"},{weight:1,name:"Ioun Stone - Sustenance"},{weight:1,name:"Iron Bands of Bilarro"},{weight:1,name:"+1 Leather Armor"},{weight:1,name:"Leather Armor of %%damage_types%% Resistance"},{weight:1,name:"Mace of Disruption"},{weight:1,name:"Mace of Smiting"},{weight:1,name:"Mace of Terror"},{weight:1,name:"Mantle of Spell Resistance"},{weight:1,name:"Necklace of Prayer Beads %%beads%%"},{weight:1,name:"Periapt of Proof Against Poison"},{weight:1,name:"Ring of Animal Influence"},{weight:1,name:"Ring of Evasion"},{weight:1,name:"Ring of Feather Falling"},{weight:1,name:"Ring of Free Action"},{weight:1,name:"Ring of Protection"},{weight:1,name:"Ring of Resistance"},{weight:1,name:"Ring of Spell Storing"},{weight:1,name:"Ring of the Ram"},{weight:1,name:"Ring of X-Ray Vision"},{weight:1,name:"Robe of Eyes"},{weight:1,name:"Rod of Rulership"},{weight:1,name:"+2 Rod of the Pact Keeper"},{weight:1,name:"Rope of Entanglement"},{weight:1,name:"+1 Scale Mail"},{weight:1,name:"Scale Mail of %%damage_types%% Resistance"},{weight:1,name:"+2 Shield"},{weight:1,name:"Staff of Charming"},{weight:1,name:"Staff of Healing"},{weight:1,name:"Staff of Swarming Insects"},{weight:1,name:"Staff of the Woodlands"},{weight:1,name:"Staff of Withering"},{weight:1,name:"Stone of Controlling Earth Elementals"},{weight:1,name:"Sun Blade"},{weight:1,name:"%%swords%% of Life Stealing"},{weight:1,name:"%%swords%% of Wounding"},{weight:1,name:"Tentacle Rod"},{weight:1,name:"Vicious %%weapons%%"},{weight:1,name:"Wand of Binding"},{weight:1,name:"Wand of Enemy Detection"},{weight:1,name:"Wand of Fear"},{weight:1,name:"Wand of Fireballs"},{weight:1,name:"Wand of Lightning Bolts"},{weight:1,name:"Wand of Paralysis"},{weight:1,name:"+2 Wand of the War Mage"},{weight:1,name:"Wand of Wonder"},{weight:1,name:"Wings of Flying"},],tableH:[{weight:10,name:"+3 %%weapons%%"},{weight:3,name:"Amulet of the Planes",unique:true},{weight:2,name:"Carpet of Flying"},{weight:2,name:"Crystal Ball"},{weight:2,name:"Ring of Regeneration"},{weight:2,name:"Ring of Shooting Stars"},{weight:2,name:"Ring of Telekinesis",unique:true},{weight:2,name:"Robe of Scintillating Colors"},{weight:2,name:"Robe of Stars"},{weight:2,name:"Rod of Absorption"},{weight:2,name:"Rod of Alertness"},{weight:2,name:"Rod of Security"},{weight:2,name:"+3 Rod of the Pact Keeper"},{weight:2,name:"Scimitar of Speed"},{weight:2,name:"+3 Shield"},{weight:2,name:"Staff of Fire"},{weight:2,name:"Staff of Frost"},{weight:2,name:"Staff of Power"},{weight:2,name:"Staff of Striking"},{weight:2,name:"Staff of Thunder and Lightning"},{weight:2,name:"%%swords%% of Sharpness"},{weight:2,name:"Wand of Polymorph"},{weight:2,name:"+3 Wand of the War Mage"},{weight:1,name:"Adamantine Half Plate"},{weight:1,name:"Adamantine Plate"},{weight:1,name:"Animated Shield"},{weight:1,name:"Belt of Fire Giant Strength"},{weight:1,name:"Belt of Stone Giant Strength"},{weight:1,name:"+1 Breastplate"},{weight:1,name:"Breastplate of %%damage_types%% Resistance"},{weight:1,name:"Candle of Invocation"},{weight:1,name:"+2 Chain Mail"},{weight:1,name:"+2 Chain Shirt"},{weight:1,name:"Cloak of Arachnida"},{weight:1,name:"Dancing %%swords%%"},{weight:1,name:"Demon Armor"},{weight:1,name:"%%dragon_types%% Dragon Scale Mail"},{weight:1,name:"Dwarven Plate"},{weight:1,name:"Dwarven Thrower"},{weight:1,name:"Efreeti Bottle",unique:true},{weight:1,name:"Figurine of Wondrous Power - Obsidian Steed"},{weight:1,name:"Frost Brand %%swords%%"},{weight:1,name:"Helm of Brilliance"},{weight:1,name:"Horn of Valhalla - Bronze"},{weight:1,name:"Instrument of the Bards - Anstruth Harp"},{weight:1,name:"Ioun Stone - Absorption"},{weight:1,name:"Ioun Stone - Agility"},{weight:1,name:"Ioun Stone - Fortitude"},{weight:1,name:"Ioun Stone - Insight"},{weight:1,name:"Ioun Stone - Intellect"},{weight:1,name:"Ioun Stone - Leadership"},{weight:1,name:"Ioun Stone - Strength"},{weight:1,name:"+2 Leather Armor"},{weight:1,name:"Manual of Bodily Health"},{weight:1,name:"Manual of Gainful Exercise"},{weight:1,name:"Manual of Golems"},{weight:1,name:"Manual of Quickness of Action"},{weight:1,name:"Mirror of Life Trapping",unique:true},{weight:1,name:"Nine Lives Stealer",unique:true},{weight:1,name:"Oathbow"},{weight:1,name:"+2 Scale Mail"},{weight:1,name:"Spellguard Shield",unique:true},{weight:1,name:"+1 Splint"},{weight:1,name:"Splint Armor of %%damage_types%% Resistance"},{weight:1,name:"+1 Studded Leather"},{weight:1,name:"Studded Leather of %%damage_types%% Resistance"},{weight:1,name:"Tome of Clear Thought"},{weight:1,name:"Tome of Leadership and Influence"},{weight:1,name:"Tome of Understanding"},],tableI:[{weight:5,name:"Defender %%swords%%",unique:true},{weight:5,name:"Hammer of Thunderbolts",unique:true},{weight:5,name:"Sword of Answering - %%answers%%"},{weight:3,name:"Holy Avenger %%swords%%",unique:true},{weight:3,name:"Ring of Djinni Summoning",unique:true},{weight:3,name:"Ring of Invisibility",unique:true},{weight:3,name:"Ring of Spell Turning",unique:true},{weight:3,name:"Rod of Lordly Might",unique:true},{weight:3,name:"Vorpal %%swords%%",unique:true},{weight:2,name:"Belt of Cloud Giant Strength",unique:true},{weight:2,name:"+2 Breastplate"},{weight:2,name:"+3 Chain Mail"},{weight:2,name:"+3 Chain Shirt"},{weight:2,name:"Cloak of Invisibility",unique:true},{weight:2,name:"Crystal Ball %%crystal_balls%%"},{weight:2,name:"+ 1 Half Plate"},{weight:2,name:"Iron Flask",unique:true},{weight:2,name:"+3 Leather Armor"},{weight:2,name:"+1 Plate"},{weight:2,name:"Robe of the Archmagi",unique:true},{weight:2,name:"Rod of Resurrection",unique:true},{weight:2,name:"+1 Scale Mail"},{weight:2,name:"Scarab of Protection",unique:true},{weight:2,name:"+2 Splint"},{weight:2,name:"+2 Studded Leather"},{weight:2,name:"Well of Many Worlds",unique:true},{weight:1,name:"%%magic_armor%%"},{weight:1,name:"Belt of Storm Giant Strength",unique:true},{weight:1,name:"Cubic Gate",unique:true},{weight:1,name:"Deck of Many Things",unique:true},{weight:1,name:"Efreeti Chain",unique:true},{weight:1,name:"Half Plate of %%damage_types%% Resistance"},{weight:1,name:"Horn of Valhalla - Iron",unique:true},{weight:1,name:"Instrument of the Bards - Ollamh Harp",unique:true},{weight:1,name:"Ioun Stone - Greater Absorption",unique:true},{weight:1,name:"Ioun Stone - Mastery",unique:true},{weight:1,name:"Ioun Stone - Regeneration",unique:true},{weight:1,name:"Plate of Etherealness",unique:true},{weight:1,name:"Plate of %%damage_types%% Resistance"},{weight:1,name:"Ring of Air Elemental Command",unique:true},{weight:1,name:"Ring of Earth Elemental Command",unique:true},{weight:1,name:"Ring of Fire Elemental Command",unique:true},{weight:1,name:"Ring of Three Wishes",unique:true},{weight:1,name:"Ring of Water Elemental Command",unique:true},{weight:1,name:"Sphere of Annihilation",unique:true},{weight:1,name:"Talisman of Pure Good",unique:true},{weight:1,name:"Talisman of the Sphere",unique:true},{weight:1,name:"Talisman of Ultimate Evil",unique:true},{weight:1,name:"Tome of the Stilled Tongue",unique:true},],magicArmor:[{weight:2,name:"+2 Half Plate Armor"},{weight:2,name:"+2 Plate Armor"},{weight:2,name:"+3 Studded Leather Armor"},{weight:2,name:"+3 Breastplate"},{weight:2,name:"+3 Splint Armor"},{weight:1,name:"+3 Half Plate Armor"},{weight:1,name:"+3 Plate Armor"},],figurines:[{weight:1,name:"Bronze Griffon"},{weight:1,name:"Ebony Fly"},{weight:1,name:"Golden Lions"},{weight:1,name:"Ivory Goats"},{weight:1,name:"Marble Elephant"},{weight:2,name:"Onyx Dog"},{weight:1,name:"Serpentine Owl"},],crystalBalls:[{weight:1,name:"of Mind Reading",unique:true},{weight:2,name:"of Telepathy",unique:true},{weight:1,name:"of True Seeing",unique:true},],answers:[{weight:1,name:"Answerer",unique:true},{weight:1,name:"Back Talker",unique:true},{weight:1,name:"Concluder",unique:true},{weight:1,name:"Last Quip",unique:true},{weight:1,name:"Rebutter",unique:true},{weight:1,name:"Replier",unique:true},{weight:1,name:"Retorter",unique:true},{weight:1,name:"Scather",unique:true},{weight:1,name:"Squelcher",unique:true},],monsterTypes:[{weight:20,name:"Humanoid"},{weight:15,name:"Beast"},{weight:10,name:"Giant"},{weight:10,name:"Dragon"},{weight:5,name:"Fey"},{weight:5,name:"Undead"},{weight:3,name:"Fiend"},{weight:3,name:"Monstrosity"},{weight:2,name:"Construct"},{weight:1,name:"Aberration"},{weight:1,name:"Celestial"},{weight:1,name:"Elemental"},{weight:1,name:"Ooze"},{weight:1,name:"Plant"},],monsterProtec:[{weight:20,name:"Humanoids"},{weight:15,name:"Beasts"},{weight:10,name:"Giants"},{weight:10,name:"Dragons"},{weight:5,name:"Fey"},{weight:5,name:"Undead"},{weight:3,name:"Fiends"},{weight:3,name:"Monstrosities"},{weight:2,name:"Constructs"},{weight:1,name:"Aberrations"},{weight:1,name:"Celestials"},{weight:1,name:"Elementals"},{weight:1,name:"Oozes"},{weight:1,name:"Plants"},],dragonTypes:[{weight:1,name:"Black"},{weight:1,name:"Blue"},{weight:1,name:"Brass"},{weight:1,name:"Bronze"},{weight:1,name:"Copper"},{weight:1,name:"Gold"},{weight:1,name:"Green"},{weight:1,name:"Red"},{weight:1,name:"Silver"},{weight:1,name:"White"},],damageTypes:[{weight:10,name:"Cold"},{weight:10,name:"Fire"},{weight:6,name:"Acid"},{weight:5,name:"Poison"},{weight:3,name:"Lightning"},{weight:2,name:"Necrotic"},{weight:1,name:"Force"},{weight:1,name:"Radiant"},{weight:1,name:"Thunder"},],beads:[{weight:6,name:"Blessing"},{weight:6,name:"Curing"},{weight:4,name:"Favor"},{weight:2,name:"Smiting"},{weight:1,name:"Summons"},{weight:1,name:"Wind walking"}]},
    SPELLS={cantrips:['Acid Splash','Blade Ward','Chill Touch','Dancing Lights','Druidcraft','Eldritch Blast','Fire Bolt','Friends','Guidance','Light','Mage Hand','Mending','Message','Minor Illusion','Poison Spray','Prestidigitation','Produce Flame','Ray of Frost','Resistance','Sacred Flame','Shillelagh','Shocking Grasp','Spare the Dying','Thaumaturgy','Thorn Whip','True Strike','Vicious Mockery'],level1:['Alarm','Animal Friendship','Armor of Agathys','Arms of Hadar','Bane','Bless','Burning Hands','Charm Person','Chromatic Orb','Color Spray','Command','Compelled Duel','Comprehend Languages','Create or Destroy Water','Cure Wounds','Detect Evil and Good','Detect Magic','Detect Poison and Disease','Disguise Self','Dissonant Whispers','Divine Favor','Ensnaring Strike','Entangle','Expeditious Retreat','Faerie Fire','False Life','Feather Fall','Find Familiar','Fog Cloud','Goodberry','Grease','Guiding Bolt','Hail of Thorns','Healing Word','Hellish Rebuke','Heroism','Hex','Hunter\'s Mark','Identify','Illusory Script','Inflict Wounds','Jump','Longstrider','Mage Armor','Magic Missile','Protection from Evil and Good','Purify Food and Drink','Ray of Sickness','Sanctuary','Searing Smite','Shield','Shield of Faith','Silent Image','Sleep','Speak with Animals','Tasha\'s Hideous Laughter','Tenser\'s Floating Disk','Thunderous Smite','Thunderwave','Unseen Servant','Witch Bolt','Wrathful Smite'],level2:['Aid','Alter Self','Animal Messenger','Arcane Lock','Augury','Barkskin','Beast Sense','Blindness/Deafness','Blur','Branding Smite','Calm Emotions','Cloud of Daggers','Continual Flame','Cordon of Arrows','Crown of Madness','Darkness','Darkvision','Detect Thoughts','Enhance Ability','Enlarge/Reduce','Enthrall','Find Steed','Find Traps','Flame Blade','Flaming Sphere','Gentle Repose','Gust of Wind','Heat Metal','Hold Person','Invisibility','Knock','Lesser Restoration','Levitate','Locate Animals or Plants','Locate Object','Magic Mouth','Magic Weapon','Melf\'s Acid Arrow','Mirror Image','Misty Step','Moonbeam','Nystul\'s Magic Aura','Pass without Trace','Phantasmal Force','Prayer of Healing','Protection from Poison','Ray of Enfeeblement','Rope Trick','Scorching Ray','See Invisibility','Shatter','Silence','Spider Climb','Spike Growth','Spiritual Weapon','Suggestion','Warding Bond','Web','Zone of Truth'],level3:['Animate Dead','Aura of Vitality','Beacon of Hope','Bestow Curse','Blinding Smite','Blink','Call Lightning','Clairvoyance','Conjure Animals','Conjure Barrage','Counterspell','Create Food and Water','Crusader\'s Mantle','Daylight','Dispel Magic','Elemental Weapon','Fear','Feign Death','Fireball','Fly','Gaseous Form','Glyph of Warding','Haste','Hunger of Hadar','Hypnotic Pattern','Leomund\'s Tiny Hut','Lightning Arrow','Lightning Bolt','Magic Circle','Major Image','Mass Healing Word','Meld into Stone','Nondetection','Phantom Steed','Plant Growth','Protection from Energy','Remove Curse','Revivify','Sending','Sleet Storm','Slow','Speak with Dead','Speak with Plants','Spirit Guardians','Stinking Cloud','Tongues','Vampiric Touch','Water Breathing','Water Walk','Wind Wall'],level4:['Arcane Eye','Aura of Life','Aura of Purity','Banishment','Blight','Compulsion','Confusion','Conjure Minor Elementals','Conjure Woodland Beings','Control Water','Death Ward','Dimension Door','Divination','Dominate Beast','Evard\'s Black Tentacles','Fabricate','Fire Shield','Freedom of Movement','Giant Insect','Grasping Vine','Greater Invisibility','Guardian of Faith','Hallucinatory Terrain','Ice Storm','Leomund\'s Secret Chest','Locate Creature','Mordenkainen\'s Faithful Hound','Mordenkainen\'s Private Sanctum','Otiluke\'s Resilient Sphere','Phantasmal Killer','Polymorph','Staggering Smite','Stone Shape','Stoneskin','Wall of Fire'],level5:['Animate Objects','Antilife Shell','Awaken','Banishing Smite','Bigby\'s Hand','Circle of Power','Cloudkill','Commune','Commune with Nature','Cone of Cold','Conjure Elemental','Conjure Volley','Contact Other Plane','Contagion','Creation','Destructive Wave','Dispel Evil and Good','Dominate Person','Dream','Flame Strike','Geas','Greater Restoration','Hallow','Hold Monster','Insect Plague','Legend Lore','Mass Cure Wounds','Mislead','Modify Memory','Passwall','Planar Binding','Raise Dead','Rary\'s Telepathic Bond','Reincarnate','Scrying','Seeming','Swift Quiver','Telekinesis','Teleportation Circle','Tree Stride','Wall of Force','Wall of Stone'],level6:['Arcane Gate','Blade Barrier','Chain Lightning','Circle of Death','Conjure Fey','Contingency','Create Undead','Disintegrate','Drawmij\'s Instant Summons','Eyebite','Find the Path','Flesh to Stone','Forbiddance','Globe of Invulnerability','Guards and Wards','Harm','Heal','Heroes\' Feast','Magic Jar','Mass Suggestion','Move Earth','Otiluke\'s Freezing Sphere','Otto\'s Irresistible Dance','Planar Ally','Programmed Illusion','Sunbeam','Transport via Plants','True Seeing','Wall of Ice','Wall of Thorns','Wind Walk','Word of Recall'],level7:['Conjure Celestial','Delayed Blast Fireball','Divine Word','Etherealness','Finger of Death','Fire Storm','Forcecage','Mirage Arcane','Mordenkainen\'s Magnificent Mansion','Mordenkainen\'s Sword','Plane Shift','Prismatic Spray','Project Image','Regenerate','Resurrection','Reverse Gravity','Sequester','Simulacrum','Symbol','Teleport'],level8:['Animal Shapes','Antimagic Field','Antipathy/Sympathy','Clone','Control Weather','Demiplane','Dominate Monster','Earthquake','Feeblemind','Glibness','Holy Aura','Incendiary Cloud','Maze','Mind Blank','Power Word Stun','Sunburst','Telepathy','Tsunami'],level9:['Astral Projection','Foresight','Gate','Imprisonment','Mass Heal','Meteor Swarm','Power Word Heal','Power Word Kill','Prismatic Wall','Shapechange','Storm of Vengeance','Time Stop','True Polymorph','True Resurrection','Weird','Wish']},

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers,
        generateCoins: generateCoins,
        generateMundane: generateMundane,
        generateMagicItems: generateMagicItems,
        getModDefaults: getMods,
        saveLoot: saveLoot
	};
}());

on("ready", function () {
    LootGenerator.checkInstall();
    LootGenerator.registerEventHandlers();
});
