export interface CliIo {
    stdout: NodeJS.WritableStream;
    stderr: NodeJS.WritableStream;
}
export declare function runCli(argv: string[], io?: CliIo): Promise<number>;
//# sourceMappingURL=main.d.ts.map