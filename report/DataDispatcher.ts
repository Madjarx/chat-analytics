import EventEmitter from "events";

import { NewAuthor, NewChannel, NewReport } from "@pipeline/Analyzer";
import { Platform } from "@pipeline/Types";
import { BlockData, BlockKey, BlockState } from "@pipeline/blocks/Blocks";

import Worker from "@report/WorkerReport";

type QueueEntry = {
    blockKey: BlockKey;
    timestamp: number;
};

/*declare interface DataDispatcher {
    on(event: "hello", listener: (name: string) => void): this;
}*/

export class DataDispatcher extends EventEmitter {
    private worker: Worker;
    private currentBlock?: BlockKey; // if currentBlock===undefined, the worker is available
    private currentBlockInvalidated: boolean = false;

    // Updated by the UI
    private activeBlocks: Set<BlockKey> = new Set();
    private activeIds: Set<number> = new Set();
    private activeChannels: NewChannel[] = [];
    private activeAuthors: NewAuthor[] = [];
    private activeStartDate: Date = new Date();
    private activeEndDate: Date = new Date();

    // Updated by this class and the Worker
    private readyBlocks: Map<BlockKey, BlockData | null> = new Map();

    constructor(private readonly source: NewReport) {
        super();
        this.worker = Worker();
    }

    toggleBlock(blockKey: BlockKey, id: number, active: boolean) {
        if (active) {
            this.activeIds.add(id);
            this.activeBlocks.add(blockKey);

            // try to dispatch right away
            this.tryToDispatchWork();
        } else {
            if (this.activeIds.has(id)) {
                this.activeBlocks.delete(blockKey);
                this.activeIds.delete(id);
            }
        }
        console.log(this.activeBlocks, this.activeIds);
    }

    updateChannels(channels: NewChannel[]) {
        this.activeChannels = channels;
        this.invalidateBlocks([]);
    }

    updateAuthors(authors: NewAuthor[]) {
        this.activeAuthors = authors;
        this.invalidateBlocks([]);
    }

    updateTimeRange(start: Date, end: Date) {
        this.activeStartDate = start;
        this.activeEndDate = end;
        //this.emit("updated-zoom");
        this.invalidateBlocks([]);
    }

    tryToDispatchWork() {
        // pick an active block that is not ready
        const pendingBlocks = [...this.activeBlocks].filter((k) => !this.readyBlocks.has(k));

        // if there is pending work and the worker is available
        if (pendingBlocks.length > 0 && this.currentBlock === undefined) {
            // work goes brrr
            this.dispatchWork(pendingBlocks[0]);
        }
    }

    private dispatchWork(blockKey: BlockKey) {
        // make worker unavailable
        this.currentBlock = blockKey;
        this.currentBlockInvalidated = false;

        // notify that this block is loading
        this.emit(blockKey, "loading", undefined);

        // TODO: replace with real work
        setTimeout(() => {
            this.onWorkDone(blockKey, "ready", {});
        }, Math.random() * 700 + 150);
    }

    private onWorkDone(blockKey: BlockKey, state: BlockState, data: BlockData | null) {
        console.assert(this.currentBlock === blockKey);

        // make sure the block we were working hasnt been invalidated
        if (this.currentBlockInvalidated) {
            // notify the UI
            this.emit(blockKey, "stale", undefined);
        } else {
            // store block result in case it is needed later
            // and notify the UI
            this.readyBlocks.set(blockKey, data);
            this.emit(blockKey, state, data);
        }

        // make worker available again and try to dispatch more work
        this.currentBlock = undefined;
        this.currentBlockInvalidated = false;
        this.tryToDispatchWork();
    }

    private invalidateBlocks(exception: BlockKey[]) {
        // invalidate all ready blocks with exceptions
        for (const blockKey of this.readyBlocks.keys()) {
            if (!exception.includes(blockKey)) {
                // must invalidate
                // remove from ready blocks and notify UI of stale data
                this.readyBlocks.delete(blockKey);
                this.emit(blockKey, "stale", undefined);
            }
        }
        // if we are currently working on a block, mark to invalidate
        if (this.currentBlock !== undefined && !exception.includes(this.currentBlock)) {
            this.currentBlockInvalidated = true;
        }

        // recompute
        this.tryToDispatchWork();
    }
}

export declare var platform: Platform;
export declare var dataDispatcher: DataDispatcher;

export const initDataDispatcher = (source: NewReport) => {
    dataDispatcher = new DataDispatcher(source);
    platform = source.platform;
};
