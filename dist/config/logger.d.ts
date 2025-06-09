declare const logger: import("winston").Logger;
declare const stream: {
    write: (message: string) => void;
};
export { logger, stream };
