import { App, Modal, Setting } from "obsidian";
import type { Translator } from "../i18n";
import { localizeError } from "../i18n";
import { isPasswordLengthValid, MIN_PASSWORD_LENGTH } from "../security/password";
import type { PublicRelationship } from "../types";

export class SetupModal extends Modal {
  private password = "";
  private confirmation = "";

  constructor(
    app: App,
    private readonly t: Translator,
    private readonly submit: (password: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.t("modal.setupTitle"));
    this.contentEl.createEl("p", { text: this.t("modal.setupDesc") });
    new Setting(this.contentEl).setName(this.t("modal.password")).addText((text) => {
      text.inputEl.type = "password";
      text.onChange((value) => (this.password = value));
    });
    new Setting(this.contentEl).setName(this.t("modal.confirmPassword")).addText((text) => {
      text.inputEl.type = "password";
      text.onChange((value) => (this.confirmation = value));
    });
    const error = this.contentEl.createDiv({ cls: "cipherlink-form-error" });
    new Setting(this.contentEl).addButton((button) =>
      button
        .setButtonText(this.t("modal.createIdentity"))
        .setCta()
        .onClick(async () => {
          error.empty();
          if (!isPasswordLengthValid(this.password)) {
            error.setText(this.t("modal.passwordMin", { min: MIN_PASSWORD_LENGTH }));
            return;
          }
          if (this.password !== this.confirmation) {
            error.setText(this.t("modal.passwordMismatch"));
            return;
          }
          button.setDisabled(true);
          try {
            await this.submit(this.password);
            this.close();
          } catch (cause) {
            error.setText(localizeError(cause, this.t));
            button.setDisabled(false);
          }
        }),
    );
  }

  onClose(): void {
    this.password = "";
    this.confirmation = "";
    this.contentEl.empty();
  }
}

export class PasswordModal extends Modal {
  private password = "";
  private submitted = false;

  constructor(
    app: App,
    private readonly t: Translator,
    private readonly submit: (password: string) => Promise<void>,
    private readonly cancel?: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.t("modal.unlockTitle"));
    const error = this.contentEl.createDiv({ cls: "cipherlink-form-error" });
    let run: () => Promise<void>;
    new Setting(this.contentEl).setName(this.t("modal.password")).addText((text) => {
      text.inputEl.type = "password";
      text.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") void run();
      });
      text.onChange((value) => (this.password = value));
      text.inputEl.focus();
    });
    run = async (): Promise<void> => {
      error.empty();
      try {
        await this.submit(this.password);
        this.submitted = true;
        this.close();
      } catch (cause) {
        error.setText(localizeError(cause, this.t));
      }
    };
    new Setting(this.contentEl).addButton((button) =>
      button.setButtonText(this.t("modal.unlock")).setCta().onClick(run),
    );
  }

  onClose(): void {
    if (!this.submitted) this.cancel?.();
    this.password = "";
    this.contentEl.empty();
  }
}

export class ChangePasswordModal extends Modal {
  private currentPassword = "";
  private newPassword = "";
  private confirmation = "";

  constructor(
    app: App,
    private readonly t: Translator,
    private readonly submit: (currentPassword: string, newPassword: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.t("modal.changePasswordTitle"));
    this.passwordSetting(this.t("modal.currentPassword"), (value) => (this.currentPassword = value));
    this.passwordSetting(this.t("modal.newPassword"), (value) => (this.newPassword = value));
    this.passwordSetting(this.t("modal.confirmNewPassword"), (value) => (this.confirmation = value));
    const error = this.contentEl.createDiv({ cls: "cipherlink-form-error" });
    new Setting(this.contentEl).addButton((button) =>
      button.setButtonText(this.t("modal.changePassword")).setCta().onClick(async () => {
        error.empty();
        if (!isPasswordLengthValid(this.newPassword)) {
          error.setText(this.t("modal.passwordMin", { min: MIN_PASSWORD_LENGTH }));
          return;
        }
        if (this.newPassword !== this.confirmation) {
          error.setText(this.t("modal.newPasswordMismatch"));
          return;
        }
        try {
          await this.submit(this.currentPassword, this.newPassword);
          this.close();
        } catch (cause) {
          error.setText(localizeError(cause, this.t));
        }
      }),
    );
  }

