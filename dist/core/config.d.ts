import type { SkillcheckConfig } from "./types.js";
export declare const defaultConfig: SkillcheckConfig;
export declare class ConfigError extends Error {
    readonly configPath: string;
    constructor(configPath: string, message: string);
}
export declare function loadConfig(options: {
    cwd: string;
    explicitPath?: string;
    overrides?: Partial<SkillcheckConfig>;
}): Promise<{
    config: SkillcheckConfig;
    configFile: string | undefined;
}>;
//# sourceMappingURL=config.d.ts.map