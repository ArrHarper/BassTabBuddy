import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Note, Measure, Tablature } from './models';
import { BassTabBuddySettings, DEFAULT_SETTINGS } from './settings';
import { NoteInputModal } from './NoteInputModal';
import { TablatureView, VIEW_TYPE_TABLATURE } from './TablatureView';

export default class BassTabBuddy extends Plugin {
	settings: BassTabBuddySettings;
	private tablature: Tablature;
	private view: TablatureView;

	async onload() {
		console.log('LOADING PLUGIN');
		await this.loadSettings();
		
		this.tablature = new Tablature();
		this.registerView(
            VIEW_TYPE_TABLATURE,
            (leaf: WorkspaceLeaf) => (this.view = new TablatureView(leaf))
        );

        this.addRibbonIcon('list-music', 'Open Bass Tablature', () => {
            this.activateView();
			new Notice('The Low End Slappeth');
        });

		const note = new Note(1, 0, this.settings.defaultDuration);
        const measure = new Measure([note]);
        this.tablature.addMeasure(measure);

		this.addCommand({
            id: 'add-note',
            name: 'Add Note',
            callback: () => this.view.addNote()
        });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	addNote() {
        new NoteInputModal(this.app, (note: Note) => {
            console.log("Adding note:", note);
            this.tablature.addNote(note);
            console.log("Tablature after adding note:", this.tablature);
            this.view.setTablature(this.tablature);
        }).open();
    }

    undoLastNote() {
        if (this.tablature.undoLastNote()) {
            this.view.setTablature(this.tablature);
        }
    }

	async activateView() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_TABLATURE);

        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE_TABLATURE,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE_TABLATURE)[0]
        );
    }

	onunload() {
		console.log('UNLOADING PLUGIN');
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TABLATURE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: BassTabBuddy;

	constructor(app: App, plugin: BassTabBuddy) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
