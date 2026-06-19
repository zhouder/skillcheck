export interface DiscoveryIssue {
    path: string;
    message: string;
}
export interface DiscoveryResult {
    directories: string[];
    issues: DiscoveryIssue[];
}
export declare function discoverSkills(options: {
    inputs: string[];
    cwd: string;
    ignore: string[];
    maxDepth: number;
}): Promise<DiscoveryResult>;
//# sourceMappingURL=discovery.d.ts.map