export default class Cell {
    static NAME_CACHE = new Map()
    static SKIN_CACHE = new Object()
    static PENDING_SPRITES_SKIN_CACHE = new Map()
    static MASS_POOL = new Array()
    static SPRITE //pixi.sprite set later

    static parseName(value) {
        let [, skin, name] = /^(?:<([^}]*)>)?([^]*)/.exec(value || '');
        name = name.trim();
        return {
            name: name,
            skin: (skin || '').trim() || name,
        }
    }

    constructor(core, id, x, y, r, sprite, name, color, skin, flags) {
        this.core = core
        this.sprite = sprite
        this.id = id
        this.x = this.nx = this.ox = x
        this.y = this.ny = this.oy = y
        this.r = this.nr = this.or = r
        this._color = color
        this._skin = skin
        this._name = name
        this.flags = flags
        this.updated = Date.now()
        this.hasChanged = true
    }

    _getSkinTexture(skin) {
        if (Cell.SKIN_CACHE[skin] && Cell.SKIN_CACHE[skin].loading) {
                Cell.PENDING_SPRITES_SKIN_CACHE.get(skin).push(this.sprite)
                return this.core.app.textures.cell
        } else if (Cell.SKIN_CACHE[skin] && Cell.SKIN_CACHE[skin].loaded) return Cell.SKIN_CACHE[skin].texture

        Cell.PENDING_SPRITES_SKIN_CACHE.set(skin, [this.sprite])
        Cell.SKIN_CACHE[skin] = { texture: this.core.app.textures.cell, loading: true, loaded: false }
        PIXI.Texture.fromURL(skin).then(loadedTexture => {
            const graphics = new PIXI.Graphics()
            graphics.beginTextureFill({ texture: loadedTexture })
            graphics.drawCircle(256, 256, 256)
            graphics.endFill()
            Cell.SPRITE.addChild(graphics)
            const texture = this.core.app.renderer.generateTexture(Cell.SPRITE)
            Cell.SPRITE.removeChildren()
            texture.baseTexture.mipmap = true
            Cell.PENDING_SPRITES_SKIN_CACHE.get(skin).forEach(sprite => { sprite.texture = texture })
            Cell.PENDING_SPRITES_SKIN_CACHE.delete(skin)
            Cell.SKIN_CACHE[skin] = { texture, loading: false, loaded: true }
        })
        return this.core.app.textures.cell
    }

    _getNameTexture(name) {
        const texture = this.core.app.renderer.generateTexture(new PIXI.Text(name, {
            fontSize: 100,
            lineJoin: "round",
            fontFamily: "Nunito",
            fill: "white",
            stroke: "black",
            strokeThickness: 10
        }))
        texture.baseTexture.mipmap = true
        Cell.NAME_CACHE.set(name, texture)
        return texture
    }
    
    _getMassInstance() {
        const mass = Cell.MASS_POOL.shift()
        if (mass) return mass
        else return new PIXI.BitmapText("", {
            fontName: "Nunito"
        })
    }

    _setNameSprite(value) {
        let nameSprite;
        if (Cell.NAME_CACHE.has(value)) nameSprite = new PIXI.Sprite(Cell.NAME_CACHE.get(value))
        else nameSprite = new PIXI.Sprite(this._getNameTexture(value))

        if (this.nameSprite) this.nameSprite.destroy()
        
        nameSprite.anchor.set(.5)
        nameSprite.scale.set(1) 
        this.sprite.addChild(nameSprite)
        this.nameSprite = nameSprite
    }

    set name(value) {
        if (!this.hasChanged) return

        if (!this.core.settings.names && this.nameSprite) {
            this.nameSprite.destroy()
            this.nameSprite = null
        }
        else if (this.core.settings.names) this._setNameSprite(value)
        this._name = value
    }

    get name() {
        return this._name
    }

    set color(value) {
        if (!this.hasChanged) return
        this._color = value
        this.sprite.tint = value
    }

    get color() {
        return this._color
    }

    get mass() {
        return this._mass
    }

    set mass(value) {
        if (this.massSprite) this.massSprite.text = value
        this._mass = value
        if (!this.hasChanged) return
        if (this.massSprite && !this.core.settings.mass) {
            this.massSprite.destroy()
            this.massSprite = null
        } else if (this.name && !this.massSprite && this.core.settings.mass) {
            this.massSprite = this._getMassInstance()
            this.massSprite.anchor.set(.5, -1)
            this.sprite.addChild(this.massSprite)
        }
    }

    get skin() {
        return this._skin
    }

    set skin(value) {
        if (!this.hasChanged) return
        this._skin = value
        if (value && value !== "" && this.core.settings.skins) this._setSkin(value)
        else this.sprite.texture = this.flags.jagged ? this.core.app.textures.virus : this.core.app.textures.cell
    }

    _setSkin(value) {
        this.sprite.texture = this._getSkinTexture(value)
        this.sprite.tint = 0xffffff
    }

    update(time) {
        const delta = Math.max(Math.min((time - this.updated) / 200, 1), 0)

        if (this.hasChanged) {
            this.color = this.color
            this.mass = this.mass
            this.name = this.name
            this.skin = this.skin
            this.hasChanged = false
        }

        this.x = this.ox + (this.nx - this.ox) * delta
        this.y = this.oy + (this.ny - this.oy) * delta
        this.r = this.or + (this.nr - this.or) * delta

        this.mass = Math.round(this.r * this.r / 100)

        this.sprite.x = this.x
        this.sprite.y = this.y
        this.sprite.width = this.sprite.height = this.sprite.zIndex = this.r * 2
    }


    destroy(killerId) {
        this.core.app.cellsByID.delete(this.id);
        if (this.core.app.ownedCells.remove(this.id) && this.core.app.ownedCells.length === 0) this.core.ui.setPanelState(true)
        this.destroyed = true;
        this.dead = this.core.net.now;

        if (killerId && !this.diedBy) {
            this.diedBy = killerId;
            this.updated = this.core.net.now;
        }

        this.core.app.cells.remove(this)
        this.sprite.destroy({ children: true })
    }

}