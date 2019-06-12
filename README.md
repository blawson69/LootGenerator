# LootGenerator

This [Roll20](http://roll20.net/) script generates loot according to the treasure tables in the Dungeon & Dragons 5th Edition Dungeon Master's Guide. It generates a random number (1d100) and displays the results in chat with options for showing the name of the character discovering the treasure, the name of the object from which the loot is taken, and more. Loot Generator will also let you add your own special item to the list and provides options for suppressing the generation of various kinds of loot.

As an improvement to the basic treasure tables, Loot Generator also includes a Mundane Items category in addition to the default Coins, Gems, Art, and Magic Items categories. These Mundane Items include items from Player's Handbook's Adventuring Gear.

Loot Generator also allows for adding custom Magic Items, Mundane Items and Spells.

## Script Integration
Loot Generator can detect the presence of my [PurseStrings script](https://github.com/blawson69/PurseStrings), and will provide the GM a link for distributing or adding coins as needed.

## Syntax

```!loot <command>```

## Commands:
* **[--show](#--drop)**
* **[--config](#--config)**
* **[--setup](#--setup)**
* **[--help](#--help)**
* **[--export](#--export)**
* **[--import](#--import)**

## --show
This command is the meat of the script. It generates loot based on the DMG Treasure tables (plus the Mundane Items) and can be modified by various parameters. Each parameter begins with double dashes and uses a colon to separate the command from its contents. The `--show` command must follow `!loot`, but the parameters can be called in any order.

#### --type
*Mandatory.* There are 2 general types of loot: *Individual* and *Horde*. There are also 4 levels based on the Challenge Rating (CR) of the monster/NPC from which the loot is coming: level 1 for CR 0 - 4, level 2 is CR 5 - 10, level 3 is CR 11 - 16, and level 4 is CR 17 and higher. Passing `--type:Indiv1` will generate Individual loot for level 1 (CR 0 - 4). `Horde2` will generate Horde loot for level 2 (CR 5 - 10), etc.

#### --Loc
*Optional.* This command is used to provide the name of the place where the loot was found. By sending `--loc:Pirate's Chest` you make the header read "Loot from Pirate's Chest". By default, the dialog sent to chat will display a simple header of "Loot".

#### --recip
*Optional*. By default, the dialog sent to chat will simply show the list of loot items found. If you wish to indicate the name of the player who discovered the loot, use `--recip:` plus the character's name to display the name of the recipient before the list of loot items.

#### --incl
*Optional.* Often you will want to include a special item in the list of items found. This could be a special quest item, a mysterious note, etc. For example, using `--incl:Birthday Cake` will add "Birthday Cake" to the loot found.

#### --mod
*Optional.* This command is used to override the [defaults](#--config) for showing the Gems, Art, Mundane Item, and Magic Item categories, allowing you to fine tune or customize the loot generated. To eliminate a category, send "no-" and the category of item you wish to skip. Sending `--mod:no-gems` will prevent Loot Generator from generating gems. If your default is not to show Art items, for instance, you can send `--mod:show-art` to make the script generate art objects for the loot.

You can modify more than one category by sending multiple parameters separated with a comma. Sending `--mod:no-gems,show-mundane` will override any defaults to Gems and Mundane Items to skip Gems and include Mundane Items.

The possible parameters for this command are:
* 'no-gems' or 'show-gems'
* 'no-art' or 'show-art'
* 'no-mundane' or 'show-mundane'
* 'no-magic' or 'show-magic'
* 'no-coins'

Note: In keeping with the DMG guidelines, Gems, Art, and Magic Items are *only* available as Horde items. Passing `--mod:show-gems` with the `--type:Indiv1` command will still not generate Gems. Coins are the bare minimum for any loot, so there is no default for preventing Coins from being generated. However, the option to skip them for special circumstances is provided.

#### Examples
```
!loot --show --type:Horde3
!loot --show --type:Indiv1 --mod:no-gems,no-art
!loot --show --loc:Dragon's Lair --type:Horde4
!loot --show --type:Indiv2 --recip:Pip the Pickpocket --incl:Love Letter to Bryon
```

## --config
Gems, Art and Mundane item generation can all be controlled through commands. However, you may want to set default values for whether these items are generated to avoid always having to pass values through the [`--mod`](#--show) command. This is done through the Config Menu.

## --setup
Prior to use, you must run this function to populate the loot database. This uses tables found in the DMG and PHB.

```!loot --setup```

Unique magic items are automatically removed from the loot database after generation, so a reset option is provided to re-populate the database if necessary. To do so, pass the `--reset` modifier along with the `--setup` command.

```!loot --setup --reset```

## --help
Displays help for formatting the [--show](#--show) command and a link to display the [Config Menu](#--config).

```!loot --help```

## --export
To provide customization options for Magic Items, Mundane Items, and Spells, export and [import](#--import) options are provided. The easiest way to make changes to the default database is to first export the data into handouts. This will give you the proper format for your additional items and provides handouts with the proper titles that the import function will look for.

```!loot --export```

Note: If you wish to reset the database to start another campaign, you can skip the [`--setup` command](#--setup) and simply import data from these tables.

## --import
Importing gives you the ability to customize your Magic Items, Mundane Items, and Spells lists. The preferred method is to [export](#--export) all of the necessary tables and edit them to your liking. Leaving any original items in the table and adding your own will help you balance distribution of items.

There are 2 parameters that must be included in the import command: `--action` and `--tables`: The first specifies whether the Items to be imported "overwrite" the data or merely "append" the new Items to the old data. Because there is no way to accurately prevent duplicates, it is highly recommended to use the overwrite action with an exported table to which new Items have been added. In any case, the parameter to use is either `--action:overwrite` or `--action:append`.

The `--tables` parameter is a comma delimited list of Item tables and/or Spells that you wish to make changes to. The options are *Table A, Table B, Table C, Table D, Table E, Table F, Table G, Table H, Table I, Mundane*, and *Spells*. If you wish to only modify the Spells, send

```!loot --import --action:overwrite --tables:Spells```

If you are adding to Magic Table A and Spells, use `--tables:Table A,Spells`, etc.

#### Magic & Mundane Items
Magic & Mundane Items have a specific format that allows a weighted distribution. For instance, Items with a weight of 2 will be twice as likely to be encountered as an item with a weight of 1. The default Items have a weight value based on the d100 roll from the DMG tables, so be aware that adding a large number of new items will skew those weights accordingly.

There are many Magic Items that are unique and can only be found once during any campaign. To indicate this quality for your custom Items, send "unique" as the last parameter of the Magic Item. This item will then be removed from the database after it has been generated.

The format for Magic & Mundane Items is "weight|name" or "weight|name|unique", each on a separate line in the handout.

#### Replacement Variables
The Magic & Mundane Items tables use a replacement syntax that allows randomization of items and the rolling of dice. You will encounter many of these in the [exported handouts](#--export), but only a few (below) will be relevant for use in your custom Items. Words surrounded by %% are randomized selectors, while any die expression such as 1d4 will be within @ signs.
* **%%damageTypes%%** will return a random damage type, such as Acid, Fire, or Necrotic.
* **%%monsterTypes%%** will return a random monster type, such as Beast, Dragon, or Giant.
* **%%swords%%** will return either Shortsword, Longsword, or Greatsword for magic swords.
* **%%ammo%%** will return Arrow, Crossbow Bolt, Sling Bullet, or Blowgun Needle. Note that these are singular, so that any time you wish to produce multiples you will need an s after.

Examples:

| Database Entry| Generated Loot|
| ------------- |-------------|
| *%%swords%%* of Yawning |Longsword of Yawning|
|Potion of *%%damageTypes%%* Breath|Potion of Thunder Breath|
|Homing *%%ammo%%*s (*@1d4+1@*)|Homing Crossbow Bolts (3)|

*Be careful when editing exported handouts! Leaving out a replacement variable character, or using one in an Item description without actually using it as a replacement variable, can break the script.*

#### Spells
The Spell tables are not weighted as the Magic Items are, but are a simple list of all available spells that are used to generate spell scrolls. Each level of spell is a comma delimited list on one line with a heading designating the level of the spells in the list. These headings should be in ALL CAPS followed by a colon and also on their own line. "CANTRIPS:" or "0 LEVEL:" are allowed for cantrips, while the remainder should be "1ST LEVEL:" and so on.

If you are appending spells, you may leave off those spell levels for which you do not have any spells to append.

#### Formatting Guidelines
Because you could be generating quite a lengthy list of loot items, avoid using commas in your custom Item names. You will notice that default Item names that usually contain commas have been modified to remove them. For instance, "Shield, +1" has been changed to "+1 Shield". This helps avoid item confusion on long lists. Also, the use of parenthesis should be minimized. These are used primarily by LootGenerator to denote multiples of items.
