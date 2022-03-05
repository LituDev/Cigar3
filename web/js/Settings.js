export default class {
    constructor(core) {
        this.core = core
        const defaultSettings = {
            skins: true,
            names: true,
            mass: true
        }
        const settings = this.core.store.settings
        if (settings) this._settings = settings
        else this._settings = defaultSettings
    }

    get rawSettings() {
        return this._settings
    }

    get skins() {
        return this._settings.skins 
    }

    set skins(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this._settings.skins = value
    }

    get names() {
        return this._settings.names 
    }

    set names(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this._settings.names = value
    }

    get mass() {
        return this._settings.mass
    }

    set mass(value) {
        for (const cell of this.core.app.cells) cell.hasChanged = true
        this._settings.mass = value
    }
}