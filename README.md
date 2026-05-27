# Capsule Timer (极简悬浮胶囊倒计时)

> **💡 温馨提示 / Notice:**  
> 本插件专注于极简美学设计与高精准度的时间管理（如番茄钟、喝水提醒等）。建议在日常工作流中作为辅助工具使用，支持 Obsidian 的多窗口（Popout）环境。
> QQ交流群: 1094620986  

[English](#🇬🇧 English)

---

## 🇨🇳 简体中文

**Capsule Timer（极简悬浮胶囊倒计时）** 是一款为 Obsidian 用户量身定制的高颜值、无干扰悬浮倒计时插件。它在保持极简视觉美感的同时，提供了高精准度的计时逻辑，帮助您在专注写作或工作时轻松掌控节奏。

### 🌟 核心功能

#### 1. 极简高级感胶囊悬浮窗（自适应高反差设计）

- **毛玻璃与高颜值配色**：悬浮窗采用半透明毛玻璃质感（Backdrop Filter）。支持自适应 Obsidian 主题——深色模式下呈现温润的“奶咖胶囊”，浅色模式下呈现深邃的“暗色深灰胶囊”。
    
- **精细微交互**：按钮在悬浮时展现优雅的变色反馈，点击时带有微弹缩动画，完美融入极简桌面美学。
    

#### 2. 智能休眠校准（高精准防漂移）

- **真实时间戳校验**：不再单纯依赖不精确的秒数累减。插件在开始计时后会锁定“目标截止时间”。
    
- **无惧系统休眠**：即使中途合上笔记本电脑或系统进入休眠状态，重新唤醒后倒计时也会自动校验真实时间差。如果已超时，会立刻弹出提示，彻底解决了传统网页或插件在休眠后计时卡死的通病。
    

#### 3. 位置记忆与边缘越界防丢失机制

- **位置自动记忆**：您可以自由拖拽悬浮窗到屏幕任意位置。松开手后，插件会自动记录该坐标，下次倒计时结束时，悬浮窗会在相同的位置温和地呈现在您眼前。
    
- **边缘拦截（Clamping）**：采用严格的坐标约束算法，悬浮窗在拖动时绝不会被拖出屏幕外。即使调整了 Obsidian 的主窗口大小，悬浮窗也会在下次打开时自动调整，确保永远处于可见范围内。
    
- **完美多窗口（Popout）兼容**：全面支持 Obsidian 的多窗口标签页。无论您在主窗口还是分出来的副窗口触发倒计时，悬浮窗都会准确在当前的活动窗口挂载和渲染，不产生定位错乱。
    

#### 4. 全平台指点交互支持（Pointer Events）

- **支持触控与手写笔**：底层完全抛弃了局限的鼠标事件（Mouse Events），升级为通用的指针事件（Pointer Events）。无论是在电脑上使用鼠标，在 iPad 等平板上使用手指触摸，还是使用电磁笔，都能获得丝滑、稳定的拖拽交互体验。
    

#### 5. 纯净设计与内存安全（零后台残留）

- **生命周期主动释放**：插件在关闭时会主动释放所有的全局监听器并完全卸载相关的 DOM 节点。
    
- **定时器主动销毁**：采用手动生命周期控制，在卸载插件、停用或重新开始时均会彻底消灭并清空多余的后台定时器，不占用额外内存。
    

### ⚙️ 数据存储机制

倒计时时间、自定义提示文本以及保存的悬浮窗坐标等所有配置数据，均保存在 Obsidian 插件默认的本地 data.json 配置文件中。**无网络连接，完全离线运行**，支持任意多端同步方案。

### 📥 安装方法

#### 方法一：社区插件安装（推荐）

本插件通过官方审核上架后，您可以通过以下方式安装：

1. 打开 Obsidian **设置** > **社区插件** > **浏览**。
    
2. 搜索 **Capsule Timer**。
    
3. 点击 **安装**，随后选择 **启用**。
    

#### 方法二：手动安装

1. 前往本仓库的 Releases 页面，下载最新的 main.js、manifest.json 和 styles.css 文件。
    
2. 打开您的 Obsidian 库所在的本地文件夹。
    
3. 进入 .obsidian/plugins/ 目录，创建一个名为 capsule-timer（或您自定义的英文名）的新文件夹。
    
4. 将下载的三个文件放入该文件夹。
    
5. 在 Obsidian **设置** > **社区插件** 中刷新并启用该插件。
    

### 🛠️ 使用指南

1. **配置时间**：前往 Obsidian **设置** > **Capsule Timer**，设置您的倒计时时长（分钟）和到期提示语（例如：“该喝水了！”）。
    
2. **开启计时**：点击 Obsidian 左侧功能栏的 **钟表（Clock）** 图标，启动倒计时。此时底部的状态栏会实时显示倒计时进度。
    
3. **结束响应**：当时间归零时，界面将弹美观的胶囊悬浮窗：
    
    - 点击左侧的 **播放** 按钮可以快速重新开始一轮倒计时。
        
    - 点击右侧的 **X** 按钮或点击侧边栏图标即可将其关闭。
        
4. **位置拖拽**：鼠标点击或手指长按悬浮窗的中间文字区域，即可拖拽调整位置，松手即自动保存该坐标。
    

---

## 🇬🇧 English

**Capsule Timer** is a beautifully designed, distraction-free floating countdown timer plugin tailored for Obsidian users. Combining elegant minimalist aesthetics with solid, drift-free timing logic, it helps you manage your writing sprints, Pomodoro sessions, or hydration breaks effortlessly without breaking your flow.

### 🌟 Key Features

#### 1. Minimalist High-Contrast Capsule UI

- **Frosted Glass Aesthetic**: The floating window features a translucent glassmorphism design (backdrop-filter: blur). It automatically adapts to your Obsidian theme—displaying a warm "Milky Coffee" capsule in Dark Mode and a sleek "Slate Gray" capsule in Light Mode.
    
- **Micro-interactions**: Buttons respond with subtle color changes on hover and elastic scaling effects on click, blending into a highly polished, distraction-free writing setup.
    

#### 2. Smart Sleep-Proof Accuracy

- **Timestamp-Based Verification**: Unlike traditional timers that rely on simple interval countdowns that drift easily, Capsule Timer tracks the absolute "target end time" via system epoch timestamps.
    
- **Sleep & Hibernate Resilience**: If your computer goes to sleep or gets hibernated during a countdown, the plugin automatically recalculates the elapsed time upon waking. If the time has expired, it triggers immediately, completely bypassing the freeze issues common in basic web timers.
    

#### 3. Position Memory & Viewport Clamping

- **Auto Position-Saving**: Drag the capsule anywhere on your screen. The plugin automatically remembers your preferred coordinates and displays future countdown alerts at the exact same spot.
    
- **Edge Boundary Clamping**: A robust boundary calculation prevents the capsule from ever being dragged off-screen. If you resize your Obsidian window, the coordinates automatically adjust on the next trigger to ensure the capsule remains visible.
    
- **Multi-Window Compatibility**: Built to support Obsidian's multi-window workspace (Popout windows). The capsule accurately attaches to the active viewport you are currently working in, eliminating cross-window positioning glitches.
    

#### 4. Universal Pointer Interaction Support

- **Mobile & Touch Compatibility**: By replacing outdated mouse listeners with unified modern Pointer Events, the dragging interaction is fully compatible with touch screens (iPad, mobile) and styluses, as well as traditional desktop mice.
    

#### 5. Clean, Leak-Free Engineering

- **Complete Lifecycle Teardown**: When the window closes or the plugin is unloaded, all DOM nodes are removed and global document listeners are cleanly unsubscribed.
    
- **Active Timer Cleanup**: Background intervals are strictly managed and manually cleared when stopping, re-starting, or toggling, preventing silent background CPU consumption.
    

### ⚙️ Data Storage Mechanism

Your custom duration, notification message, status bar visibility, and saved capsule coordinates are stored locally inside the default Obsidian plugin data.json file. **The plugin operates completely offline** and supports multi-device synchronization out of the box.

### 📥 Installation

#### Method 1: Community Plugins (Recommended)

Once approved in the official directory, you can install it directly:

1. Open Obsidian **Settings** > **Community plugins** > **Browse**.
    
2. Search for **Capsule Timer**.
    
3. Click **Install**, then **Enable**.
    

#### Method 2: Manual Installation

1. Go to the Releases page of this repository and download main.js, manifest.json, and styles.css.
    
2. Open your local Obsidian vault directory.
    
3. Navigate to .obsidian/plugins/ and create a new directory named capsule-timer.
    
4. Copy the downloaded files into that folder.
    
5. Go to Obsidian **Settings** > **Community plugins**, reload, and enable the plugin.
    

### 🛠️ How to Use

1. **Configure**: Go to Obsidian **Settings** > **Capsule Timer** to configure your duration (minutes) and custom alert message (e.g., "Time to drink water!").
    
2. **Start Countdown**: Click the **Clock** ribbon icon in the left ribbon bar to start the timer. A live countdown will appear in the status bar at the bottom.
    
3. **Handle Alert**: When the time runs out, the capsule will appear on your screen:
    
    - Click the **Play** button on the left to quickly repeat/start a new timer session.
        
    - Click the **X** button on the right to dismiss the alert.
        
4. **Reposition**: Drag the capsule by holding/clicking the middle text area to place it anywhere you like. The position saves automatically when you release.