  onClose(): void {
    this.currentPassword = "";
    this.newPassword = "";
    this.confirmation = "";
    this.contentEl.empty();
  }

  private passwordSetting(name: string, update: (value: string) => void): void {
    new Setting(this.contentEl).setName(name).addText((text) => {
      text.inputEl.type = "password";
      text.onChange(update);
    });
  }
}

export class ImportIdentityModal extends Modal {
  private path = "";
  private password = "";

  constructor(
    app: App,
    private readonly t: Translator,
    private readonly submit: (path: string, password: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.t("modal.importTitle"));
    this.contentEl.createEl("p", { text: this.t("modal.importDesc") });
    new Setting(this.contentEl)
      .setName(this.t("modal.packagePath"))
      .setDesc(this.t("modal.packagePathDesc"))
      .addText((text) => text.setValue(this.path).onChange((value) => (this.path = value)));
    new Setting(this.contentEl).setName(this.t("modal.currentPassword")).addText((text) => {
      text.inputEl.type = "password";
      text.onChange((value) => (this.password = value));
    });
    const error = this.contentEl.createDiv({ cls: "cipherlink-form-error" });
    new Setting(this.contentEl).addButton((button) =>
      button.setButtonText(this.t("modal.importIdentity")).setCta().onClick(async () => {
        error.empty();
        try {
          await this.submit(this.path.trim(), this.password);
          this.close();
        } catch (cause) {
          error.setText(localizeError(cause, this.t));
        }
      }),
    );
  }

  onClose(): void {
    this.password = "";
    this.contentEl.empty();
  }
}

export class PublicMetadataModal extends Modal {
  private aliases: string;
  private tags: string;
  private relationships: string;

  constructor(
    app: App,
    private readonly t: Translator,
    initial: { aliases: string[]; tags: string[]; relationships: PublicRelationship[] },
    private readonly submit: (
      aliases: string[],
      tags: string[],
      relationships: PublicRelationship[],
    ) => Promise<void>,
  ) {
    super(app);
    this.aliases = initial.aliases.join(", ");
    this.tags = initial.tags.join(", ");
    this.relationships = initial.relationships.map((item) => item.target).join("\n");
  }

  onOpen(): void {
    this.setTitle(this.t("modal.metadataTitle"));
    new Setting(this.contentEl).setName(this.t("modal.aliases")).addText((text) =>
      text.setValue(this.aliases).onChange((value) => (this.aliases = value)),
    );
    new Setting(this.contentEl).setName(this.t("modal.tags")).addText((text) =>
      text.setValue(this.tags).onChange((value) => (this.tags = value)),
    );
    new Setting(this.contentEl).setName(this.t("modal.relationships")).addTextArea((text) =>
      text.setValue(this.relationships).onChange((value) => (this.relationships = value)),
    );
    const error = this.contentEl.createDiv({ cls: "cipherlink-form-error" });
    new Setting(this.contentEl).addButton((button) =>
      button
        .setButtonText(this.t("modal.saveMetadata"))
        .setCta()
        .onClick(async () => {
          error.empty();
          try {
            await this.submit(
              splitComma(this.aliases),
              splitComma(this.tags).map((tag) => tag.replace(/^#/, "")),
              parseRelationshipInput(this.relationships),
            );
            this.close();
          } catch (cause) {
            error.setText(localizeError(cause, this.t));
          }
        }),
    );
  }
}

function splitComma(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((item) => item.trim()).filter(Boolean))];
}

function parseRelationshipInput(value: string): PublicRelationship[] {
  return [...new Set(value.split(/\r?\n|[,，]/).map((item) => item.trim()).filter(Boolean))].map(
    (item) => {
      const match = item.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
      if (!match) return { target: item };
      const relationship: PublicRelationship = { target: match[1]! };
      if (match[2]) relationship.label = match[2];
      return relationship;
    },
  );
}
