import Cell from "./Cell.js"

export default class Network {
    static SERVER_TO_CLIENT = {
        UPDATE_NODES: 0x10,
        SPECTATE_CAMERA: 0x11,
        CLEAR_ALL: 0x12,
        CLEAR_OWNED_CELLS: 0x14,
        ON_NEW_OWNED_CELL: 0x20,
        LEADERBOARD_UPDATE: 0x31,
        BORDER: 0x40,
        CHAT_MESSAGE: 0x63,
        SERVER_STATS: 0xFE
    }

    static CLIENT_TO_SERVER = {
        SPAWN: 0x0,
        SPECTATE: 0x1,
        MOUSE: 0x10,
        SPLIT_PLAYER: 0x11,
        SPLIT_MINION: 0x16,
        EJECT_PLAYER: 0x15,
        EJECT_MINION: 0x17,
        CHAT: 0x63
    }

    constructor(core) {
        this.core = core

        this.onOpen = this.onOpen.bind(this)
        this.onMessage = this.onMessage.bind(this)
        this.onClose = this.onClose.bind(this)
        this.onError = this.onError.bind(this)

        this.minionControlled = false
        this.ping = 0
        this.leaderboardItems = []
        this.messages = []
        this.border = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            centerX: 0,
            centerY: 0,
            width: 0,
            height: 0
        }
    }

    connect(addr) {
        if (this.ws) this.reset()
        const ws = this.ws = new WebSocket(addr)
        ws.binaryType = "arraybuffer"
        ws.onopen = this.onOpen
        ws.onmessage = this.onMessage
        ws.onclose = this.onClose
        ws.onerror = this.onError
    }

    reset() {
        if (this.ws) this.ws.close()
        this.ws = null
        this.minionControlled = false
        this.ping = 0
        this.messages = []
        this.border = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            centerX: 0,
            centerY: 0,
            width: 0,
            height: 0
        }
        clearInterval(this.pingLoop)
        clearInterval(this.mouseMoveInterval)
        cancelAnimationFrame(this.core.app.hueShiftingRAF)
    }

    send(data) {
        if (!this.ws || this.ws.readyState !== 1) return
        if (data.build) this.ws.send(data.build())
        else this.ws.send(data)
    }

    onOpen() {
        this.send(new Uint8Array([254, 6, 0, 0, 0]))
        this.send(new Uint8Array([255, 1, 0, 0, 0]))

        this.mouseMoveInterval = setInterval(() => {
            this.sendMouseMove(
                (this.core.ui.mouse.x - innerWidth / 2) / this.core.app.camera.s + this.core.app.camera.x,
                (this.core.ui.mouse.y - innerHeight / 2) / this.core.app.camera.s + this.core.app.camera.y
            );
        }, 40);
    }

    onMessage({ data }) {
        this.now = Date.now()
        const reader = new Reader(new DataView(data), 0, true)
        const opcode = reader.getUint8()
        switch(opcode) {
            case Network.SERVER_TO_CLIENT.UPDATE_NODES : {
                this.onNodesUpdate(reader)
                break
            }
            case Network.SERVER_TO_CLIENT.ON_NEW_OWNED_CELL : {
                this.onNewOwnedCell(reader)
                break
            }
            case Network.SERVER_TO_CLIENT.CLEAR_OWNED_CELLS : {
                this.onClearOwnedCells()
                break
            }
            case Network.SERVER_TO_CLIENT.CLEAR_ALL : {
                this.onClearAll()
                break
            }
            case Network.SERVER_TO_CLIENT.BORDER : {
                this.onBorder(reader)
                break
            }
            case Network.SERVER_TO_CLIENT.SPECTATE_CAMERA : {
                this.onSpectateCamera(reader)
                break
            }
            case Network.SERVER_TO_CLIENT.SERVER_STATS: {
                this.ping = this.now - this.pingLoopTime
                break
            }
            case Network.SERVER_TO_CLIENT.LEADERBOARD_UPDATE:  {
                this.onLoaderboard(reader)
                break
            }
            case Network.SERVER_TO_CLIENT.CHAT_MESSAGE: {
                this.onChatMessage(reader)
            }
        }
    }

    onClose() {
        this.core.app.clear()
    }
    onError() {
        this.core.app.clear()
    }

    addCell(id, x, y, r, name, color, skin, flags) {
        let cellsByID = this.core.app.cellsByID
        let cells = this.core.app.cells

        let sprite = new PIXI.Sprite(this.core.app.textures.cell)
        sprite.anchor.set(.5)

        this.core.app.stage.addChild(sprite)

        const cell = new Cell(this.core, id, x, y, r, sprite, name, color, skin, flags);
        cellsByID.set(id, cell);
        cells.push(cell);
    }

    spawn() {
        const writer = new Writer(true)
        writer.setUint8(Network.CLIENT_TO_SERVER.SPAWN)
        writer.setStringUTF8(`<${this.core.store.skin}>` + this.core.store.name)
        this.send(writer)
    }

    spectate() {
        const writer = new Writer(true)
        writer.setUint8(Network.CLIENT_TO_SERVER.SPECTATE)
        this.send(writer)
    }

    sendMouseMove(x, y) {
        const writer = new Writer(true);
        writer.setUint8(Network.CLIENT_TO_SERVER.MOUSE);
        writer.setUint32(x);
        writer.setUint32(y);
        writer._b.push(0, 0, 0, 0);
        this.send(writer);
    }

    sendChatMessage(text) {
        const writer = new Writer()
        writer.setUint8(Network.CLIENT_TO_SERVER.CHAT)
        writer.setUint8(0)
        writer.setStringUTF8(text)
        this.send(writer)
    }
    
    onChatMessage(reader) {
        const flagMask = reader.getUint8();
        const color = {
            r: reader.getUint8(),
            g: reader.getUint8(),
            b: reader.getUint8()
        }
        const rawName = reader.getStringUTF8()
        const content = reader.getStringUTF8()
        const name = Cell.parseName(rawName).name || "Unnamed"

        const server = flagMask & 0x80 ? true : false
        const admin = flagMask & 0x40 ? true : false
        const mod = flagMask & 0x20 ? true : false

            this.messages.push({
                server, 
                admin,
                mod,
                color,
                name,
                content
            });
        this.core.ui.updateChat()
        this.core.ui.chatContent.scrollTop = 9000000
    }

    onSpectateCamera(reader) {
        this.core.app.camera.target.x = reader.getFloat32()
        this.core.app.camera.target.y = reader.getFloat32()
        this.core.app.camera.target.s = reader.getFloat32()
    }

    onLoaderboard(reader) {
        this.leaderboardItems = []
        const count = reader.getUint32()
        for (let i = 0; i < count; ++i) {
            const isMe = !!reader.getUint32()
            const name = reader.getStringUTF8()
            this.leaderboardItems.push({
                isMe,
                name: name || "Unnamed"
            })
        }
        this.core.ui.updateLeaderboard()
    }

    onBorder(reader) {
        this.border.left = reader.getFloat64()
        this.border.top = reader.getFloat64()
        this.border.right = reader.getFloat64()
        this.border.bottom = reader.getFloat64()
        this.border.width = this.border.right - this.border.left
        this.border.height = this.border.bottom - this.border.top
        this.border.centerX = (this.border.left + this.border.right) / 2
        this.border.centerY = (this.border.top + this.border.bottom) / 2
        /*if (reader._o.byteLength === 33) return
        const type = reader.getUint32();game type
        if (!/MultiOgar|OgarII/.test(reader.getStringUTF8())) return;
        const pingLoopId = setInterval(() => {
            this.send(new Uint8Array([254, 6, 0, 0, 0]))
            //stats.pingLoopStamp = Date.now();
        }, 2000);*/
        this.pingLoop = setInterval(() => {
            this.send(new Uint8Array([254]))
            this.pingLoopTime = Date.now()
        }, 2000);
        this.core.app.drawBackground()
        this.core.app.drawGrid()
        this.core.app.drawSectors()
        this.core.app.drawRainbowBorder()
        this.core.app.drawBorder()
    }

    sendSplit() {
        const writer = new Writer(true)
        writer.setUint8(this.minionControlled ? Network.CLIENT_TO_SERVER.SPLIT_MINION : Network.CLIENT_TO_SERVER.SPLIT_PLAYER)
        this.send(writer)
    }

    sendE() {
        const writer = new Writer(true)
        writer.setUint8(22)
        this.send(writer)
    }

    sendR() {
        const writer = new Writer(true)
        writer.setUint8(23)
        this.send(writer)
    }

    sendT() {
        const writer = new Writer(true)
        writer.setUint8(24)
        this.send(writer)
    }

    sendP() {
        const writer = new Writer(true)
        writer.setUint8(25)
        this.send(writer)
    }

    sendEject() {
        const writer = new Writer(true)
        writer.setUint8(this.minionControlled ? Network.CLIENT_TO_SERVER.EJECT_MINION : Network.CLIENT_TO_SERVER.EJECT_PLAYER)
        this.send(writer)
    }

    sendMinionSwitch() {
        const writer = new Writer(true)
        writer.setUint8(Network.CLIENT_TO_SERVER.MINION_SWITCH)
        this.minionControlled = !this.minionControlled
        this.send(writer)
    }

    onNewOwnedCell(reader) {
        this.core.app.ownedCells.push(reader.getUint32());
    }

    onClearOwnedCells() {
        this.core.app.ownedCells = []
    }

    onClearAll() {
        this.core.app.clear()
    }

    rgbToHex(arr) {
        let hex = ""

        for (const rawColor of arr) {
            const color = rawColor.toString(16)
            hex +=  color.length == 1 ? `0${color}` : color
        }

        return `0x${hex}`
    }

    onNodesUpdate(reader) {
        this.core.app.minimapEntity.position.set(((this.core.app.camera.x + this.border.width / 2) / this.border.width) * 250, ((this.core.app.camera.y + this.border.height / 2) / this.border.height) * 250)
        let cellsByID = this.core.app.cellsByID

        // consume records
        const addedCount = reader.getUint16();
        for (let i = 0; i < addedCount; i++) {
            const killer = reader.getUint32();
            const killed = reader.getUint32();
			if (!cellsByID.has(killer) || !cellsByID.has(killed)) continue;
            cellsByID.get(killed).destroy(killer);
        }

        while (true) {
            const id = reader.getUint32();
            if (id === 0) break;

            const x = reader.getInt32();
            const y = reader.getInt32();
            const r = reader.getUint16();

            const flagMask = reader.getUint8();
            const flags = {
                updColor: !!(flagMask & 0x02),
                updSkin: !!(flagMask & 0x04),
                updName: !!(flagMask & 0x08),
                jagged: !!(flagMask & 0x01) || !!(flagMask & 0x10),
                ejected: !!(flagMask & 0x20),
            };

            const color = flags.updColor ? this.rgbToHex([reader.getUint8(), reader.getUint8(), reader.getUint8()]) : null;

            const skin = flags.updSkin ? reader.getStringUTF8() : null;
            const name = flags.updName ? reader.getStringUTF8() : null;

            if (cellsByID.has(id)) {
                const cell = cellsByID.get(id);
                cell.update(this.now);
                cell.updated = this.now;
                cell.ox = cell.x;
                cell.oy = cell.y;
                cell.or = cell.r;
                cell.nx = x;
                cell.ny = y;
                cell.nr = r;
                if (color) cell.color = color;
                if (name) cell.name = name;
                if (skin) cell.skin = skin;
            } else this.addCell(id, x, y, r, name, color, skin, flags)
            
        }

        // dissapear records
        const removedCount = reader.getUint16();
        for (let i = 0; i < removedCount; i++) {
            const killed = reader.getUint32();
            if (cellsByID.has(killed) && !cellsByID.get(killed).destroyed)
                cellsByID.get(killed).destroy(null)
        }
    }
}

