import { ItemView, WorkspaceLeaf, ButtonComponent, MarkdownView, TFile, Notice, TextComponent, Setting, setIcon } from 'obsidian';
import { Tablature, Note } from './models';
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
            .onClick(() => {
                this.undoMeasure();
            });

        new ButtonComponent(buttonEl)
            .setButtonText("<")
            .setTooltip("Undo Note")
            .onClick(() => {
                this.undoNote();
            });

        new ButtonComponent(buttonEl)
            .setButtonText("Add to Tab")
            .onClick(() => {
                const note = new Note(this.currentBassString, this.currentFret, this.currentDuration);
                this.tablature.addNote(note);
                this.renderTablature();
            });

        new ButtonComponent(buttonEl)
            .setButtonText("Save Tab")
            .onClick(() => {
                this.saveTab();
            });

        new ButtonComponent(buttonEl)
            .setButtonText("Reset")
            .onClick(() => {
                this.resetTablature();
            });

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
    
        new Setting(inputEl)
            .setName("Duration")
            .addButton(btn => {
                this.durationInput = btn;
                this.createSegmentedControl(btn, ['Whole', 'Half', 'Quarter', 'Eighth', 'Sixteenth'], 
                    (value) => {
                        const durationMap = {'Whole': 1, 'Half': 0.5, 'Quarter': 0.25, 'Eighth': 0.125, 'Sixteenth': 0.0625};
                        this.currentDuration = durationMap[value];
                    });
            });
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

    saveTab() {
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

    renderTablature() {
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
    
    setTablature(tablature: Tablature) {
        console.log("Setting new tablature:", tablature);
        this.tablature = tablature;
        this.renderTablature();
    }

    resetTablature() {
        this.tablature = new Tablature();
        this.renderTablature();
        new Notice("Tablature has been reset.");
    }
}