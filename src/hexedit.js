const _NON_PRINTABLE_CHAR = "\u00B7"

function _byteToChar(b) {
    // If the byte is not printable, use a dot instead
    return (b >= 32 && b <= 126) ? String.fromCharCode(b) : _NON_PRINTABLE_CHAR
}

/*
<div class="hexedit-column">
    <div class="offsets-header">Offset (h)</div>
    <div class="offsets"></div>
</div>
<div class="hexedit-column">
    <div class="hexview-header">
        <span>00</span><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span><span>09</span><span>0A</span><span>0B</span><span>0C</span><span>0D</span><span>0E</span><span>0F</span>
    </div>
    <div class="hexview"></div>
</div>
<div class="hexedit-column">
    <div class="textview-header">Decoded Text</div>
    <div class="textview"></div>
</div>
*/
function _fillHexeditDom(hexedit) {
    hexedit.classList.add("hexedit")
    hexedit.tabIndex = -1

    const offsets = document.createElement("div")
    offsets.classList.add("offsets")

    const offsetsHeader = document.createElement("div")
    offsetsHeader.classList.add("offsets-header")
    offsetsHeader.innerText = "Offset (h)"

    const offsetsColumn = document.createElement("div")
    offsetsColumn.classList.add("hexedit-column")
    offsetsColumn.appendChild(offsetsHeader)
    offsetsColumn.appendChild(offsets)

    const hexview = document.createElement("div")
    hexview.classList.add("hexview")

    const hexviewHeader = document.createElement("div")
    hexviewHeader.classList.add("hexview-header")
    for (let i = 0; i < 16; i++) {
        const span = document.createElement("span")
        span.innerText = i.toString(16).toUpperCase().padStart(2, "0")
        hexviewHeader.appendChild(span)
    }

    const hexviewColumn = document.createElement("div")
    hexviewColumn.classList.add("hexedit-column")
    hexviewColumn.appendChild(hexviewHeader)
    hexviewColumn.appendChild(hexview)

    const textview = document.createElement("div")
    textview.classList.add("textview")

    const textviewHeader = document.createElement("div")
    textviewHeader.classList.add("textview-header")
    textviewHeader.innerText = "Decoded Text"

    const textviewColumn = document.createElement("div")
    textviewColumn.classList.add("hexedit-column")
    textviewColumn.appendChild(textviewHeader)
    textviewColumn.appendChild(textview)

    hexedit.appendChild(offsetsColumn)
    hexedit.appendChild(hexviewColumn)
    hexedit.appendChild(textviewColumn)

    // Popup menu
    const popup = document.createElement("div")
    popup.classList.add("hexedit-popup")
    popup.style.display = "none"

    const popupHex = document.createElement("div")
    popupHex.classList.add("hexedit-popup-hex")

    const popupDec = document.createElement("div")
    popupDec.classList.add("hexedit-popup-dec")

    const popupText = document.createElement("div")
    popupText.classList.add("hexedit-popup-text")

    popup.append("Hex: ", popupHex, "Decimal: ", popupDec, "Text: ", popupText)

    hexedit.appendChild(popup)

    return hexedit;
}

function _eventFilterByteSpan(event, handler) {
    if (event.target.dataset.byteIndex == undefined) return
    return handler(event)
}

function _keyShouldApply(event) {
    if (event.key == "Enter") return 1
    if (event.key == "Tab") return 1
    if (event.key == "Backspace") return -1
    if (event.key == "ArrowLeft") return -1
    if (event.key == "ArrowRight") return 1
    if (event.key == "ArrowUp") return -16
    if (event.key == "ArrowDown") return 16
    return null
}

