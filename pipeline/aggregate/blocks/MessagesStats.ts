import { Message } from "@pipeline/Types";
import { BlockDescription, BlockFn } from "@pipeline/aggregate/Blocks";
import { parseAndFilterMessages } from "@pipeline/aggregate/Helpers";

export interface MessagesStats {
    total: number;
}

const fn: BlockFn<MessagesStats> = (database, filters) => {
    const res: MessagesStats = {
        total: 0,
    };

    const processMessage = (msg: Message) => {
        res.total++;
    };

    parseAndFilterMessages(processMessage, database, filters);

    return res;
};

export default {
    key: "messages-stats",
    triggers: ["authors", "channels", "time"],
    fn,
} as BlockDescription<"messages-stats", MessagesStats>;
