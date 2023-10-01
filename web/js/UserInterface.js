import ModalSystem from "./ModalSystem.js"

export default class UserInterface {

    constructor(core) {
        this.core = core

        this.modalSystem = new ModalSystem()

        this.mouse = {
            x: 0,
            y: 0
        }

        this.keysPressed = {};
        this.ejectInterval = null;

        this.userInterface = document.getElementById("user-interface")
        this.playButton = document.getElementById("play")
        this.spectateButton = document.getElementById("spectate")
        this.settingsButton = document.getElementById("settings")
        this.skinButton = document.getElementById("skin")
        this.nameInput = document.getElementById("name")
        this.serversButton = document.getElementById("servers")
        this.scoreElement = document.getElementById("score")
        this.pingElement = document.getElementById("ping")
        this.leaderboard = document.getElementById("leaderboard")
        this.chatField = document.getElementById("chat-field")
        this.chatContent = document.getElementById("chat-content")
        this.minionControlled = document.getElementById("minion-controlled")

        setInterval(() => {
            this.scoreElement.innerHTML = `Score: ${this.core.app.camera.score}`
            this.pingElement.innerHTML = `Ping: ${this.core.net.ping}`
            this.minionControlled.style.display = this.core.net.minionControlled ? "block" : "none"
        }, 40)

        this.nameInput.value = this.core.store.name
        this.skinButton.style.backgroundImage = `url("${this.core.store.skin}")`

        this.addEvents()
    }

    addEvents() {
        this.onPlay = this.onPlay.bind(this)
        this.onSpectate = this.onSpectate.bind(this)
        this.onSettings = this.onSettings.bind(this)
        this.onSkin = this.onSkin.bind(this)
        this.onKeyDown = this.onKeyDown.bind(this)
        this.onNameChange = this.onNameChange.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onResize = this.onResize.bind(this)
        this.onScroll = this.onScroll.bind(this)
        this.onServers = this.onServers.bind(this)
        this.onKeyUp = this.onKeyUp.bind(this)

        this.playButton.addEventListener("click", this.onPlay)
        this.spectateButton.addEventListener("click", this.onSpectate)
        this.settingsButton.addEventListener("click", this.onSettings)
        this.serversButton.addEventListener("click", this.onServers)
        this.skinButton.addEventListener("click", this.onSkin)
        addEventListener("keydown", this.onKeyDown);
        addEventListener("keyup", this.onKeyUp);
        this.nameInput.addEventListener("change", this.onNameChange)
        this.core.app.view.addEventListener("mousemove", this.onMouseMove)
        this.core.app.view.addEventListener('wheel', this.onScroll, {
            passive: true
        })
        addEventListener("resize", this.onResize)
        addEventListener("beforeunload", (event) => {
            this.core.store.settings = this.core.settings.rawSettings
            event.cancelBubble = true
            event.returnValue = 'You sure you want to leave?'
            event.preventDefault()
        })
    }

    onPlay() {
        this.core.net.spawn()
        this.setPanelState(false)
    }

    onSpectate() {
        this.setPanelState(false)
        this.core.net.spectate()
    }

    onServers() {
        let contentStr = `<div class="modal-servers-content">`
        this.modalSystem.addModal(400, 500, "")
    }

    onSettings() {
        let contentStr = `<div class="modal-settings-content">`
        const settings = this.core.settings.rawSettings
        for (const setting in settings) {
            const inputValue = setting.replace(/[A-Z]/g, char => ' ' + char.toLowerCase())
            contentStr += `
            <div class="modal-settings-tile">
            ${inputValue}<input type="checkbox" id="setting-${setting}" ${settings[setting] ? "checked" : ""}>
            </div>
            `
        }
        contentStr += `</div>`
        this.modalSystem.addModal(200, null, contentStr)

        for (const setting in settings) {
            document.getElementById(`setting-${setting}`).addEventListener("click", () => {
                this.core.settings[setting] = !this.core.settings[setting]
            })
        }
    }

    updateLeaderboard() {
        let contentStr = ""
        const leaderboard = this.core.net.leaderboardItems
        for (const player of leaderboard) {
            contentStr += `<div class="hud-leaderboard-tile ${player.isMe ? "red-text" : ""}">${player.name}</div>`
        }
        this.leaderboard.innerHTML = ""
        this.leaderboard.insertAdjacentHTML('beforeend', contentStr)
    }