class HexEditor {
    constructor(hexeditDomObject) {
        this.hexedit = _fillHexeditDom(hexeditDomObject)
        this.offsets = this.hexedit.querySelector('.offsets')
        this.hexview = this.hexedit.querySelector('.hexview')
        this.textview = this.hexedit.querySelector('.textview')
        this.popup = this.hexedit.querySelector('.hexedit-popup')

        this.hexedit.hexedit = this

        this.readonly = false

        this.currentEdit = ""
        this.selectedIndex = null
        this.ctrlPressed = false

        // True if the user is currently editing a byte in hexview, 
        // false if they are editing a byte in textview
        this.editHex = true

        this._registerEventHandlers()

        this.data = new Uint8Array(255)
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = i
        }
    }

    setData(data) {
        this.data = data
        this.renderDom()
    }

    setValueAt(index, value) {
        this.data[index] = value
        this._renderValueAt(index, value)
    }

    renderDom() {
        // Render byte values as hex and text
        for (let i = 0; i < this.data.length; i++) {
            this._renderValueAt(i, this.data[i])
        }

        // Render offset column
        const offsetCount = Math.ceil(this.data.length / 16)
        if (offsetCount > this.offsets.children.length) {
            for (let i = this.offsets.children.length; i < offsetCount; i++) {
                const offset = document.createElement('span')
                offset.innerText = (i * 16).toString(16).padStart(8, '0')
                this.offsets.appendChild(offset)
            }
        } else if (offsetCount < this.offsets.children.length) {
            while (this.offsets.children.length > offsetCount) {
                this.offsets.removeChild(this.offsets.lastChild)
            }
        }

        // Trim extra fields from hexview and textview
        while (this.hexview.children.length > this.data.length) {
            this.hexview.removeChild(this.hexview.lastChild)
        }
        while (this.textview.children.length > this.data.length) {
            this.textview.removeChild(this.textview.lastChild)
        }
    }

    // Render a single byte value in the hexview and textview at the given index.
    // If a span exists for the given index, it is used directly, otherwise a new span is created.
    // The new span is always appended directly without filling in any missing spans.
    _renderValueAt(index, value) {
        const hex = value.toString(16).padStart(2, '0')
        let text = _byteToChar(value)
        // Replace space with a non-breaking space so that the textview doesn't collapse
        if (text == " ") text = "\u00A0"
        else if (text == "-") text = "\u2011"

        if (this.hexview.children.length > index) {
            this.hexview.children[index].textContent = hex
        } else {
            const span = document.createElement('span')
            span.textContent = hex
            span.dataset.byteIndex = index
            this.hexview.appendChild(span)
        }

        if (this.textview.children.length > index) {
            this.textview.children[index].textContent = text
        } else {
            const span = document.createElement('span')
            span.textContent = text
            span.dataset.byteIndex = index
            this.textview.appendChild(span)
        }

        if (text == _NON_PRINTABLE_CHAR) {
            this.textview.children[index].classList.add("non-printable")
        } else {
            this.textview.children[index].classList.remove("non-printable")
        }
    }

    _registerEventHandlers() {
        this.hexedit.addEventListener("mouseover", e => _eventFilterByteSpan(e, e => {
            const index = e.target.dataset.byteIndex
            this.textview.children[index].classList.add("hover")
            this.hexview.children[index].classList.add("hover")
        }))

        this.hexedit.addEventListener("mouseout", e => _eventFilterByteSpan(e, e => {
            const index = e.target.dataset.byteIndex
            this.textview.children[index].classList.remove("hover")
            this.hexview.children[index].classList.remove("hover")
        }))

        this.hexedit.addEventListener("click", e => _eventFilterByteSpan(e, e => {
            const index = e.target.dataset.byteIndex

            this.currentEdit = ""

            this.editHex = e.target.parentElement.classList.contains("hexview")
            this.setSelectedIndex(parseInt(index))
        }))

        this.hexedit.addEventListener("contextmenu", e => _eventFilterByteSpan(e, e => {
            e.preventDefault()

            // Show popup with hex, decimal, and ascii values
            const index = parseInt(e.target.dataset.byteIndex)
            const value = this.data[index]

            this.setSelectedIndex(index)

            this.popup.style.display = "grid"
            this.popup.style.left = e.pageX + "px"
            this.popup.style.top = e.pageY + "px"

            // Prevent popup from going off the right side of the screen
            const popupWidth = this.popup.getBoundingClientRect().width
            if (e.pageX + popupWidth + 10 > window.innerWidth) {
                this.popup.style.left = (window.innerWidth - popupWidth - 10) + "px"
            }
            // Prevent popup from going off the bottom of the screen
            const popupHeight = this.popup.getBoundingClientRect().height
            if (e.pageY + popupHeight + 10 > window.innerHeight) {
                this.popup.style.top = (window.innerHeight - popupHeight - 10) + "px"
            }

            this.popup.querySelector(".hexedit-popup-hex").textContent = value.toString(16).padStart(2, '0')
            this.popup.querySelector(".hexedit-popup-dec").textContent = value.toString(10)
            this.popup.querySelector(".hexedit-popup-text").textContent = _byteToChar(value)

            // Hide popup when user clicks outside of it
            const hidePopup = e => {
                if (!this.popup.contains(e.target)) {
                    this.popup.style.display = "none"
                    document.removeEventListener("click", hidePopup)
                }
            }
            document.addEventListener("click", hidePopup)

            // Hide popup when user presses escape
            const hidePopupOnEscape = e => {
                if (e.key == "Escape") {
                    this.popup.style.display = "none"
                    document.removeEventListener("keydown", hidePopupOnEscape)
                }
            }
            document.addEventListener("keydown", hidePopupOnEscape)


        }))

        this.hexedit.addEventListener("keydown", e => {
            if (e.key == "Control") this.ctrlPressed = true
            if (this.selectedIndex == null || this.ctrlPressed) return

            if (e.key == "Escape") {
                this.currentEdit = ""
                this.setSelectedIndex(null)
                return
            }

            if (this.readonly) {
                const offsetChange = _keyShouldApply(e) ?? 0
                this.setSelectedIndex(this.selectedIndex + offsetChange)
                return
            }

            // If editing in the textview and the key is a printable character, set the data value
            // To the character code of the key and move to the next byte
            if (!this.editHex) {
                if (e.key.length == 1) {
                    this.setValueAt(this.selectedIndex, e.key.charCodeAt(0))
                    this.setSelectedIndex(this.selectedIndex + 1)
                    if (e.key == "/") e.preventDefault()
                }
            }

            const key = e.key
            if (key == "Delete") {
                this.currentEdit = ""
                this.setValueAt(this.selectedIndex, 0)
            }

            if (this.editHex && key.length == 1 && key.match(/[0-9a-fA-F]/)) this.currentEdit += key
            if (this.currentEdit.length == 2 || _keyShouldApply(e)) {
                if (this.currentEdit.length != 0) {
                    const value = parseInt(this.currentEdit, 16)
                    this.setValueAt(this.selectedIndex, value)
                    this.currentEdit = ""
                }

                const offsetChange = _keyShouldApply(e) ?? 1
                this.setSelectedIndex(this.selectedIndex + offsetChange)
                e.preventDefault()

                if (key == "Backspace") {
                    this.setValueAt(this.selectedIndex, 0)
                }
            }
        })

        this.hexedit.addEventListener("keyup", e => {
            if (e.key == "Control") this.ctrlPressed = false
        })

        this.hexedit.addEventListener("paste", e => {
            e.preventDefault()

            if (this.editHex) {
                const data = e.clipboardData.getData("text/plain")
                    .replace(" ", "")
                    .replace("\n", "")
                    .replace("\r", "")
                    .replace("\t", "")

                if (data.match(/[^0-9a-fA-F]/)) return

                // Parse 2 characters at a time and add the decoded hex value to the data
                const bytes = []
                for (let i = 0; i < data.length; i += 2) {
                    const hex = data.substr(i, 2)
                    bytes.push(parseInt(hex, 16))
                }

                // Replace the selected bytes with the pasted bytes
                for (let i = 0; i < bytes.length && this.selectedIndex + i < this.data.length; i++) {
                    this.setValueAt(this.selectedIndex + i, bytes[i])
                }
                this.setSelectedIndex(this.selectedIndex + bytes.length, false)
            } else {
                const data = e.clipboardData.getData("text/plain")
                for (let i = 0; i < data.length && this.selectedIndex + i < this.data.length; i++) {
                    this.setValueAt(this.selectedIndex + i, data.charCodeAt(i))
                }
                this.setSelectedIndex(this.selectedIndex + data.length, false)
            }
        })
    }

    setSelectedIndex(index, wrap = true) {
        Array.from(this.hexedit.querySelectorAll(".selected, .selected-editing"))
            .forEach(e => e.classList.remove("selected", "selected-editing"))

        if (index === null) return

        if (wrap) index = (index + this.data.length) % this.data.length
        else index = Math.min(Math.max(index, 0), this.data.length - 1)

        this.selectedIndex = index

        this.textview.children[index].classList.add("selected")
        this.hexview.children[index].classList.add("selected")

        if (this.editHex) this.hexview.children[index].classList.add("selected-editing")
        else this.textview.children[index].classList.add("selected-editing")
    }

}
