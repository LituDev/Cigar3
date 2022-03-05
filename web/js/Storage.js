export default class {
    get settings() {
        let settings = localStorage.getItem("settings")
        try {
            JSON.parse(settings)
        } catch(e) {
            return false
        }
        return JSON.parse(settings)
    }

    set settings(settings) {
        localStorage.setItem("settings", JSON.stringify(settings))
    }

    get name() {
        return localStorage.getItem("name") || "Unnamed"
    }

    set name(name) {
        localStorage.setItem("name", name)
    }

    get skin() {
        return localStorage.getItem("skin") || ""
    }

    set skin(skin) {
        localStorage.setItem("skin", skin)
    }
}