export const getValueFromTemplate = (template, value, field) => {
    const regex = /\$\{[a-zA-Z1-9_]+}/gm
    const matches = template.match(regex)

    if (matches === null) {
        return null
    }

    const placeholder = `\${${field}}`
    const placeholderIndex = matches.indexOf(placeholder)

    if (placeholderIndex === -1) {
        return null
    }

    let templateSection = template
    if (placeholderIndex > 0) {
        const frontStart = templateSection.indexOf(matches[placeholderIndex - 1]) + matches[placeholderIndex - 1].length
        templateSection = templateSection.slice(frontStart)
    }

    if (placeholderIndex < matches.length - 1) {
        const endStart = templateSection.indexOf(matches[placeholderIndex + 1])
        templateSection = templateSection.slice(0, endStart)
    }

    const [startStr, endStr] = templateSection.split(placeholder)
    const startPlace = value.indexOf(startStr) + startStr.length

    if (!endStr) {
        return value.slice(startPlace)
    }

    return value.slice(startPlace, value.indexOf(endStr))
}
