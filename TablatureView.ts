import { ItemView, WorkspaceLeaf, ButtonComponent, MarkdownView, TFile, Notice, TextComponent, request } from 'obsidian';
import { Tablature, Note } from './models';
import { TabRenderer } from './TabRenderer';
import { NoteInputModal } from './NoteInputModal';

export const VIEW_TYPE_TABLATURE = "tablature-view";

export class TablatureView extends ItemView {
    private tablature: Tablature;
    private contentEl: HTMLElement;
    private tabEl: HTMLElement;
    private titleInput: TextComponent;
    private artistInput: TextComponent;

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

        this.contentEl.createEl("h1", { text: "Bass Tab Buddy" });
        

        // Add Title and Artist input fields
        const metadataEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-metadata' });
        this.titleInput = new TextComponent(metadataEl)
            .setPlaceholder("Title")
            .onChange(() => this.renderTablature());
        this.artistInput = new TextComponent(metadataEl)
            .setPlaceholder("Artist")
            .onChange(() => this.renderTablature());

        const buttonEl = this.contentEl.createDiv({ cls: 'bass-tab-buddy-controls' });
        new ButtonComponent(buttonEl)
            .setButtonText("Add to Tab")
            .onClick(() => {
                this.addNote();
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

    addNote() {
        new NoteInputModal(this.app, 
            (note: Note) => {
                this.tablature.addNote(note);
                this.renderTablature();
            },
            () => {
                if (this.tablature.undoLastNote()) {
                    this.renderTablature();
                }
            }
        ).open();
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