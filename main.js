const axios = require('axios');
const { REST } = require('@discordjs/rest');
const { Client, GatewayIntentBits, Routes } = require('discord.js');
const { token, CLIENT_ID, GUILD_ID } = require('./config.json');
const fs = require('fs');
const rateLimit = require('axios-rate-limit');

// Create a custom Axios instance
const http = rateLimit(axios.create(), {
    maxRequests: 1,
    perMilliseconds: 1000
});

async function rugcheck(tokenCA) {
    
    try{
        const url = `https://api.rugcheck.xyz/v1/tokens/${tokenCA}/report`;
        console.log(url);

        const response = await http.get(url);

        if (response.status != 200) {
            console.log("Error: " + response.status);
            return;
        } else {
            console.log("Success!");

            const mint = response.data.mint;
            const mintAuthority = response.data.token.mintAuthority;
            const supply = response.data.token.supply;
            const decimals = response.data.token.decimals;
            const freezeAuthority = response.data.token.freezeAuthority;

            const name = response.data.tokenMeta.name;
            const symbol = response.data.tokenMeta.symbol;
            const mutable = response.data.tokenMeta.mutable;
            const updateAuthority = response.data.tokenMeta.updateAuthority;

            let holders = [];
            const topHolders = response.data.topHolders;
            for (let i = 0; i < 5; i++) {
                let holderAddy = topHolders[i].owner;
                if (holderAddy == "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1") {
                    holderAddy = "Raydium";
                }
                let holderAmount = topHolders[i].pct;
                holderAmount = holderAmount.toFixed(2);
                holders.push({holderAddy, holderAmount});
            }

            const risk = response.data.risks;        
            const riskName = risk[0].name;
            const riskDescription = risk[0].description;
            const riskScore = risk[0].score;
            const riskLevel = risk[0].level;
            

            const image = response.data.fileMeta.image;

            const rugged = response.data.rugged;

            const markets = response.data.markets;
            const marketType = markets[0].marketType;
            const lp = markets[0].lp;
            
            const lpLocked = lp.lpLockedPct;

            return {
                mint,
                mintAuthority,
                supply,
                decimals,
                freezeAuthority,
                name,
                symbol,
                mutable,
                updateAuthority,
                holders,
                riskName,
                riskDescription,
                riskScore,
                riskLevel,
                image,
                rugged,
                marketType,
                lpLocked
            }
        }
    } catch (error) {
        console.error(error);
        return {error: true};
    }
}

async function discordBot() {

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    const rest = new REST({ version: '10' }).setToken(token);

    client.login(token);

    client.on('ready', () => {
        console.log(`${client.user.tag} is online!`)
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand()) {
            console.log("Command received")
            const tokenCA = interaction.options.getString('token-ca');
            interaction.reply(`Checking token ${tokenCA} for rug...`);

            const data = await rugcheck(tokenCA);
            if (data.error) {
                interaction.editReply("Sorry, an error occurred, please try again.");
                return;
            }

            const mintAuthority = data.mintAuthority;
            const supply = data.supply;
            const decimals = data.decimals;
            const freezeAuthority = data.freezeAuthority;
            const name = data.name;
            const symbol = data.symbol;
            const mutable = data.mutable;
            const updateAuthority = data.updateAuthority;
            const holders = data.holders;
            const riskName = data.riskName;
            const riskDescription = data.riskDescription;
            const riskScore = data.riskScore;
            const riskLevel = data.riskLevel;
            const image = data.image;
            const rugged = data.rugged;
            const marketType = data.marketType;
            const lpLocked = data.lpLocked;

            let holderString = "";
            for (let i = 0; i < holders.length; i++) {
                holderString += `${holders[i].holderAddy} - ${holders[i].holderAmount}%\n`
            }

            const embed = {
                color: 0x0099ff,
                title: `Rugcheck (${symbol})`,
                url: `https://solscan.io/token/${tokenCA}`,
                thumbnail: {
                    url: image
                },
                footer: {
                    "text": "Stay Safe. WAGMI"
                },
                fields: [
                    {
                        "name": '**Token Information**',
                        "value": `**Name**: ${name}\n**Symbol**: ${symbol}\n**Mint Authority**: ${mintAuthority}\n**Freeze Authority**: ${freezeAuthority}\n**Mutable**: ${mutable}\n**Update Authority**: ${updateAuthority}`
                    },
                    {
                        "name": '**Top Holders**',
                        "value": holderString
                    },
                    {
                        "name": '**Risks**',
                        "value": `**Risk Name**: ${riskName}\n**Risk Description**: ${riskDescription}\n**Risk Score**: ${riskScore}\n**Risk Level**: ${riskLevel}`
                    },
                    {
                        "name": '**Market Information**',
                        "value": `**Market Type**: ${marketType}\n**LP Locked**: ${lpLocked}%`
                    }
                ]

            }
            interaction.editReply({ embeds: [embed] });
        }
    });
}
discordBot();

async function validcommands() {
    const rest = new REST({ version: '10' }).setToken(token);
    const commands = [{
        name: 'rugcheck',
        description: 'Parses Rugcheck API to check if a token is a rug',
        options: [
            {
                name: 'token-ca',
                description: 'The SOLANA token CA',
                type: 3,
                required: true
            },
        ]
    }];
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
}
validcommands();