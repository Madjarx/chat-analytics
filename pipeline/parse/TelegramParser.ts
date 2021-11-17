import { TelegramExportFile, TextArray } from "@pipeline/parse/TelegramParser.d";
import { Parser } from "@pipeline/parse/Parser";

export class TelegramParser extends Parser {
    constructor() {
        super("telegram");
    }

    parse(file_content: string) {
        let data = JSON.parse(file_content) as TelegramExportFile;

        // store channel
        const lastMessageTimestamp =
            data.messages.length > 0 ? Date.parse(data.messages[data.messages.length - 1].date) : 0;
        const channel = this.addChannel(
            {
                id: data.id + "",
                name: data.name,
            },
            lastMessageTimestamp
        );

        for (const message of data.messages) {
            const authorId = message.from_id + "";
            const timestamp = Date.parse(message.date);

            if (!message.from) continue; // TODO: fix

            this.addAuthor(
                {
                    id: authorId,
                    name: message.from,
                    bot: false, // TODO: mark all bot_command's as bot
                },
                timestamp
            );

            if (message.type === "message") {
                this.addMessage({
                    id: message.id + "",
                    channelId: channel.id,
                    authorId,
                    content: this.parseTextArray(message.text),
                    timestamp,
                });
            }
        }

        this.updateTitle(data.name, 0);
    }

    parseTextArray(text: string | TextArray[]): string {
        if (typeof text === "string") {
            return text;
        } else {
            // TODO: parse text array correctly
            return text.map((t: any) => t.text).join(" ");
        }
    }
}
