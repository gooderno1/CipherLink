import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type CipherLinkPlugin from "./main";
import type { LanguagePreference } from "./i18n";
import { localizeError } from "./i18n";

export class CipherLinkSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: CipherLinkPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.renderSettings();
  }

  private renderSettings(): void {
    const { containerEl } = this;
    const t = this.plugin.t;
    containerEl.empty();

    new Setting(containerEl).setName(t("settings.general")).setHeading();
    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("zh", t("settings.languageZh"))
          .addOption("en", t("settings.languageEn"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as LanguagePreference;
            await this.plugin.saveSettings();
            this.renderSettings();
          }),
      );

    if (!this.plugin.isInitialized) {
      new Setting(containerEl).setName(t("settings.getStarted")).setHeading();
      new Setting(containerEl)
        .setName(t("settings.notInitialized"))
        .setDesc(t("settings.notInitializedDesc"))
        .addButton((button) =>
          button.setButtonText(t("settings.setup")).setCta().onClick(() => this.plugin.openSetup()),
        )
        .addButton((button) =>
          button.setButtonText(t("settings.import")).onClick(() => this.plugin.openImportIdentity()),
        );
    }

    new Setting(containerEl).setName(t("settings.createSection")).setHeading();
    new Setting(containerEl)
      .setName(t("settings.create"))
      .setDesc(t("settings.createDesc"))
      .addButton((button) =>
        button.setButtonText(t("settings.create")).setCta().onClick(() => this.plugin.openCreateNote()),
      );

    new Setting(containerEl).setName(t("settings.standalone")).setHeading();
    new Setting(containerEl)
      .setName(t("settings.objectsFolder"))
      .setDesc(t("settings.objectsFolderDesc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.objectFolder).onChange(async (value) => {
          this.plugin.settings.objectFolder = value.trim();
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl).setName(t("settings.defaultStorage")).addDropdown((dropdown) =>
      dropdown
        .addOption("local", t("storage.local"))
        .addOption("gateway", t("storage.gateway"))
        .setValue(this.plugin.settings.defaultProvider)
        .onChange(async (value) => {
          this.plugin.settings.defaultProvider = value === "gateway" ? "gateway" : "local";
          await this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl)
      .setName(t("settings.gateway"))
      .setDesc(t("settings.gatewayDesc"))
      .setHeading();
    new Setting(containerEl)
      .setName(t("settings.gatewayUrl"))
      .setDesc(t("settings.gatewayUrlDesc"))
      .addText((text) =>
        text
          .setPlaceholder("https://gateway.example.com")
          .setValue(this.plugin.settings.gatewayUrl)
          .onChange(async (value) => {
            this.plugin.settings.gatewayUrl = value.trim();
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName(t("settings.gatewayRecipient"))
      .setDesc(t("settings.gatewayRecipientDesc"))
      .addText((text) => text.setValue(this.plugin.settings.gatewayRecipient).setDisabled(true));
    new Setting(containerEl)
      .setName(t("settings.gatewayConfig"))
      .setDesc(
        t("settings.gatewayConfigDesc", {
          protocol: this.plugin.settings.gatewayProtocolVersion || t("common.unknown"),
          epoch: this.plugin.settings.gatewayPrimaryEpoch || t("common.unknown"),
        }),
      )
      .addButton((button) =>
        button.setButtonText(t("settings.refresh")).onClick(async () => {
          try {
            await this.plugin.refreshGatewayConfiguration();
            this.renderSettings();
          } catch (cause) {
            new Notice(localizeError(cause, t));
          }
        }),
      );

    new Setting(containerEl).setName(t("settings.session")).setHeading();
    new Setting(containerEl)
      .setName(this.plugin.session.isUnlocked ? t("settings.unlocked") : t("settings.locked"))
      .setDesc(t("settings.sessionDesc"))
      .addButton((button) =>
        button
          .setButtonText(this.plugin.session.isUnlocked ? t("settings.lockNow") : t("settings.unlock"))
          .onClick(async () => {
            if (this.plugin.session.isUnlocked) await this.plugin.lock();
            else await this.plugin.unlock();
            this.renderSettings();
          }),
      );
    if (this.plugin.isInitialized) {
      new Setting(containerEl)
        .setName(t("settings.changePassword"))
        .addButton((button) =>
          button.setButtonText(t("settings.changePassword")).onClick(() => this.plugin.openChangePassword()),
        );
    }
  }
}
