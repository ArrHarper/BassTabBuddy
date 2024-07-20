import { ItemView, WorkspaceLeaf, ButtonComponent, MarkdownView, TFile, Notice, TextComponent, Setting, setIcon, TemplaterError } from 'obsidian';
import { Tablature, Note, Measure } from './models';
import { TabRenderer } from './TabRenderer';

export const VIEW_TYPE_TABLATURE = "tablature-view";

export class TablatureView extends ItemView {
    private tablature: Tablature;
    private contentEl: HTMLElement;
    private tabEl: HTMLElement;
    private titleInput: TextComponent;
    private artistInput: TextComponent;
    private currentBassString: number = 1; // E string
    private currentFret: number = 0;
    private plugin: BassTabBuddy;

    constructor(leaf: WorkspaceLeaf, plugin: BassTabBuddy) {
        super(leaf);
        this.plugin = plugin;
        this.tablature = new Tablature();
    }

    getViewType(): string {
        return VIEW_TYPE_TABLATURE;
    }

    getDisplayText(): string {
        return "Bass Tablature";
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.contentEl = contentEl.createDiv({ cls: 'bass-tab-buddy-content' });

        const headerEl = this.contentEl.createEl("h1", { cls: "bass-tab-buddy-header" });
        const iconEl = headerEl.createSpan({ cls: "bass-tab-buddy-icon" });
        headerEl.createSpan({ text: "Bass Tab Buddy" });
        setIcon(iconEl, "electric-bass");

        // Add metadata fields
        const metadataAndOptionsEl = this.contentEl.createDiv({ cls: 'metadata-and-options' });

        const metadataEl = metadataAndOptionsEl.createDiv({ cls: 'bass-tab-buddy-metadata' });
        new Setting(metadataEl).setName("Song Info");

       const songInfoInputs = metadataEl.createDiv({ cls: 'song-info-inputs' });

        this.titleInput = new TextComponent(songInfoInputs)
            .setPlaceholder("Title")
            .onChange(() => this.renderTablature());

        this.artistInput = new TextComponent(songInfoInputs)
            .setPlaceholder("Artist")
            .onChange(() => this.renderTablature());

        this.titleInput.inputEl.addClass('song-info-field');
        this.artistInput.inputEl.addClass('song-info-field');

        const fileOptionsEl = metadataAndOptionsEl.createDiv({ cls: 'file-options' });
        new Setting(fileOptionsEl).setName("File Options");
        
        const fileOptionsButtonsEl = fileOptionsEl.createDiv({ cls: 'file-options-buttons' });
        
        new ButtonComponent(fileOptionsButtonsEl)
            .setButtonText("New Note")
            .setTooltip("Open a new Obsidian note")
            .onClick(() => this.createNewNote());
        
        new ButtonComponent(fileOptionsButtonsEl)
            .setButtonText("Open Template")
            .setTooltip("Open a new note from your specified temnplate")
            .onClick(() => this.addTemplate());
        
        new ButtonComponent(fileOptionsButtonsEl)
            .setButtonText("Save Info")
            .setTooltip("Save the current title and artist")
            .onClick(() => { /* Functionality to be added later */ });
        
        new ButtonComponent(fileOptionsButtonsEl)
            .setButtonText("Clear Info")
            .setTooltip("Clear the current title and artist")
            .setClass('ghost-button')
            .onClick(() => { /* Functionality to be added later */ });

        this.renderNoteInputControls();

        new Setting(this.contentEl).setName("Tab Controls");
        const controlsContainer = this.contentEl.createDiv({ cls: 'controls-container' });
        const buttonEl = controlsContainer.createDiv({ cls: 'bass-tab-buddy-controls'});

    new ButtonComponent(buttonEl)
        .setButtonText("|<")
        .setTooltip("Undo Measure")
        .setClass('ghost-button')
        .onClick(() => this.undoMeasure());

    new ButtonComponent(buttonEl)
        .setButtonText("<")
        .setTooltip("Undo Note")
        .setClass('ghost-button')
        .onClick(() => this.undoNote());

    new ButtonComponent(buttonEl)
        .setButtonText("Copy Bar")
        .setTooltip("Copy last 4 measures")
        .onClick(() => this.copyBar());

    new ButtonComponent(buttonEl)
        .setButtonText("Save Tab")
        .onClick(() => this.saveTab());

    new ButtonComponent(buttonEl)
        .setButtonText("Reset")
        .setClass('ghost-button')
        .onClick(() => this.resetTablature());

        this.tabEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-tablature' });
        this.renderTablature();
    }