class Writer {
    constructor(littleEndian) {
        this.writer = true;
        this.tmpBuf = new DataView(new ArrayBuffer(8));
        this._e = littleEndian;
        this.reset();
        return this;
    }
    reset(littleEndian = this._e) {
        this._e = littleEndian;
        this._b = [];
        this._o = 0;
    }
    setUint8(a) {
        if (a >= 0 && a < 256) this._b.push(a);
        return this;
    }
    setInt8(a) {
        if (a >= -128 && a < 128) this._b.push(a);
        return this;
    }
    setUint16(a) {
        this.tmpBuf.setUint16(0, a, this._e);
        this._move(2);
        return this;
    }
    setInt16(a) {
        this.tmpBuf.setInt16(0, a, this._e);
        this._move(2);
        return this;
    }
    setUint32(a) {
        this.tmpBuf.setUint32(0, a, this._e);
        this._move(4);
        return this;
    }
    setInt32(a) {
        this.tmpBuf.setInt32(0, a, this._e);
        this._move(4);
        return this;
    }
    setFloat32(a) {
        this.tmpBuf.setFloat32(0, a, this._e);
        this._move(4);
        return this;
    }
    setFloat64(a) {
        this.tmpBuf.setFloat64(0, a, this._e);
        this._move(8);
        return this;
    }
    _move(b) {
        for (let i = 0; i < b; i++) this._b.push(this.tmpBuf.getUint8(i));
    }
    setStringUTF8(s) {
        const bytesStr = unescape(encodeURIComponent(s));
        for (let i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
        this._b.push(0);
        return this;
    }
    build() {
        return new Uint8Array(this._b);
    }
}

class Reader {
    constructor(view, offset, littleEndian) {
        this.reader = true;
        this._e = littleEndian;
        if (view) this.repurpose(view, offset);
    }
    repurpose(view, offset) {
        this.view = view;
        this._o = offset || 0;
    }
    getUint8() {
        return this.view.getUint8(this._o++, this._e);
    }
    getInt8() {
        return this.view.getInt8(this._o++, this._e);
    }
    getUint16() {
        return this.view.getUint16((this._o += 2) - 2, this._e);
    }
    getInt16() {
        return this.view.getInt16((this._o += 2) - 2, this._e);
    }
    getUint32() {
        return this.view.getUint32((this._o += 4) - 4, this._e);
    }
    getInt32() {
        return this.view.getInt32((this._o += 4) - 4, this._e);
    }
    getFloat32() {
        return this.view.getFloat32((this._o += 4) - 4, this._e);
    }
    getFloat64() {
        return this.view.getFloat64((this._o += 8) - 8, this._e);
    }
    getStringUTF8() {
        let s = '', b;
        while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);
        return decodeURIComponent(escape(s));
    }
}