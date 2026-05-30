var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TimerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  durationMinutes: 20,
  message: "\u8BE5\u559D\u6C34\u4E86\uFF01",
  showStatusBar: true,
  floatingPosition: null,
  darkBgColor: "#F5F4F0",
  lightBgColor: "#424242",
  isRunning: false,
  savedTargetTime: null,
  savedTimeLeft: null,
  countMode: "real",
  autoStartOnLaunch: false
  // 默认关闭自启
};
var TimerPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.timerInterval = null;
    this.targetTime = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    // 用于应对“仅运行时模式”下电脑休眠带来的时间跳跃
    this.lastTickTime = 0;
    this.lastSaveTime = 0;
    this.floatingWindow = null;
  }
  async onload() {
    await this.loadSettings();
    this.applyCustomStyles();
    this.ribbonIconEl = this.addRibbonIcon("clock", "\u5F00\u542F\u5012\u8BA1\u65F6", (evt) => {
      this.toggleTimer();
    });
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar();
    this.addSettingTab(new TimerSettingTab(this.app, this));
    const hadPendingTask = this.settings.isRunning;
    this.resumeTimerIfRunning();
    if (this.settings.autoStartOnLaunch && !hadPendingTask) {
      this.startTimer();
    }
  }
  async onunload() {
    if (this.isRunning) {
      this.settings.savedTimeLeft = this.timeLeft;
      this.settings.savedTargetTime = this.targetTime;
      await this.saveData(this.settings);
    }
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
    }
    if (this.floatingWindow) {
      this.floatingWindow.close();
    }
    this.removeCustomStyles();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  applyCustomStyles() {
    let styleEl = document.getElementById("timer-custom-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "timer-custom-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
			body.theme-dark { --capsule-bg: ${this.settings.darkBgColor}; }
			body.theme-light { --capsule-bg: ${this.settings.lightBgColor}; }
		`;
  }
  removeCustomStyles() {
    const styleEl = document.getElementById("timer-custom-styles");
    if (styleEl) {
      styleEl.remove();
    }
  }
  // 核心：重启后恢复倒计时逻辑
  resumeTimerIfRunning() {
    if (!this.settings.isRunning) return;
    const now = Date.now();
    if (this.settings.countMode === "real") {
      if (this.settings.savedTargetTime) {
        if (now >= this.settings.savedTargetTime) {
          this.triggerAlarm();
          this.stopTimer();
        } else {
          this.targetTime = this.settings.savedTargetTime;
          this.timeLeft = Math.round((this.targetTime - now) / 1e3);
          this._startInterval();
        }
      }
    } else if (this.settings.countMode === "app") {
      if (this.settings.savedTimeLeft && this.settings.savedTimeLeft > 0) {
        this.timeLeft = this.settings.savedTimeLeft;
        this.targetTime = now + this.timeLeft * 1e3;
        this._startInterval();
      } else {
        this.triggerAlarm();
        this.stopTimer();
      }
    }
  }
  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }
  async startTimer() {
    if (this.floatingWindow) {
      this.floatingWindow.close();
      this.floatingWindow = null;
    }
    const durationMs = this.settings.durationMinutes * 60 * 1e3;
    this.targetTime = Date.now() + durationMs;
    this.timeLeft = Math.round(durationMs / 1e3);
    this.settings.isRunning = true;
    this.settings.savedTargetTime = this.targetTime;
    this.settings.savedTimeLeft = this.timeLeft;
    await this.saveSettings();
    this._startInterval();
  }
  _startInterval() {
    this.isRunning = true;
    this.lastTickTime = Date.now();
    this.lastSaveTime = Date.now();
    (0, import_obsidian.setIcon)(this.ribbonIconEl, "stop-circle");
    this.ribbonIconEl.setAttribute("aria-label", "\u505C\u6B62\u5012\u8BA1\u65F6");
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
    }
    this.timerInterval = window.setInterval(() => this.tick(), 1e3);
    this.updateStatusBar();
  }
  async stopTimer() {
    this.isRunning = false;
    this.settings.isRunning = false;
    this.settings.savedTargetTime = null;
    this.settings.savedTimeLeft = null;
    this.saveData(this.settings).catch((e) => console.error(e));
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    (0, import_obsidian.setIcon)(this.ribbonIconEl, "clock");
    this.ribbonIconEl.setAttribute("aria-label", "\u5F00\u542F\u5012\u8BA1\u65F6");
    this.updateStatusBar();
  }
  tick() {
    const now = Date.now();
    const delta = now - this.lastTickTime;
    this.lastTickTime = now;
    if (this.settings.countMode === "app" && delta > 2e3) {
      this.targetTime += delta - 1e3;
    }
    this.timeLeft = Math.max(0, Math.round((this.targetTime - now) / 1e3));
    this.updateStatusBar();
    if (this.timeLeft <= 0) {
      this.triggerAlarm();
      this.stopTimer();
      return;
    }
    if (now - this.lastSaveTime >= 1e4) {
      this.settings.savedTimeLeft = this.timeLeft;
      this.settings.savedTargetTime = this.targetTime;
      this.saveData(this.settings).catch((e) => console.error(e));
      this.lastSaveTime = now;
    }
  }
  triggerAlarm() {
    if (!this.floatingWindow) {
      this.floatingWindow = new TimerFloatingWindow(this);
    }
    this.floatingWindow.open();
  }
  updateStatusBar() {
    if (!this.settings.showStatusBar || !this.isRunning) {
      this.statusBarItemEl.setText("");
      this.statusBarItemEl.style.display = "none";
      return;
    }
    this.statusBarItemEl.style.display = "inline-block";
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    this.statusBarItemEl.setText(`\u23F3 ${timeString}`);
  }
};
var TimerFloatingWindow = class {
  constructor(plugin) {
    this.windowEl = null;
    this.currentDoc = null;
    this.currentWin = null;
    this.isDragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.onPointerMove = this._onPointerMove.bind(this);
    this.onPointerUp = this._onPointerUp.bind(this);
    this.plugin = plugin;
  }
  open() {
    this.close();
    this.currentDoc = window.activeDocument ?? document;
    this.currentWin = window.activeWindow ?? window;
    if (!this.currentDoc || !this.currentWin) return;
    this.windowEl = this.currentDoc.createElement("div");
    this.windowEl.addClass("timer-floating-window");
    this.currentDoc.body.appendChild(this.windowEl);
    const repeatBtn = this.windowEl.createEl("button", { cls: ["timer-btn", "timer-btn-repeat"] });
    (0, import_obsidian.setIcon)(repeatBtn, "play");
    repeatBtn.addEventListener("click", () => {
      this.plugin.startTimer();
      this.close();
    });
    const message = this.plugin.settings.message || "\u65F6\u95F4\u5230\uFF01";
    this.windowEl.createDiv({ text: message, cls: "timer-floating-window-text" });
    const closeBtn = this.windowEl.createEl("button", { cls: ["timer-btn", "timer-btn-close"] });
    (0, import_obsidian.setIcon)(closeBtn, "x");
    closeBtn.addEventListener("click", () => {
      this.close();
    });
    setTimeout(() => {
      if (!this.windowEl || !this.currentWin) return;
      const rect = this.windowEl.getBoundingClientRect();
      let targetX, targetY;
      if (this.plugin.settings.floatingPosition) {
        targetX = this.plugin.settings.floatingPosition.x;
        targetY = this.plugin.settings.floatingPosition.y;
      } else {
        targetX = (this.currentWin.innerWidth - rect.width) / 2;
        targetY = this.currentWin.innerHeight * 0.15;
      }
      this.setPosition(targetX, targetY);
      this.windowEl.style.visibility = "visible";
    }, 0);
    this.windowEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".timer-btn")) return;
      this.isDragging = true;
      this.windowEl?.addClass("is-dragging");
      const rect = this.windowEl.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
      this.windowEl?.setPointerCapture(e.pointerId);
      this.currentDoc?.addEventListener("pointermove", this.onPointerMove);
      this.currentDoc?.addEventListener("pointerup", this.onPointerUp);
    });
  }
  setPosition(x, y) {
    if (!this.windowEl || !this.currentWin) return;
    const rect = this.windowEl.getBoundingClientRect();
    const maxX = this.currentWin.innerWidth - rect.width;
    const maxY = this.currentWin.innerHeight - rect.height;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));
    this.windowEl.style.left = `${clampedX}px`;
    this.windowEl.style.top = `${clampedY}px`;
  }
  _onPointerMove(e) {
    if (!this.isDragging || !this.windowEl) return;
    const newX = e.clientX - this.offsetX;
    const newY = e.clientY - this.offsetY;
    this.setPosition(newX, newY);
  }
  async _onPointerUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.windowEl?.removeClass("is-dragging");
      this.windowEl?.releasePointerCapture(e.pointerId);
      this.currentDoc?.removeEventListener("pointermove", this.onPointerMove);
      this.currentDoc?.removeEventListener("pointerup", this.onPointerUp);
      if (this.windowEl) {
        const rect = this.windowEl.getBoundingClientRect();
        this.plugin.settings.floatingPosition = {
          x: rect.left,
          y: rect.top
        };
        await this.plugin.saveSettings();
      }
    }
  }
  close() {
    if (this.windowEl && this.windowEl.parentElement) {
      this.windowEl.parentElement.removeChild(this.windowEl);
      this.windowEl = null;
    }
    this.currentDoc?.removeEventListener("pointermove", this.onPointerMove);
    this.currentDoc?.removeEventListener("pointerup", this.onPointerUp);
    this.currentDoc = null;
    this.currentWin = null;
  }
};
var TimerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("\u5012\u8BA1\u65F6\u65F6\u95F4 (\u5206\u949F)").setDesc("\u8BBE\u7F6E\u5012\u8BA1\u65F6\u7684\u65F6\u957F\uFF0C\u70B9\u51FB\u4FA7\u8FB9\u680F\u56FE\u6807\u5C06\u4EE5\u6B64\u65F6\u95F4\u5F00\u59CB\u3002").addText((text) => {
      text.setPlaceholder("\u5982: 20");
      text.inputEl.type = "number";
      text.inputEl.min = "1";
      text.setValue(this.plugin.settings.durationMinutes.toString()).onChange(async (value) => {
        const parsed = Number(value);
        if (!isNaN(parsed) && parsed > 0) {
          this.plugin.settings.durationMinutes = parsed;
          await this.plugin.saveSettings();
        }
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u63D0\u793A\u5185\u5BB9").setDesc("\u5012\u8BA1\u65F6\u7ED3\u675F\u65F6\uFF0C\u60AC\u6D6E\u7A97\u4E2D\u663E\u793A\u7684\u6587\u5B57\u3002").addText((text) => text.setPlaceholder("\u5982\uFF1A\u8BE5\u559D\u6C34\u4E86\uFF01").setValue(this.plugin.settings.message).onChange(async (value) => {
      this.plugin.settings.message = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u5F00\u542F\u8F6F\u4EF6\u65F6\u81EA\u52A8\u542F\u52A8").setDesc("\u5F00\u542F\u540E\uFF0C\u6BCF\u6B21\u6253\u5F00 Obsidian \u65F6\uFF0C\u5982\u679C\u6CA1\u6709\u672A\u5B8C\u6210\u6216\u672A\u63D0\u9192\u7684\u5012\u8BA1\u65F6\u4EFB\u52A1\uFF0C\u5219\u4F1A\u81EA\u52A8\u5F00\u59CB\u65B0\u7684\u4E00\u8F6E\u5012\u8BA1\u65F6\u3002").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoStartOnLaunch).onChange(async (value) => {
        this.plugin.settings.autoStartOnLaunch = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u5012\u8BA1\u65F6\u6A21\u5F0F").setDesc("\u3010\u771F\u5B9E\u65F6\u95F4\u3011\uFF1A\u8F6F\u4EF6\u5173\u95ED\u6216\u7535\u8111\u4F11\u7720\u65F6\u65F6\u95F4\u7EE7\u7EED\u6D41\u901D\uFF1B\u3010\u4EC5\u8F6F\u4EF6\u8FD0\u884C\u3011\uFF1A\u5173\u95ED\u6216\u4F11\u7720\u65F6\u5012\u6570\u6682\u505C\uFF08\u9002\u5408\u9632\u7528\u773C\u8FC7\u5EA6\uFF09\u3002").addDropdown(
      (drop) => drop.addOption("real", "\u6309\u771F\u5B9E\u65F6\u95F4\u6D41\u901D (\u559D\u6C34/\u756A\u8304\u949F)").addOption("app", "\u4EC5\u8F6F\u4EF6\u8FD0\u884C\u65F6\u5012\u6570 (\u9632\u75B2\u52B3\u6C89\u6D78)").setValue(this.plugin.settings.countMode).onChange(async (value) => {
        this.plugin.settings.countMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u663E\u793A\u72B6\u6001\u680F\u5012\u8BA1\u65F6").setDesc("\u5F00\u542F\u540E\uFF0C\u4F1A\u5728\u8F6F\u4EF6\u5E95\u90E8\u72B6\u6001\u680F\u5B9E\u65F6\u663E\u793A\u5269\u4F59\u7684\u5012\u8BA1\u65F6\u65F6\u95F4\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
      this.plugin.settings.showStatusBar = value;
      await this.plugin.saveSettings();
      this.plugin.updateStatusBar();
    }));
    new import_obsidian.Setting(containerEl).setName("\u6DF1\u8272\u6A21\u5F0F\u80CC\u666F\u8272").setDesc("\u8BBE\u7F6E\u6DF1\u8272\u6A21\u5F0F\u4E0B\u80F6\u56CA\u60AC\u6D6E\u7A97\u7684\u80CC\u666F\u989C\u8272\u3002").addColorPicker(
      (color) => color.setValue(this.plugin.settings.darkBgColor).onChange(async (value) => {
        this.plugin.settings.darkBgColor = value;
        await this.plugin.saveSettings();
        this.plugin.applyCustomStyles();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u6D45\u8272\u6A21\u5F0F\u80CC\u666F\u8272").setDesc("\u8BBE\u7F6E\u6D45\u8272\u6A21\u5F0F\u4E0B\u80F6\u56CA\u60AC\u6D6E\u7A97\u7684\u80CC\u666F\u989C\u8272\u3002").addColorPicker(
      (color) => color.setValue(this.plugin.settings.lightBgColor).onChange(async (value) => {
        this.plugin.settings.lightBgColor = value;
        await this.plugin.saveSettings();
        this.plugin.applyCustomStyles();
      })
    );
  }
};