    private renderNoteInputControls() {
        const inputEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-note-input' });
    
        new Setting(inputEl)
            .setName("Bass String")
            .addButton(btn => {
                this.bassStringInput = btn;
                this.createSegmentedControl(btn, ['E', 'A', 'D', 'G'], (value) => {
                    this.currentBassString = ['E', 'A', 'D', 'G'].indexOf(value) + 1;
                });
            });
    
        new Setting(inputEl)
            .setName("Fret")
            .addButton(btn => {
                this.fretInput = btn;
                this.createSegmentedControl(btn, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], (value) => {
                    this.currentFret = parseInt(value);
                });
            });
    
        const noteValueSetting = new Setting(inputEl).setName("Notes and Rests");
        const noteValueButtons = noteValueSetting.controlEl.createDiv({ cls: 'note-value-buttons' });
    
        const addNoteValueButtons = (duration: number, name: string) => {
            const pairContainer = noteValueButtons.createDiv({ cls: 'note-value-pair' });
            new ButtonComponent(pairContainer)
                .setButtonText(name)
                .setClass('noteValBtn')
                .onClick(() => this.addNoteValue(duration));
            new ButtonComponent(pairContainer)
                .setButtonText("Rest")
                .setClass('noteValBtn')
                .onClick(() => this.addRestValue(duration));
        };
    
