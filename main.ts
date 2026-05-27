import { App, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';

// ------------------------------------------------------------
// 1. 插件设置
// ------------------------------------------------------------
interface TimerPluginSettings {
	durationMinutes: number;
	message: string;
	showStatusBar: boolean;
	floatingPosition: { x: number; y: number } | null;
}

const DEFAULT_SETTINGS: TimerPluginSettings = {
	durationMinutes: 20,
	message: '该喝水了！',
	showStatusBar: true,
	floatingPosition: null,
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
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
		
		// 终极修复 1：如果已经有悬浮窗存在，强制关闭它（防止“幽灵悬浮窗”）
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

	// 终极修复 2：使用 Pointer Event，全面支持鼠标、触摸屏手指、触控笔
	private onPointerMove = this._onPointerMove.bind(this);
	private onPointerUp = this._onPointerUp.bind(this);

	constructor(plugin: TimerPlugin) {
		this.plugin = plugin;
	}

	open() {
		this.close();

		// 终极修复 3：兼容性极强的文档获取方式 (防止旧版本 Obsidian 报错)
		// @ts-ignore
		this.currentDoc = window.activeDocument ?? document;
		// @ts-ignore
		this.currentWin = window.activeWindow ?? window;

		if (!this.currentDoc || !this.currentWin) return;

		// 1. 创建胶囊主容器
		this.windowEl = this.currentDoc.createElement('div');
		this.windowEl.addClass('timer-floating-window');
		this.currentDoc.body.appendChild(this.windowEl);

		// 2. 左侧按钮（开始/重复）
		const repeatBtn = this.windowEl.createEl('button', { cls: ['timer-btn', 'timer-btn-repeat'] });
		setIcon(repeatBtn, 'play');
		repeatBtn.addEventListener('click', () => {
			this.plugin.startTimer();
			this.close();
		});

		// 3. 中间提示文字
		const message = this.plugin.settings.message || '时间到！';
		this.windowEl.createDiv({ text: message, cls: 'timer-floating-window-text' });

		// 4. 右侧按钮（关闭）
		const closeBtn = this.windowEl.createEl('button', { cls: ['timer-btn', 'timer-btn-close'] });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => {
			this.close();
		});

		// 5. 初始化位置处理
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

		// 6. 注册拖拽监听 (使用 pointerdown 完美兼容所有设备)
		this.windowEl.addEventListener('pointerdown', (e) => {
			if ((e.target as Element).closest('.timer-btn')) return;

			this.isDragging = true;
			this.windowEl?.addClass('is-dragging');

			const rect = this.windowEl!.getBoundingClientRect();
			this.offsetX = e.clientX - rect.left;
			this.offsetY = e.clientY - rect.top;

			// 强制捕获指针（手指或鼠标哪怕滑出元素外也能保持拖拽不断开）
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
	}
}