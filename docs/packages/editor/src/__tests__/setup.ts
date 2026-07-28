/** jsdom has no layout, and prosemirror measures the selection after every dispatch. */
Range.prototype.getClientRects = () => Object.assign([], { item: () => null })
Range.prototype.getBoundingClientRect = () => new DOMRect()
