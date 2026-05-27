import { App, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';

// ------------------------------------------------------------
// 1. 插件设置
// ------------------------------------------------------------
interface TimerPluginSettings {
	durationMinutes: number;
	message: string;
	showStatusBar: boolean;
	floatingPosition: { x: number; y: number } | null;
	darkBgColor: string;  // 新增：深色模式背景色
	lightBgColor: string; // 新增：浅色模式背景色
}

const DEFAULT_SETTINGS: TimerPluginSettings = {
	durationMinutes: 20,
	message: '该喝水了！',
	showStatusBar: true,
	floatingPosition: null,
	darkBgColor: '#F5F4F0', // 默认高反差深色模式背景 (对应原本 css 中的颜色)
	lightBgColor: '#424242', // 默认浅色模式背景
};

// ------------------------------------------------------------
// 2. 插件主类
// ------------------------------------------------------------
export default class TimerPlugin extends Plugin {
	settings: TimerPluginSettings;
	ribbonIconEl: HTMLElement;
	statusBarItemEl: HTMLElement;

	timerInterval: number | null = null;
	targetTime: number = 0; 
	timeLeft: number = 0;
	isRunning: boolean = false;

	floatingWindow: TimerFloatingWindow | null = null;

	async onload() {
		await this.loadSettings();

		// 初始化应用自定义颜色
		this.applyCustomStyles();

		// 侧边栏图标
		this.ribbonIconEl = this.addRibbonIcon('clock', '开启倒计时', (evt: MouseEvent) => {
			this.toggleTimer();
		});

		// 底部状态栏
		this.statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar();

		// 设置面板
		this.addSettingTab(new TimerSettingTab(this.app, this));
	}

	onunload() {
		this.stopTimer(); 
		if (this.floatingWindow) {
			this.floatingWindow.close();
		}
		// 插件卸载时移除自定义样式
		this.removeCustomStyles();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 新增：动态应用 CSS 样式，覆盖默认的主题变量
	applyCustomStyles() {
		let styleEl = document.getElementById('timer-custom-styles');
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'timer-custom-styles';
			document.head.appendChild(styleEl);
		}
		
		// 通过增加 body 选择器提高优先级，覆盖 styles.css 中的颜色设置
		styleEl.textContent = `
			body.theme-dark { --capsule-bg: ${this.settings.darkBgColor}; }
			body.theme-light { --capsule-bg: ${this.settings.lightBgColor}; }
		`;
	}

	removeCustomStyles() {
		const styleEl = document.getElementById('timer-custom-styles');
		if (styleEl) {
			styleEl.remove();
		}
	}

	toggleTimer() {
		if (this.isRunning) {
			this.stopTimer();
		} else {
			this.startTimer();
		}
	}

	startTimer() {
		this.isRunning = true;
		
		if (this.floatingWindow) {
			this.floatingWindow.close();
			this.floatingWindow = null;
		}
		
		const durationMs = this.settings.durationMinutes * 60 * 1000;
		this.targetTime = Date.now() + durationMs;
		this.timeLeft = Math.round(durationMs / 1000);

		setIcon(this.ribbonIconEl, 'stop-circle');
		this.ribbonIconEl.setAttribute('aria-label', '停止倒计时');

		if (this.timerInterval) {
			window.clearInterval(this.timerInterval);
		}

		this.timerInterval = window.setInterval(() => this.tick(), 1000);
		this.updateStatusBar();
	}

	stopTimer() {
		this.isRunning = false;
		if (this.timerInterval) {
			window.clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		setIcon(this.ribbonIconEl, 'clock');
		this.ribbonIconEl.setAttribute('aria-label', '开启倒计时');
		this.updateStatusBar();
	}

	tick() {
		const now = Date.now();
		this.timeLeft = Math.max(0, Math.round((this.targetTime - now) / 1000));
		
		this.updateStatusBar();

		if (this.timeLeft <= 0) {
			this.stopTimer();
			if (!this.floatingWindow) {
				this.floatingWindow = new TimerFloatingWindow(this);
			}
			this.floatingWindow.open();
		}
	}

	updateStatusBar() {
		if (!this.settings.showStatusBar || !this.isRunning) {
			this.statusBarItemEl.setText('');
			this.statusBarItemEl.style.display = 'none';
			return;
		}
		this.statusBarItemEl.style.display = 'inline-block';
		const minutes = Math.floor(this.timeLeft / 60);
		const seconds = this.timeLeft % 60;
		const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		this.statusBarItemEl.setText(`⏳ ${timeString}`);
	}
}

// ------------------------------------------------------------
// 3. 自定义可拖拽悬浮窗
// ------------------------------------------------------------
class TimerFloatingWindow {
	plugin: TimerPlugin;
	windowEl: HTMLElement | null = null;
	
	private currentDoc: Document | null = null;
	private currentWin: Window | null = null;

	private isDragging = false;
	private offsetX = 0;
	private offsetY = 0;

	private onPointerMove = this._onPointerMove.bind(this);
	private onPointerUp = this._onPointerUp.bind(this);

	constructor(plugin: TimerPlugin) {
		this.plugin = plugin;
	}

	open() {
		this.close();

		// @ts-ignore
		this.currentDoc = window.activeDocument ?? document;
		// @ts-ignore
		this.currentWin = window.activeWindow ?? window;

		if (!this.currentDoc || !this.currentWin) return;

		this.windowEl = this.currentDoc.createElement('div');
		this.windowEl.addClass('timer-floating-window');
		this.currentDoc.body.appendChild(this.windowEl);

		const repeatBtn = this.windowEl.createEl('button', { cls: ['timer-btn', 'timer-btn-repeat'] });
		setIcon(repeatBtn, 'play');
		repeatBtn.addEventListener('click', () => {
			this.plugin.startTimer();
			this.close();
		});

		const message = this.plugin.settings.message || '时间到！';
		this.windowEl.createDiv({ text: message, cls: 'timer-floating-window-text' });

		const closeBtn = this.windowEl.createEl('button', { cls: ['timer-btn', 'timer-btn-close'] });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => {
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
			this.windowEl.style.visibility = 'visible'; 
		}, 0);

		this.windowEl.addEventListener('pointerdown', (e) => {
			if ((e.target as Element).closest('.timer-btn')) return;

			this.isDragging = true;
			this.windowEl?.addClass('is-dragging');

			const rect = this.windowEl!.getBoundingClientRect();
			this.offsetX = e.clientX - rect.left;
			this.offsetY = e.clientY - rect.top;

			this.windowEl?.setPointerCapture(e.pointerId);

			this.currentDoc?.addEventListener('pointermove', this.onPointerMove);
			this.currentDoc?.addEventListener('pointerup', this.onPointerUp);
		});
	}

	private setPosition(x: number, y: number) {
		if (!this.windowEl || !this.currentWin) return;
		
		const rect = this.windowEl.getBoundingClientRect();
		const maxX = this.currentWin.innerWidth - rect.width;
		const maxY = this.currentWin.innerHeight - rect.height;

		const clampedX = Math.max(0, Math.min(x, maxX));
		const clampedY = Math.max(0, Math.min(y, maxY));

		this.windowEl.style.left = `${clampedX}px`;
		this.windowEl.style.top = `${clampedY}px`;
	}

	private _onPointerMove(e: PointerEvent) {
		if (!this.isDragging || !this.windowEl) return;
		
		const newX = e.clientX - this.offsetX;
		const newY = e.clientY - this.offsetY;
		
		this.setPosition(newX, newY);
	}

	private async _onPointerUp(e: PointerEvent) {
		if (this.isDragging) {
			this.isDragging = false;
			this.windowEl?.removeClass('is-dragging');
			this.windowEl?.releasePointerCapture(e.pointerId);

			this.currentDoc?.removeEventListener('pointermove', this.onPointerMove);
			this.currentDoc?.removeEventListener('pointerup', this.onPointerUp);

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
		
		this.currentDoc?.removeEventListener('pointermove', this.onPointerMove);
		this.currentDoc?.removeEventListener('pointerup', this.onPointerUp);
		
		this.currentDoc = null;
		this.currentWin = null;
	}
}

// ------------------------------------------------------------
// 4. 设置面板
// ------------------------------------------------------------
class TimerSettingTab extends PluginSettingTab {
	plugin: TimerPlugin;

	constructor(app: App, plugin: TimerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('倒计时时间 (分钟)')
			.setDesc('设置倒计时的时长，点击侧边栏图标将以此时间开始。')
			.addText(text => {
				text.setPlaceholder('如: 20');
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
				
				text.setValue(this.plugin.settings.durationMinutes.toString())
					.onChange(async (value) => {
						const parsed = Number(value);
						if (!isNaN(parsed) && parsed > 0) {
							this.plugin.settings.durationMinutes = parsed;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName('提示内容')
			.setDesc('倒计时结束时，悬浮窗中显示的文字。')
			.addText(text => text
				.setPlaceholder('如：该喝水了！')
				.setValue(this.plugin.settings.message)
				.onChange(async (value) => {
					this.plugin.settings.message = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('显示状态栏倒计时')
			.setDesc('开启后，会在软件底部状态栏实时显示剩余的倒计时时间。')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
				}));

		// ==================== 新增：背景颜色设置 ====================
		new Setting(containerEl)
			.setName('深色模式背景色')
			.setDesc('设置深色模式下胶囊悬浮窗的背景颜色。')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.darkBgColor)
				.onChange(async (value) => {
					this.plugin.settings.darkBgColor = value;
					await this.plugin.saveSettings();
					this.plugin.applyCustomStyles(); // 颜色变化后实时应用
				})
			);

		new Setting(containerEl)
			.setName('浅色模式背景色')
			.setDesc('设置浅色模式下胶囊悬浮窗的背景颜色。')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.lightBgColor)
				.onChange(async (value) => {
					this.plugin.settings.lightBgColor = value;
					await this.plugin.saveSettings();
					this.plugin.applyCustomStyles(); // 颜色变化后实时应用
				})
			);
	}
}