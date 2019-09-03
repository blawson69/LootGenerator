# LootGenerator

This [Roll20](http://roll20.net/) script generates loot according to the treasure tables in the Dungeon & Dragons 5th Edition Dungeon Master's Guide (DMG). It generates a random number (1d100) and displays the results in chat with options for showing the name of the character discovering the treasure, the name of the object from which the loot is taken, and more. Loot Generator will also let you add your own special item to the list and provides options for modifying the generation of various kinds of loot.

As an improvement to the basic treasure tables, Loot Generator also includes a Mundane Items category in addition to the default Coins, Gems, Art, and Magic Items categories. The default Mundane Items include Adventuring Gear from the Player's Handbook.

Loot Generator also allows for adding custom Magic Items, Mundane Items and Spells.

## Script Integration
Loot Generator can detect the presence of my [PurseStrings](https://github.com/blawson69/PurseStrings),  [PotionManager](https://github.com/blawson69/PotionManager), and  [GearManager](https://github.com/blawson69/GearManager) scripts, and will provide the GM a link for distributing or adding coins and items as needed.

## Syntax

```
!loot <command>
```

## Commands:
- **[--show](#--drop)**
- **[--config](#--config)**
- **[--setup](#--setup)**
- **[--help](#--help)**
- **[--export](#--export)**
- **[--import](#--import)**

## --show
This command is the meat of the LootGenerator script. It generates treasure based on the DMG Treasure tables (plus the Mundane Items) and can be modified by various parameters. Each parameter begins with double dashes and uses a colon to separate the command from its contents. The `--show` command must follow `!loot`, but the following parameters can be called in any order.

#### --type
*Mandatory.* There are 2 general types of loot: *Individual* and *Horde*. There are also 4 treasure levels based on the Challenge Rating (CR) of the monster(s)/NPC(s) from which the loot is coming: level 1 for CR 0-4, level 2 is CR 5-10, level 3 is CR 11-16, and level 4 is CR 17 and higher. The type and level are given together. For instance, passing `--type:Indiv1` will generate Individual loot for CR 0-4. `--type:Horde2` will generate Horde loot for CR 5-10, etc.

#### --Loc
*Optional.* This command is used to provide the name of the place where the loot was found. By sending `--loc:Pirate's Chest` you make the header read "Loot from Pirate's Chest". By default, the dialog sent to chat will display a simple header of "Loot".

#### --recip
*Optional*. By default, the dialog sent to chat will simply show the list of loot items found. If you wish to indicate the name of the player who discovered the loot, use `--recip:` plus the character's name to display the name of the recipient before the list of loot items.

#### --incl
*Optional.* Often you will want to include a special item in the list of items found. This could be a special quest item, a mysterious note, etc. For example, using `--incl:Cake of Surprise` will add "Cake of Surprise" to the loot found. If you want your special item to have emphasis, you may surround the text with asterisks. Sending `--incl:*Cake of Surprise*` becomes "*Cake of Surprise*" in the output.

If you wish to pass more than one item, you may separate items with a comma. Note that if you wish to use emphasis on these items you will need *each individual item* enclosed in asterisks. For example, use `--incl:Cake of Surprise,Birthday Present` or `--incl:*Cake of Surprise*,*Birthday Present*`.

Note: Special items will always be mixed in with all other items.

#### --mod
*Optional.* This command is used to override the [defaults](#--config) for showing the Coins, Gems, Art, Mundane Item, and Magic Item categories, allowing you to fine tune or customize the loot generated. To eliminate a category, send "no-" and the category of item you wish to skip. Sending `--mod:no-gems` will prevent Loot Generator from generating gems. If your default is not to show Art items, for instance, you can send `--mod:show-art` to make the script generate art objects for the loot.

You may also modify the results of the different categories by using the "less-" and "more-" prefixes. This will subtract or add, respectfully, 25 points from the die roll for each loot category you wish to modify. For instance, sending `--mod:more-coins` will add 25 to the die roll for the results of the Coins. If the script generates a die roll of 50, it will use 50 for every other loot category and 75 for the Coins. Keep in mind this does not double or halve the actual number of Items or Coins, it only returns results based on a much higher or lower die roll. For Magic Items, using "more-" could result in fewer but more powerful items.

You can modify more than one category by sending multiple parameters separated with a comma. Sending `--mod:no-gems,show-mundane` will override any defaults to Gems and Mundane Items to skip Gems and include Mundane Items.

The possible parameters for this command are:
* 'no-gems', 'less-gems', 'more-gems', and 'show-gems'
* 'no-art', 'less-art', 'more-art', and 'show-art'
* 'no-mundane', 'less-mundane', 'more-mundane', and 'show-mundane'
* 'no-magic', 'less-magic', 'more-magic', and 'show-magic'
* 'no-coins', 'less-coins', and 'more-coins'

Note: In keeping with the DMG guidelines, Gems, Art, and Magic Items are *only* available as Horde items. Passing `--mod:show-gems` with the `--type:Indiv1` command will still not generate Gems. Coins are the bare minimum for any loot, so there is no default for preventing Coins from being generated.

#### Examples
```
!loot --show --type:Horde3
!loot --show --type:Indiv1 --mod:less-gems,no-art
!loot --show --loc:Dragon's Lair --type:Horde4
!loot --show --type:Indiv2 --recip:Pip the Pickpocket --incl:Love Letter to Bryon
```

## --config
Provides an interface for setting defaults for the `--show` command's [`--mod`](#--mod) parameter, and for [exporting tables](#--export).

## --setup
Prior to first use, you must run this function to populate the loot database with items found in the treasure tables in the DMG and items from the PHB. After installation, you will receive a dialog with a button for running this command.

```
!loot --setup
```

Unique magic items are automatically removed from the loot database after generation, so a reset option is provided to re-populate the database if necessary. To do so, pass the `--reset` modifier along with the `--setup` command.

```
!loot --setup --reset
```

## --help
Displays help for formatting the [--show](#--show) command and a link to display the [Config Menu](#--config).

```
!loot --help
```

## --import
Importing gives you the ability to customize your Magic Items, Mundane Items, and Spells lists. Once you have [exported](#--export) the necessary tables you can edit them to your liking. Leave any original items you wish to use and add your own according to the guidelines below.

The required `--tables` parameter is a comma delimited list of Item tables and/or Spells handouts to which you have made changes. The options are *Table A, Table B, Table C, Table D, Table E, Table F, Table G, Table H, Table I, Mundane*, and *Spells*. If you wish to only modify the Spells, send

```
!loot --import --tables:Spells
```

If you are adding to Magic Table A and Spells, use `--tables:Table A,Spells`, etc.

#### Magic & Mundane Items
Magic & Mundane Items have a specific format that allows a weighted distribution. For instance, Items with a weight of 2 will be twice as likely to be encountered as an item with a weight of 1. The default Magic Items have a weight value based on the d100 roll from the DMG tables, so be aware that adding a large number of new items will skew those weights accordingly.

There are many Magic Items that are unique and can only be found once during any campaign. To indicate this quality for your custom Items, send "unique" as the last parameter of the Magic Item. This item will then be removed from the database after it has been generated.

The format for Magic & Mundane Items is "weight|name" or "weight|name|unique", each on a separate line in the handout.

#### Built-In Replacement Variables
The Magic & Mundane Items tables use a built-in replacement syntax that allows randomization of item names and the rolling of dice. You will encounter many of these in the [exported handouts](#--export), but only a few (below) will be relevant for use in your custom Items. Words surrounded by %% are randomized selectors, while any die expression such as 1d4 will be within @ signs.
* **%%damage_types%%** will return a random damage type, such as Acid, Fire, or Necrotic.
* **%%monster_types%%** will return a random monster type, such as Beast, Dragon, or Giant.
* **%%swords%%** will return either Shortsword, Longsword, or Greatsword for magic swords.
* **%%ammo%%** will return Arrow, Crossbow Bolt, Sling Bullet, or Blowgun Needle. Note that these are singular, so that any time you wish to produce multiples you will need an s after.

Examples:

| Database Entry Name| Generated Loot|
| ------------- |-------------|
| *%%swords%%* of Yawning |Longsword of Yawning|
|Potion of *%%damage_types%%* Breath|Potion of Thunder Breath|
|Homing *%%ammo%%*s (*@1d4+1@*)|Homing Crossbow Bolts (3)|

#### Custom Replacement Variables
You can use randomization in your own custom items by using $$ around a list of words or phrases separated by a tilde (~). LootGenerator will choose randomly from that list every time the custom item is generated. You may also use any of the built-in replacement variables inside your random options list to give it even more flavor.

Examples:

| Database Entry Name| Generated Loot|
| ------------- |-------------|
|Wand of *$$Yawning\~Winking\~Belching$$* |Wand of Winking|
|*$$@1d6+1@ Large~@1d8+2@ Medium~@1d10+3@ Small$$* *%%monster_types%%* Bones|7 Small Humanoid Bones|
|Feather of *$$%%ammo%%~%%damage_types%%$$* Deflection|Feather of Blowgun Needle Deflection|

*Be careful when editing exported handouts! Leaving out a replacement variable character, or using one in an Item description without actually using it as a replacement variable, can break the script.*

#### Spells
The Spell tables are not weighted as the Magic Items are, but are a simple list of all available spells that are used to generate spell scrolls. Each level of spell is a comma delimited list on one line with a heading designating the level of the spells in the list. These headings are in ALL CAPS followed by a colon and also on their own line. "CANTRIPS:" or "0 LEVEL:" are allowed for cantrips, while the remainder should be "1ST LEVEL:" and so on.

#### Formatting Guidelines
Because you could be generating quite a lengthy list of loot items, avoid using commas in your custom Item names. You will notice that default Item names that contain commas in the DMG tables have been modified to remove them. For instance, "Shield, +1" has been changed to "+1 Shield". Also, the use of parenthesis should be minimized. These are used primarily by LootGenerator to denote multiples of items. Three Potions of Healing are generated as "Potion of Healing (3)." And, of course, avoid the use of replacement variable characters (%, @, $, ~).

## --export
To provide customization options for Magic Items, Mundane Items, and Spells, export and [import](#--import) options are provided. To do this you must first export the data into handouts. This will give you the proper format for your additional items and provides handouts with the proper titles that the import function will look for. *You must run `--setup` before exporting.*

```
!loot --export
```

Note: If you wish to reset the database to start another campaign and you have customized any of the tables, you can skip the [`--setup` command](#--setup) and simply re-import data from those tables.
