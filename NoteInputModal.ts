import { App, Modal, Setting, ButtonComponent } from 'obsidian';
import { Note, Tablature } from './models';

export class NoteInputModal extends Modal {
    onSubmit: (result: Note) => void;
    onUndo: () => void;
    bassString: number;
    fret: number;
    duration: number;

    constructor(app: App, onSubmit: (result: Note) => void, onUndo: () => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.onUndo = onUndo;
        this.resetValues();
    }

    resetValues() {
        this.bassString = 4; // E string (lowest)
        this.fret = 0;
        this.duration = 0.25; // Quarter note as default
    }

    onOpen() {
        this.renderContent();
    }

    renderContent() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h1", { text: "Add Note or Rest" });

        new Setting(contentEl)
            .setName("Bass String")
            .addButton(btn => this.createSegmentedControl(btn, ['E', 'A', 'D', 'G'], (value, index) => this.bassString = index + 1, this.bassString - 1));

        new Setting(contentEl)
            .setName("Fret")
            .addButton(btn => this.createSegmentedControl(btn, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], value => this.fret = value, this.fret));

        new Setting(contentEl)
            .setName("Duration")
            .addButton(btn => this.createSegmentedControl(btn, 
                ['Whole', 'Half', 'Quarter', 'Eighth', 'Sixteenth'], 
                (value, index) => this.duration = [1, 0.5, 0.25, 0.125, 0.0625][index],
                [1, 0.5, 0.25, 0.125, 0.0625].indexOf(this.duration)
            ));

        const buttonContainer = contentEl.createDiv('button-container');

        new ButtonComponent(buttonContainer)
            .setButtonText("Add Note")
            .setCta()
            .onClick(() => this.submitNote(false));

        new ButtonComponent(buttonContainer)
            .setButtonText("Add Rest")
            .onClick(() => this.submitNote(true));

        new ButtonComponent(buttonContainer)
            .setButtonText("Undo")
            .onClick(() => {
                this.onUndo();
            });
    }

    createSegmentedControl(button: ButtonComponent, values: (string | number)[], onChange: (value: string | number, index: number) => void, defaultIndex: number) {
        const containerEl = createEl('div', { cls: 'segmented-control' });
        values.forEach((value, index) => {
            const segmentEl = containerEl.createEl('div', { 
                cls: 'segment', 
                text: value.toString() 
            });
            segmentEl.addEventListener('click', () => {
                containerEl.querySelectorAll('.segment').forEach(el => el.removeClass('is-active'));
                segmentEl.addClass('is-active');
                onChange(value, index);
            });
            if (index === defaultIndex) {
                segmentEl.addClass('is-active');
            }
        });
        button.buttonEl.replaceWith(containerEl);
        return button;
    }

    submitNote(isRest: boolean) {
        const note = isRest 
            ? new Note(-1, -1, this.duration)
            : new Note(this.bassString, this.fret, this.duration);
        this.onSubmit(note);
        this.renderContent(); // Re-render to update UI, but keep current values
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}