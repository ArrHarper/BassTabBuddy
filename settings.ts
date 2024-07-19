export interface BassTabBuddySettings {
    defaultTuning: string[];
    numberOfStrings: number;
    defaultDuration: string;
}

export const DEFAULT_SETTINGS: BassTabBuddySettings = {
    defaultTuning: ['E', 'A', 'D', 'G'],
    numberOfStrings: 4,
    defaultDuration: 'quarter'
}