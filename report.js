/*
To Berquist:

This code integrates with a chat bot for Discord and the Bungie API for the video game Destiny 2.
The large commented section at the bottom were notes for when I explored this API, which had rather limited documentation.
Hope you enjoy reading it I suppose!
*/

const Discord = require('discord.js');
const commando  = require('discord.js-commando');
const axios = require('axios');
const Chars = require("E:/Documents/RaidReporter/commands/destiny/chars.json");

//const reportEmbed = new Discord.MessageEmbed()
//    .setThumbnail(`https://bungie.net/${actIcon}/`)

module.exports = class InfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'report',
            aliases: ['r','rep'],
            group: 'destiny',
            memberName: 'report',
            description: 'Generates a raid report based on your last raid activity.',
            args: [
                {
                    key: 'playername', prompt: 'Report on who?', type: 'string', default: "bedrock",
                    oneOf: ["arct","artemis","bedrock","chip","greenhydra","jeffus","rowan"]
                },
                {
                    key: 'char', prompt: 'Report on what character?', type: 'string', default: "w",
                    oneOf: ["h","t","w"]
                }
            ]
        });
    }

    run(message, {playername,char}) {

        //const wlkEmoji = commando.client.emoji.cache.get('844970434441117736');
        //const ttnEmoji = commando.client.emoji.cache.get('844970434491449385');
        //const htrEmoji = commando.client.emoji.cache.get('844970434604957786');

        var apiKey = "ff7a9d1f7ff8433bbf2cb0a624b330b5";
        /* ==== Get the last raid's unique id ====*/
        axios.get('https://www.bungie.net/platform/Destiny2/'+Chars[playername].type+'/Account/'+Chars[playername].id+'/Character/'+Chars[playername][char]+'/Stats/Activities?count=1&mode=4&page=0', {headers: {"X-API-Key" : apiKey}})
            .then(resp => {
                grabRaidId(resp);
            })
            .catch(err => {console.log("RAID ACTIVITY ERROR"+err.response.data)});
        //console.log('https://www.bungie.net/platform/Destiny2'+Chars[playername].type+'/Account/'+Chars[playername].id+'/Character/'+Chars[playername][char]+'/Stats/Activities?count=1&mode=4&page=0', {headers: {"X-API-Key" : apiKey}})
        /* ==== Store general values not grabbable from CarnageReport in vars for embed ====*/
        var instance;
        var date;
        var clearTime
        var numPlayers;
        var actHash;
        var completed;
        function grabRaidId(resp){
            instance = (resp.data.Response.activities[0].activityDetails.instanceId);
            clearTime = (resp.data.Response.activities[0].values.timePlayedSeconds.basic.displayValue);
            numPlayers = (resp.data.Response.activities[0].values.playerCount.basic.value);
            actHash = (resp.data.Response.activities[0].activityDetails.directorActivityHash);
            date = (resp.data.Response.activities[0].period).substring(0,10);
            completed = (resp.data.Response.activities[0].values.completed.basic.value)
            grabActInfo(actHash);
        };
        /* ==== Get general activity info ====*/
        function grabActInfo(hash){
        /* THIS MUST BE REPLACED OFTEN WITH THE NEW MANIFEST LOCATED AT https://www.bungie.net/Platform/Destiny2/Manifest/jsonWorldComponentContentPaths/en/DestinyActivityDefinition*/
            axios.get('https://www.bungie.net/common/destiny2_content/json/en/DestinyActivityDefinition-e72a400c-8af5-4c59-b0b0-470b69865b09.json') //Get destiny activity manifest
                .then(resp => {
                    formatActInfo(resp,hash);})
                    .catch(err => {console.log("MANIFEST ERROR"+err)});
                };
        /* ==== Store general activity info in vars */
        var actName;
        var actDesc;
        var actIcon;
        function formatActInfo(resp,hash){
            actIcon = (resp.data[hash].pgcrImage);
            actName = (resp.data[hash].originalDisplayProperties.name);
            actDesc = (resp.data[hash].originalDisplayProperties.description);
            getFireteam(instance);
        };
        /* ==== Grab full CarnageReport==== */
        function getFireteam(id){
            axios.get(`https://www.bungie.net/platform/Destiny2/Stats/PostGameCarnageReport/${instance}/`, {headers: {"X-API-Key" : apiKey}})
                .then(resp => {
                    compoundValues(resp.data.Response.entries);
                })
                .catch(err => {
                    console.log("CARNAGE REPORT ERROR"+err)
                })
        };
        /* ==== Actually sum up kills, compare K/Ds, etc ====*/
        var playerList = [];
        var totalKills = 0;
        var totalDeaths = 0;
        var playerAndClass = [];
        var playerListFormatted = "";
        var bestKDVal = 0;
        var bestKDName = "";
        var classList = [];

        function compoundValues(data){
            if (data){
                var i = 0;
                while (i < numPlayers){
                    if (data[i].player.characterClass == "Warlock") {
                        classList.push("<:warlock:844970434441117736>")
                    }else if (data[i].player.characterClass == "Hunter") {
                        classList.push("<:hunter:844970434604957786>")
                    }else if (data[i].player.characterClass == "Titan") {
                        classList.push("<:titan:844970434491449385>")
                    }
                    playerList.push(data[i].player.destinyUserInfo.displayName);
                    totalKills += (data[i].values.kills.basic.value);
                    totalDeaths += (data[i].values.deaths.basic.value);
                    if (data[i].values.killsDeathsRatio.basic.value > bestKDVal){
                        bestKDName = data[i].player.destinyUserInfo.displayName;
                        bestKDVal = data[i].values.killsDeathsRatio.basic.value;
                    };
                    i++;
                };
                var j = 0;
                while (j < numPlayers){
                    playerAndClass.push(classList[j]+playerList[j])
                    j++;
                };
                playerListFormatted = playerAndClass.join(", ");
                //console.log(playerAndClass);
                //console.log(playerListFormatted);
                //console.log(classList);
                result()
            }else console.log("there is an issue");
        };
        
        function result(){
            var clearData = '';
            if (completed == 0){
            clearData = (`Uncleared, ${clearTime} on ${date} by:`);
            }else {
                clearData = (`Cleared in ${clearTime} on ${date} by:`);
            };
            const reportEmbed = new Discord.MessageEmbed()
                .setThumbnail(`https://www.bungie.net${actIcon}`)
                .setAuthor('Raid Report', 'https://bedrock206.net/wp-content/uploads/2020/11/rr_icon.png', 'https://bedrock206.net/raid-reporter')
                .setTitle(`${actName} - Raid Report`)
                .setDescription(actDesc)
                .addFields(
                    {name: clearData, value: playerListFormatted},
                    {name: 'Kills:', value: totalKills, inline: true},
                    {name: 'Deaths:', value: totalDeaths, inline: true},
                    {name: 'Best K/D:', value: `${bestKDName} - ${bestKDVal.toFixed(2)}`, inline: true},
                )
                .setTimestamp()
                .setFooter("r!report "+playername+" "+char)
                ;
            message.delete();
            message.say(reportEmbed);
        };
        /*
		====Notes====
		
        https://www.bungie.net/platform/Destiny2/3/Account/4611686018485311223/Character/2305843009408899890/Stats/Activities?count=1&mode=4&page=0 = current working URL
        console.log(json.Response.data.inventoryItem.itemName);

        bungie.net member id 20176530
        destiny membership id 4611686018485311223
        Membership type is 3 for PC players

        Gjallerhorn, not working https://www.bungie.net/platform/Destiny/Manifest/InventoryItem/1274330687/
        search https://www.bungie.net/platform/User/SearchUsers/?q=Bedrock206

        Final Activity Request (DEPRECATED): /Destiny2/2/Account/4611686018485311223/Character/{characterId}/Stats/Activities/Stats/Activities?count=1&mode=4&page=0
        
        2305843009408899890 = Warlock
        2305843009620785482 = ?
        2305843009625886425 = ?

        GOS = 3458480158
        DSC = 910380154
        Lw  = 2122313384 (Normal???)

        Stats:
        Raid name/desc - done
        icon/cover image 
        List of players - done
        Date - done
        Time - done
        Kills - done
        Deaths - done
        Best K/D - done

        Arct:
        Mem ID: 4611686018489419757
        Hunter: 2305843009511555788
        Titan : 2305843009529244212
        Warlck: 2305843009504255088

        Artemis:
        Mem ID: 4611686018483161966
        Hunter: 2305843009557454450
        Titan : 2305843009527237233
        Warlck: 2305843009404695939

        Bedrock206:
        Mem ID: 4611686018485311223
        Hunter: 2305843009625886425
        Titan : 2305843009620785482
        Warlck: 2305843009408899890

        chip:
        Mem ID: 4611686018486353503
        Hunter: 2305843009422224040
        Titan : 2305843009468814898
        Warlck: 2305843009453854204

        Greenhydra410:
        Mem ID: 4611686018448826710
        Hunter: 2305843009537896302
        Titan : 2305843009536276210
        Warlck: 2305843009261708967

        jeffus:
        Mem ID: 4611686018510053256
        Hunter: 2305843009738424766
        Titan :
        Warlck: 2305843009759065352

        Rowan926:
        Mem ID: 4611686018484422093
        Hunter: 2305843009408505266
        Titan : 2305843009492494957
        Warlck: 2305843009556196981
        */
               
    }
}