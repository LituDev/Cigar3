export default class {
    constructor() {
        this.modals = new Map()
        this.count = 0
    }

    refresh() {
        const container = document.getElementById("modals-container")
        container.style.display = "none"
        container.innerHTML = ""
        this.modals.forEach(modal => {
            container.style.display = "flex"
            const modalStr = `
            <div class="modal-background"></div>
            <div class="modal anim" style="width: ${modal.width}px; height: ${modal.height}px">
                <div class="modal-header">
                    <div id="${modal.id}-close" class="modal-close">&#10539;</div>
                </div>
                ${modal.content}
            </div>`
            container.insertAdjacentHTML('beforeend', modalStr)
            document.getElementById(`${modal.id}-close`).addEventListener("click", () => { this.removeModal(modal.id) })
        })
    }

    addModal(width, height, content) {
        this.modals.set(++this.count, { id: this.count, width, height, content })
        this.refresh()
        return this.count
    }

    removeModal(id) {
        this.modals.delete(id)
        this.refresh()
    }
}
