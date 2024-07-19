import { Tablature, Measure, Note, SLOTS_PER_MEASURE } from './models';

export class TabRenderer {
    static readonly MEASURES_PER_ROW = 4;

    static renderAsText(tablature: Tablature): string {
        let output = '';
        const stringNames = ['G', 'D', 'A', 'E'];

        for (let i = 0; i < tablature.measures.length; i += this.MEASURES_PER_ROW) {
            const rowMeasures = tablature.measures.slice(i, i + this.MEASURES_PER_ROW);
            const measureContents = rowMeasures.map(measure => this.renderMeasure(measure));

            stringNames.forEach((stringName, stringIndex) => {
                output += `${stringName}|`;
                measureContents.forEach(content => {
                    output += content[3 - stringIndex] + '|';
                });
                output += '\n';
            });

            output += ''.padEnd((SLOTS_PER_MEASURE + 1) * rowMeasures.length + 1, '-') + '\n\n';
        }

        return output;
    }

    private static renderMeasure(measure: Measure): string[] {
        const strings = ['', '', '', ''];
        let currentSlot = 0;

        measure.notes.forEach(note => {
            const noteWidth = Math.round(SLOTS_PER_MEASURE * note.duration);
            
            if (note.bassString === -1 && note.fret === -1) {
                // This is a rest
                strings.forEach((_, index) => {
                    strings[index] += ''.padEnd(noteWidth, '-');
                });
            } else {
                strings.forEach((_, index) => {
                    if (index === note.bassString - 1) {
                        strings[index] += note.fret.toString().padEnd(noteWidth, '-');
                    } else {
                        strings[index] += ''.padEnd(noteWidth, '-');
                    }
                });
            }

            currentSlot += noteWidth;
        });

        // Fill the rest of the measure with dashes if it's not full
        if (currentSlot < SLOTS_PER_MEASURE) {
            const remainingSlots = SLOTS_PER_MEASURE - currentSlot;
            strings.forEach((_, index) => {
                strings[index] += ''.padEnd(remainingSlots, '-');
            });
        }

        return strings;
    }
}