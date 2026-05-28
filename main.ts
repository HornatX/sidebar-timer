import { App, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';

// ------------------------------------------------------------
// 1. 插件设置
// ------------------------------------------------------------
interface TimerPluginSettings {
	durationMinutes: number;
	message: string;
	showStatusBar: boolean;
	floatingPosition: { x: number; y: number } | null;
	darkBgColor: string;
	lightBgColor: string;
	
	// --- 新增：倒计时状态保存（支持重启恢复） ---
	isRunning: boolean;
	savedTargetTime: number | null; 
	savedTimeLeft: number | null;
	countMode: 'real' | 'app'; // real: 真实时间流逝, app: 仅软件运行时流逝
}

const DEFAULT_SETTINGS: TimerPluginSettings = {
	durationMinutes: 20,
	message: '该喝水了！',
	showStatusBar: true,
	floatingPosition: null,
	darkBgColor: '#F5F4F0',
	lightBgColor: '#424242',
	isRunning: false,
	savedTargetTime: null,
	savedTimeLeft: null,
	countMode: 'real', // 默认按真实时间
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

	// 用于应对“仅运行时模式”下电脑休眠带来的时间跳跃
	lastTickTime: number = 0;
	lastSaveTime: number = 0;

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

		// 初始化时恢复重启前的倒计时状态
		this.resumeTimerIfRunning();
	}

	async onunload() {
		// 卸载或关闭软件前，进行最后一次状态保存
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
		let styleEl = document.getElementById('timer-custom-styles');
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'timer-custom-styles';
			document.head.appendChild(styleEl);
		}
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

	// 核心：重启后恢复倒计时逻辑
	resumeTimerIfRunning() {
		if (!this.settings.isRunning) return;

		const now = Date.now();

		if (this.settings.countMode === 'real') {
			// 按真实时间流逝
			if (this.settings.savedTargetTime) {
				if (now >= this.settings.savedTargetTime) {
					// 期间已经超时了，立刻提醒
					this.triggerAlarm();
					this.stopTimer();
				} else {
					// 还没到时间，恢复并继续
					this.targetTime = this.settings.savedTargetTime;
					this.timeLeft = Math.round((this.targetTime - now) / 1000);
					this._startInterval();
				}
			}
		} else if (this.settings.countMode === 'app') {
			// 仅软件运行时流逝（关闭期间时间暂停）
			if (this.settings.savedTimeLeft && this.settings.savedTimeLeft > 0) {
				this.timeLeft = this.settings.savedTimeLeft;
				this.targetTime = now + this.timeLeft * 1000;
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
		
		const durationMs = this.settings.durationMinutes * 60 * 1000;
		this.targetTime = Date.now() + durationMs;
		this.timeLeft = Math.round(durationMs / 1000);

		// 保存运行状态
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

		setIcon(this.ribbonIconEl, 'stop-circle');
		this.ribbonIconEl.setAttribute('aria-label', '停止倒计时');

		if (this.timerInterval) {
			window.clearInterval(this.timerInterval);
		}

		this.timerInterval = window.setInterval(() => this.tick(), 1000);
		this.updateStatusBar();
	}

	async stopTimer() {
		this.isRunning = false;

		// 清理运行状态
		this.settings.isRunning = false;
		this.settings.savedTargetTime = null;
		this.settings.savedTimeLeft = null;
		this.saveData(this.settings).catch(e => console.error(e));

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
		const delta = now - this.lastTickTime;
		this.lastTickTime = now;

		// 如果是“仅软件开启时运行”模式，且检测到时间跳跃（超过 2 秒，可能是休眠或切换后台）
		if (this.settings.countMode === 'app' && delta > 2000) {
			// 将多出来的时间差补回到 targetTime，巧妙实现时间暂停效果
			this.targetTime += (delta - 1000);
		}

		this.timeLeft = Math.max(0, Math.round((this.targetTime - now) / 1000));
		this.updateStatusBar();

		if (this.timeLeft <= 0) {
			this.triggerAlarm();
			this.stopTimer();
			return;
		}

		// 定期自动保存状态(每 10 秒)，防止软件意外崩溃导致数据丢失
		if (now - this.lastSaveTime >= 10000) {
			this.settings.savedTimeLeft = this.timeLeft;
			this.settings.savedTargetTime = this.targetTime;
			this.saveData(this.settings).catch(e => console.error(e));
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
        
        // ==================== 新增：倒计时模式设置 ====================
		new Setting(containerEl)
			.setName('倒计时模式')
			.setDesc('【真实时间】：软件关闭或电脑休眠时时间继续流逝；【仅软件运行】：关闭或休眠时倒数暂停（适合防用眼过度）。')
			.addDropdown(drop => drop
				.addOption('real', '按真实时间流逝 (喝水/番茄钟)')
				.addOption('app', '仅软件运行时倒数 (防疲劳沉浸)')
				.setValue(this.plugin.settings.countMode)
				.onChange(async (value: 'real' | 'app') => {
					this.plugin.settings.countMode = value;
					await this.plugin.saveSettings();
				})
			);

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

		new Setting(containerEl)
			.setName('深色模式背景色')
			.setDesc('设置深色模式下胶囊悬浮窗的背景颜色。')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.darkBgColor)
				.onChange(async (value) => {
					this.plugin.settings.darkBgColor = value;
					await this.plugin.saveSettings();
					this.plugin.applyCustomStyles();
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
					this.plugin.applyCustomStyles();
				})
			);
	}
}