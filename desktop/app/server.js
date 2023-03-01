const localPort = 8816;

const electron = require("electron");
const localShortcut = require("electron-localshortcut");
const { app, BrowserWindow, screen, ipcMain } = electron;

const express = require("express");
const localExpress = express();
localExpress.listen(localPort, "localhost");

const path = require("path");
const ElectronStore = require("electron-store");

const store = new ElectronStore();

app.requestSingleInstanceLock();
app.name = "CryptoShare";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

app.on("ready", function() {
	const debugMode = false;

	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	let windowWidth = 1000;
	let windowHeight = 720;

	if(width > 1200 && height > 800) {
		windowWidth = 1160;
		windowHeight = 750;
	}

	if(debugMode) {
		windowWidth += 220;
	}

	const localWindow = new BrowserWindow({
		width: windowWidth,
		minWidth: 800,
		height: windowHeight,
		minHeight: 600,
		resizable: true,
		frame: false,
		transparent: false,
		x: 80,
		y: 80,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	// macOS apps behave differently than Windows when it comes to closing an application.
	if(process.platform === "darwin") {
		let quit = true;

		localShortcut.register(localWindow, "Command+Q", () => {
			quit = true;
			app.quit();
		});
	
		localShortcut.register(localWindow, "Command+W", () => {
			quit = false;
			app.hide();
		});

		localWindow.on("close", (event) => {
			if(!quit) {
				event.preventDefault();
				quit = true;
			}
		});
	}

	localExpress.set("views", path.join(__dirname, "views"));
	localExpress.set("view engine", "ejs");
	localExpress.use("/assets", express.static(path.join(__dirname, "assets")));

	localWindow.loadURL("http://127.0.0.1:" + localPort);

	if(debugMode) {
		localWindow.webContents.openDevTools();
	}

	localExpress.get("/", (req, res) => {
		res.render("index");
	});

	ipcMain.handle("getItem", (event, args) => {
		return store.get(args.key);
	});

	ipcMain.handle("getAll", (event, args) => {
		return { ...store.store };
	});

	ipcMain.handle("setItem", (event, args) => {
		store.set(args.key, args.value);
		return store.get(args.key);
	});

	ipcMain.handle("removeItem", (event, args) => {
		store.delete(args.key);
		return store.get(args.key);
	});

	ipcMain.on("set-window-state", (error, req) => {
		let state = req.toString();
		switch(state) {
			case "closed":
				(process.platform === "darwin") ? app.hide() : app.quit();
				break;
			case "minimized":
				localWindow.minimize();
				break;
			case "maximized":
				if(process.platform === "darwin") {
					localWindow.isFullScreen() ? localWindow.setFullScreen(false) : localWindow.setFullScreen(true);
				}
				else {
					localWindow.isMaximized() ? localWindow.restore() : localWindow.maximize();
				}
				
				break;		
		}
	});
});