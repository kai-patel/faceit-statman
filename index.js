import axios from "axios";
import Discord from "discord.js";
import dotenv from "dotenv";

dotenv.config();


class QueryFaceit {
    constructor() {
        this.apiKey = process.env.FACEIT_API_KEY;
        this.hubIDs = {
            PL: "ac41cb6c-df11-4597-8391-9b79a0cdfff6",
            CL: "2c01f318-2c99-406c-af29-6e89dc8b8aa1",
            "Division 1": "c25f2623-2d98-4d11-9b22-bbb80dab8510",
            "Division 2": "47d463c5-692c-4357-9f19-aa2edf5ae3a9",
        };

        this.faceitInstance = axios.create({
            baseURL: "https://open.faceit.com/data/v4/",
            method: "get",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
    }

    async getResource(endpoint, args) {
        try {
            console.log(`Fetching data from endpoint: ${endpoint}`);
            let result = await this.faceitInstance(endpoint, { params: args });
            return result.data;
        } catch (e) {
            console.log(
                `Could not fetch data from endpoint: ${endpoint}! Error: ${e}`
            );
        }
    }

    async getMatchesAllDivisions() {
        let response = [];
        for (let i in this.hubIDs) {
            try {
                let ongoingMatches = await this.getResource(
                    `hubs/${this.hubIDs[i]}/matches`,
                    {
                        type: "ongoing",
                    }
                );
                console.log(ongoingMatches);
                if (ongoingMatches.items === []) {
                    response.push(`No ongoing ${i} matches`);
                } else {
                    response.push(
                        `\`${ongoingMatches.items.length}\` **${i}** matches`
                    );
                    ongoingMatches.items.forEach((match) => {
                        console.log(match.results);
                        response.push(
                            `\`${match.teams.faction1.name} [${match.results.score.faction1}]\` **vs.** \`${match.teams.faction2.name} [${match.results.score.faction2}]\``
                        );
                    });
                }
            } catch (e) {
                console.log("Could not get ongoing matches!");
            }
        }
        return response;
    }

    async getLeaderboardsAllDivisions() {
        let boardIDs = {};
        let boards = {};
        try {
            for (let i in this.hubIDs) {
                let result = await this.getResource(
                    `leaderboards/hubs/${this.hubIDs[i]}`,
                    { limit: 1 }
                );
                boardIDs[i] = result.items[0].leaderboard_id;
                //console.log(boardIDs);
            }

            for (let i in boardIDs) {
                let result = await this.getResource(
                    `leaderboards/${boardIDs[i]}`,
                    { limit: 20 }
                );
                boards[i] = result;
            }
            //console.log(boards);
        } catch (e) {
            console.log("Could not retrieve leaderboard data!");
        }
        return boards;
    }
}

function sendBoard(board, message, hub) {
    let text = ["```"];
    message.channel.send(`\`${hub}: ${board.leaderboard.leaderboard_name}\``);
    if (1) {
        board.items.forEach((item) =>
            text.push(
                `( ${item.position} ) ${item.player.nickname} has won ${
                    item.won
                }/${item.played} (${Math.round(
                    item.win_rate * 100
                )}%) of their matches [${item.points} points]`
            )
        );
    }
    text.push("```");
    message.channel.send(text.join("\n"));
    return;
}

const queryFaceit = new QueryFaceit();

const client = new Discord.Client();
client.on("ready", () => {
    console.log("Bot ready!");
});

client.on("message", async (message) => {
    switch (message.content) {
        case "!ping":
            message.channel.send("Pong!");
            break;
        case "!matches":
            try {
                let matches = await queryFaceit.getMatchesAllDivisions();
                message.channel.send("=> Checking for ongoing matches...");
                matches.forEach((hub) => message.channel.send(hub));
            } catch (e) {
                console.log("Could not get matches!");
                message.channel.send("Could not retrieve current matches...");
            }
            break;
        case "!leaderboard":
            try {
                let boards = await queryFaceit.getLeaderboardsAllDivisions();
                for (let board in boards) {
                    sendBoard(boards[board], message, board);
                }
            } catch (e) {
                console.log("Could not retrieve leaderboards!");
                message.channel.send("Could not retrieve hub leaderboards!");
            }
            break;
    }
});

client.login(process.env.DISCORD_API_KEY);
