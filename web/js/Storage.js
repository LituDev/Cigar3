export default class {
    get settings() {
        const defaultSettings = {
            skins: true,
            names: true,
            mass: true,
            background: true,
            rainbowBorder: true,
            border: true,
            grid: true,
            sectors: true
        }
        
        let settings = localStorage.getItem("cigar3-settings")
        let parsedSettings;
        try {
            parsedSettings = JSON.parse(settings)
        } catch(e) {
            return defaultSettings
        }
        if (!parsedSettings || Object.keys(parsedSettings).length !== Object.keys(defaultSettings).length) return defaultSettings
        return parsedSettings
    }

    set settings(settings) {
        localStorage.setItem("cigar3-settings", JSON.stringify(settings))
    }

    get name() {
        return localStorage.getItem("cigar3-name") || "Unnamed"
    }

    set name(name) {
        localStorage.setItem("cigar3-name", name)
    }

    get skin() {
        return localStorage.getItem("cigar3-skin") || ""
    }

    set skin(skin) {
        localStorage.setItem("cigar3-skin", skin)
    }
}