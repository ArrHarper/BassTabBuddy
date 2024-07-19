export const SLOTS_PER_MEASURE = 16;

export class Note {
    constructor(
        public bassString: number, // -1 for rest
        public fret: number, // -1 for rest
        public duration: number // 1 = whole, 0.5 = half, 0.25 = quarter, 0.125 = eighth, 0.0625 = sixteenth
    ) {
        this.validateBassString(bassString);
        this.validateFret(fret);
        this.validateDuration(duration);
    }

    private validateBassString(bassString: number) {
        if (bassString !== -1 && (bassString < 1 || bassString > 4)) {
            throw new Error("Bass string must be between 1 and 4, or -1 for rest");
        }
    }

    private validateFret(fret: number) {
        if (fret !== -1 && fret < 0) {
            throw new Error("Fret must be 0 or greater, or -1 for rest");
        }
    }

    private validateDuration(duration: number) {
        const validDurations = [1, 0.5, 0.25, 0.125, 0.0625];
        if (!validDurations.includes(duration)) {
            throw new Error("Invalid duration");
        }
    }

    public isRest(): boolean {
        return this.bassString === -1 && this.fret === -1;
    }

    public toString(): string {
        if (this.isRest()) {
            return `Rest, Duration: ${this.duration}`;
        }
        return `Bass String: ${this.bassString}, Fret: ${this.fret}, Duration: ${this.duration}`;
    }
}

export class Measure {
    constructor(
        public notes: Note[] = [],
        public timeSignature: TimeSignature = new TimeSignature(4, 4)
    ) {}

    addNote(note: Note) {
        this.notes.push(note);
    }

    isFull(): boolean {
        return this.getFilledSlots() >= SLOTS_PER_MEASURE;
    }

    getFilledSlots(): number {
        return this.notes.reduce((total, note) => total + note.duration * SLOTS_PER_MEASURE, 0);
    }

    getRemainingSlots(): number {
        return SLOTS_PER_MEASURE - this.getFilledSlots();
    }
}

export class Tablature {
    constructor(
        public measures: Measure[] = [],
        public defaultTimeSignature: TimeSignature = new TimeSignature(4, 4)
    ) {
        if (this.measures.length === 0) {
            this.addMeasure();
        }
    }

    addMeasure() {
        this.measures.push(new Measure([], this.defaultTimeSignature));
    }

    getCurrentMeasure(): Measure {
        if (this.measures.length === 0 || this.measures[this.measures.length - 1].isFull()) {
            this.addMeasure();
        }
        return this.measures[this.measures.length - 1];
    }

    addNote(note: Note) {
        let remainingDuration = note.duration;

        while (remainingDuration > 0) {
            let currentMeasure = this.getCurrentMeasure();
            
            const remainingSlots = currentMeasure.getRemainingSlots();
            const noteSlots = Math.min(remainingDuration * SLOTS_PER_MEASURE, remainingSlots);
            const noteDuration = noteSlots / SLOTS_PER_MEASURE;

            currentMeasure.addNote(new Note(note.bassString, note.fret, noteDuration));
            remainingDuration -= noteDuration;

            if (remainingDuration > 0) {
                this.addMeasure();
            }
        }
    }

    undoLastNote(): boolean {
        for (let i = this.measures.length - 1; i >= 0; i--) {
            if (this.measures[i].notes.length > 0) {
                this.measures[i].notes.pop();
                if (this.measures[i].notes.length === 0 && i !== 0) {
                    this.measures.pop();
                }
                return true;
            }
        }
        return false;
    }

    undoLastMeasure(): boolean {
        if (this.measures.length > 0) {
            this.measures.pop();
            return true;
        }
        return false;
    }

    get notes(): Note[] {
        return this.measures.flatMap(measure => measure.notes);
    }

    setDefaultTimeSignature(timeSignature: TimeSignature) {
        this.defaultTimeSignature = timeSignature;
    }
}

export class TimeSignature {
    constructor(public beats: number, public beatValue: number) {
        this.validate();
    }

    private validate() {
        if (this.beats <= 0 || this.beatValue <= 0) {
            throw new Error("Both beats and beat value must be positive numbers");
        }
        if (!this.isValidBeatValue(this.beatValue)) {
            throw new Error("Beat value must be a power of 2");
        }
    }

    private isValidBeatValue(value: number): boolean {
        return (value & (value - 1)) === 0; // Checks if value is a power of 2
    }

    public toString(): string {
        return `${this.beats}/${this.beatValue}`;
    }
}