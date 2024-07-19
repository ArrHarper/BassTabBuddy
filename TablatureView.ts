import { ItemView, WorkspaceLeaf, ButtonComponent, MarkdownView, TFile, Notice, TextComponent, Setting, setIcon } from 'obsidian';
import { Tablature, Note, Measure } from './models';
import { TabRenderer } from './TabRenderer';

export const VIEW_TYPE_TABLATURE = "tablature-view";

export class TablatureView extends ItemView {
    private tablature: Tablature;
    private contentEl: HTMLElement;
    private tabEl: HTMLElement;
    private titleInput: TextComponent;
    private artistInput: TextComponent;
    private bassStringInput: ButtonComponent;
    private fretInput: ButtonComponent;
    private durationInput: ButtonComponent;
    private currentBassString: number = 1; // E string
    private currentFret: number = 0;
    private currentDuration: number = 0.25; // Quarter note

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
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
        setIcon(iconEl, "disc-3");

        // Add Title and Artist input fields
        const metadataEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-metadata' });
        new Setting(metadataEl)
            .setName("Title")
            .addText(text => {
                this.titleInput = text;
                text.onChange(() => this.renderTablature());
            });
        new Setting(metadataEl)
            .setName("Artist")
            .addText(text => {
                this.artistInput = text;
                text.onChange(() => this.renderTablature());
            });

        this.renderNoteInputControls();

        const buttonEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-controls' });

        new ButtonComponent(buttonEl)
            .setButtonText("|<")
            .setTooltip("Undo Measure")
            .onClick(() => this.undoMeasure());

        new ButtonComponent(buttonEl)
            .setButtonText("<")
            .setTooltip("Undo Note")
            .onClick(() => this.undoNote());

        new ButtonComponent(buttonEl)
            .setButtonText("Save Tab")
            .onClick(() => this.saveTab());

        new ButtonComponent(buttonEl)
            .setButtonText("Reset")
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
    
        const noteValueSetting = new Setting(inputEl).setName("Note Value");
    
        const addNoteValueButtons = (duration: number, name: string) => {
            noteValueSetting.addButton(btn => 
                btn.setButtonText(name).onClick(() => this.addNoteValue(duration))
            );
            noteValueSetting.addButton(btn => 
                btn.setButtonText("Rest").onClick(() => this.addRestValue(duration))
            );
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
        } else {
            new Notice(`Added note: String ${string}, Fret ${fret}, Duration ${duration}`);
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

    private saveTab = () => {
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

        // Get all open MarkdownView instances
        const markdownViews = this.app.workspace.getLeavesOfType('markdown');

        if (markdownViews.length > 0) {
            // Use the first open MarkdownView
            const view = markdownViews[0].view as MarkdownView;
            const editor = view.editor;
            const cursor = editor.getCursor();
            editor.replaceRange(tabContent, cursor);
            new Notice("Tablature saved to note!");
        } else {
            // If no markdown file is open, create a new one
            const fileName = title ? `${title} Bass Tab` : "Bass Tab";
            this.app.vault.create(`${fileName} ${new Date().toLocaleString()}.md`, tabContent)
                .then((file: TFile) => {
                    this.app.workspace.getLeaf().openFile(file);
                    new Notice("Tablature saved to new note!");
                })
                .catch((error) => {
                    console.error("Error creating new file:", error);
                    new Notice("Error saving tablature. Check console for details.");
                });
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
    
    private setTablature = (tablature: Tablature) => {
        console.log("Setting new tablature:", tablature);
        this.tablature = tablature;
        this.renderTablature();
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
}