        addNoteValueButtons(1, "Whole");
        addNoteValueButtons(0.5, "1/2");
        addNoteValueButtons(0.25, "1/4");
        addNoteValueButtons(0.125, "1/8");
        addNoteValueButtons(0.0625, "1/16");
    }
    
    private addNoteValue = (duration: number) => {
        this.addNote(this.currentBassString, this.currentFret, duration);
    }
    
    private addRestValue = (duration: number) => {
        this.addNote(-1, -1, duration);
    }
    
    private addNote = (string: number, fret: number, duration: number) => {
        const note = new Note(string, fret, duration);
        this.tablature.addNote(note);
        this.renderTablature();
        if (string === -1 && fret === -1) {
            new Notice(`Added rest: Duration ${duration}`);
        }
    }

    private copyBar = () => {
        const measuresToCopy = Math.min(4, this.tablature.measures.length); // Number of measures to copy (max 4)
        const notesPerMeasure = this.tablature.defaultTimeSignature.beats;
        const notes = this.tablature.notes;
    
        // Calculate the starting index for the notes to copy
        const startIdx = notes.length - (measuresToCopy * notesPerMeasure);
        const lastNotes = notes.slice(startIdx);
    
        if (lastNotes.length > 0) {
            // Duplicate each note only once
            for (const note of lastNotes) {
                const newNote = new Note(note.bassString, note.fret, note.duration);
                this.tablature.addNote(newNote);
            }
            this.renderTablature();
            new Notice(`Duplicated the last ${measuresToCopy} measures`);
        } else {
            new Notice("Not enough measures to copy");
        }
    }
    
    private createSegmentedControl(button: ButtonComponent, values: string[], onChange: (value: string) => void) {
        const containerEl = createEl('div', { cls: 'segmented-control' });
        values.forEach((value, index) => {
            const segmentEl = containerEl.createEl('div', { 
                cls: 'segment' + (index === 0 ? ' is-active' : ''), 
                text: value 
            });
            segmentEl.addEventListener('click', () => {
                containerEl.querySelectorAll('.segment').forEach(el => el.removeClass('is-active'));
                segmentEl.addClass('is-active');
                onChange(value);
            });
        });
        button.buttonEl.replaceWith(containerEl);
    }

    private saveTab = async () => {
        const title = this.titleInput.getValue();
        const artist = this.artistInput.getValue();
        const renderedTab = TabRenderer.renderAsText(this.tablature);
        let tabContent = "";
        
        if (title) {
            tabContent += `Title: ${title}\n`;
        }
        if (artist) {
            tabContent += `Artist: ${artist}\n`;
        }
        tabContent += `\n\`\`\`tab\n${renderedTab}\n\`\`\`\n`;
    
        // Get the active leaf (which should be the current open note)
        const activeLeaf = this.app.workspace.activeLeaf;
    
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            const file = activeLeaf.view.file;
            if (file) {
                await this.app.vault.modify(file, tabContent);
                new Notice("Tablature updated in the current note!");
            } else {
                const editor = activeLeaf.view.editor;
                const cursor = editor.getCursor();
                editor.replaceRange(tabContent, cursor);
                new Notice("Tablature inserted into the current note!");
            }
        } else {
            const fileName = this.getSafeFileName(title);
            const existingFile = this.app.vault.getAbstractFileByPath(`${fileName}.md`);
            
            if (existingFile instanceof TFile) {
                await this.app.vault.modify(existingFile, tabContent);
                await this.app.workspace.getLeaf().openFile(existingFile);
                new Notice("Tablature updated in existing note!");
            } else {
                const newFile = await this.app.vault.create(`${fileName}.md`, tabContent);
                await this.app.workspace.getLeaf().openFile(newFile);
                new Notice("Tablature saved to new note!");
            }
        }
    }
    
    private getSafeFileName(title: string): string {
        if (title) {
            const safeTitlePart = title.replace(/[*"\\/<>:|?]/g, '').trim();
            return `${safeTitlePart} Bass Tab`;
        } else {
            return "New Bass Tab";
        }
    }

    private renderTablature = () => {
        if (!this.tabEl) return;
        this.tabEl.empty();
        const pre = this.tabEl.createEl("pre");
        const title = this.titleInput.getValue();
        const artist = this.artistInput.getValue();
        let renderedText = "";
        if (title) {
            renderedText += `Title: ${title}\n`;
        }
        if (artist) {
            renderedText += `Artist: ${artist}\n\n`;
        }
        renderedText += TabRenderer.renderAsText(this.tablature);
        console.log("Rendered tablature:", renderedText);
        pre.setText(renderedText);
    }

    private resetTablature = () => {
        this.tablature = new Tablature();
        this.renderTablature();
        new Notice("Tablature has been reset.");
    }

    private undoNote = () => {
        if (this.tablature.undoLastNote()) {
            this.renderTablature();
            new Notice("Last note removed.");
        } else {
            new Notice("No notes to remove.");
        }
    }

    private undoMeasure = () => {
        if (this.tablature.undoLastMeasure()) {
            this.renderTablature();
            new Notice("Last measure removed.");
        } else {
            new Notice("No measures to remove.");
        }
    }

    private async createNewNote(): Promise<TFile | null> {
        let newFileName = "Untitled";
        let fileNum = 0;
        let file: TFile;
    
        do {
            const fileName = fileNum === 0 ? `${newFileName}.md` : `${newFileName} ${fileNum}.md`;
            if (!this.app.vault.getAbstractFileByPath(fileName)) {
                file = await this.app.vault.create(fileName, "");
                break;
            }
            fileNum++;
        } while (fileNum < 1000);
    
        if (file) {
            const newLeaf = this.app.workspace.getLeaf('tab');
            await newLeaf.openFile(file);
            this.app.workspace.setActiveLeaf(newLeaf);
            return file;
        } else {
            new Notice("Failed to create a new note with a unique name");
            return null;
        }
    }

    private async addTemplate() {
        const templatePath = this.plugin.settings.templatePath;
        if (!templatePath) {
            new Notice("Template path not set. Please set it in the plugin settings.");
            return;
        }
    
        const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
        if (!(templateFile instanceof TFile)) {
            new Notice("Template file not found. Please check the path in the plugin settings.");
            return;
        }
    
        try {
            const templateContent = await this.app.vault.read(templateFile);
    
            // Try to get the active markdown view
            let activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    
            // If no active markdown view, create a new note
            if (!activeView) {
                const file = await this.createNewNote();
                if (file) {
                    activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                }
            }
    
            if (activeView) {
                const editor = activeView.editor;
                const cursor = editor.getCursor();
                editor.replaceRange(templateContent, cursor);
            } else {
                new Notice("Failed to add template. No active markdown view available.");
            }
        } catch (error) {
            console.error("Error reading template file:", error);
            new Notice("Error reading template file. Please check the console for details.");
        }
    }
}