    updateChat() {
        let contentStr = ""
        for (const message of this.core.net.messages) {
            contentStr += `
            <div class="hud-message-tile">
                <span class="hud-message-item" style="color: rgb(${message.color.r}, ${message.color.g}, ${message.color.b})">
                    ${(message.server || message.admin || message.mod) ? (message.server ? "[SERVER]" : message.admin ? "[ADMIN]" : "[MOD]") : ""}${message.name}: <span class="hud-message">${message.content}</span>
                </span>
            </div>`
        }
        this.chatContent.innerHTML = ""
        this.chatContent.insertAdjacentHTML('beforeend', contentStr)
    }

    onServers() {
        let contentStr = `<div class="modal-servers-content">`
        for (const ip in this.core.app.servers) {
            contentStr += `
            <div class="modal-servers-tile">
                <div class="round">${this.core.app.servers[ip].name} - ${ip}</div>
                <div id="server-${ip}" class="button center">Connect</div>
            </div>
            `
        }
        contentStr += `</div>`
        const modalID = this.modalSystem.addModal(300, null, contentStr)

        for (const ip in this.core.app.servers) {
            document.getElementById(`server-${ip}`).addEventListener("click", () => {
                this.modalSystem.removeModal(modalID)
                this.core.net.connect(`ws${'https:' === window.location.protocol ? "s" : ""}://${ip}`)
            })
        }
    }

    onSkin() {
        let contentStr = `<div class="modal-skins-content">`
        const thirdSize = 500 / 3 - 30
        contentStr += `
        <div class="modal-skin-tile">
            <div class="round" style="width:${thirdSize}px; height:${thirdSize}px; background-color: var(--less-dark)" ></div>
            <div id="skin-remove" class="button center">Remove Skin</div>
        </div>
        `
        for (const id in this.core.app.skins) {
            contentStr += `
            <div class="modal-skin-tile">
                <div class="round" style="background-size: contain; background-repeat: no-repeat; background-color: var(--less-dark); width:${thirdSize}px; height:${thirdSize}px; background-image: url('${this.core.app.skins[id].src}')"></div>
                <div id="skin-${id}" class="button center">Use</div>
            </div>
            `
        }
        contentStr += `</div>`
        const modalId = this.modalSystem.addModal(500, 500, contentStr)

        for (const id in this.core.app.skins) {
            document.getElementById(`skin-${id}`).addEventListener("click", () => {
                this.modalSystem.removeModal(modalId)
                this.core.store.skin = this.core.app.skins[id].src
                document.getElementById("skin").style.backgroundImage = `url('${this.core.app.skins[id].src}')`
            })
        }

        document.getElementById("skin-remove").addEventListener("click", () => {
            this.modalSystem.removeModal(modalId)
            this.core.store.skin = ""
            document.getElementById("skin").style.backgroundImage = ""
        })
    }

    onMouseMove({
        clientX,
        clientY
    }) {
        this.mouse.x = clientX
        this.mouse.y = clientY
    }

    onScroll({
        deltaY
    }) {
        this.core.app.camera.w += deltaY * -.001 //event.deltaY * -1 / 1000;
        this.core.app.camera.w = Math.min(Math.max(.05, this.core.app.camera.w), 8)
    }

    onKeyDown({
        code
    }) {
        this.keysPressed[code] = true;

        switch (code) {
            case "Escape":
                this.setPanelState(true);
                break;
            case "KeyW":
                if (!this.ejectInterval) {
                    this.core.net.sendEject();
                    this.ejectInterval = setInterval(() => {
                        if (this.keysPressed["KeyW"]) this.core.net.sendEject();
                        else clearInterval(this.ejectInterval);
                    }, 50);
                }
                break;
            case "Space":
                this.core.net.sendSplit();
                break;
            case "KeyQ":
                this.core.net.sendMinionSwitch();
                break;
            case "Enter":
                if (document.activeElement === this.chatField) {
                    const value = this.chatField.value;
                    if (value !== "") this.core.net.sendChatMessage(value);
                    this.chatField.blur();
                    this.chatField.value = "";
                } else this.chatField.focus();
                break;
            case "KeyE":
                this.core.net.sendE();
                break;
            case "KeyR":
                this.core.net.sendR();
                break;
            case "KeyT":
                this.core.net.sendT();
                break;
            case "KeyP":
                this.core.net.sendP();
                break;
        }
    }

    onKeyUp({
        code
    }) {
        this.keysPressed[code] = false;

        if (code === "KeyW" && this.ejectInterval) {
            clearInterval(this.ejectInterval);
            this.ejectInterval = null;
        }
    }

    onResize() {
        this.core.app.renderer.resize(innerWidth, innerHeight)
    }

    setPanelState(show) {
        if (show) this.userInterface.style.display = "flex"
        else this.userInterface.style.display = "none"
    }

    onNameChange() {
        this.core.store.name = this.nameInput.value
    }
}