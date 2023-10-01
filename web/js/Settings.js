export default class {
    constructor(core) {
        this.core = core 
        this._settings = this.core.store.settings
    }

    get rawSettings() {
        return this._settings
    }

    get skins() {
        return this.rawSettings.skins 
    }

    set skins(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this.rawSettings.skins = value
    }

    get names() {
        return this.rawSettings.names 
    }

    set names(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this.rawSettings.names = value
    }

    get mass() {
        return this.rawSettings.mass
    }

    set mass(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this.rawSettings.mass = value
    }

    get mass() {
        return this.rawSettings.mass
    }

    set mass(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this.rawSettings.mass = value
    }

    get background() {
        return this.rawSettings.background
    }

    set background(value) {
        this.core.app.backgroundGraphics.visible = value
        this.rawSettings.background = value
    }

    get rainbowBorder() {
        return this.rawSettings.rainbowBorder
    }

    set rainbowBorder(value) {
        this.core.app.rainbowSprite.visible = value
        this.rawSettings.rainbowBorder = value
    }

    get border() {
        return this.rawSettings.border
    }

    set border(value) {
        this.core.app.borderGraphics.visible = value
        this.rawSettings.border = value
    }

    get grid() {
        return this.rawSettings.grid
    }

    set grid(value) {
        this.core.app.gridSprite.visible = value
        this.rawSettings.grid = value
    }

    get sectors() {
        return this.rawSettings.sectors
    }
    
    set sectors(value) {
        this.core.app.sectorContainer.visible = value
        this.rawSettings.sectors = value
    }
}
