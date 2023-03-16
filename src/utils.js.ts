export const getValueFromTemplate = (template, value, field) => {
    const regex = /\$\{[a-zA-Z1-9_]+}/gm
    const matches = template.match(regex)

    if (matches === null) {
        return undefined
    }

    const placeholder = `\${${field}}`
    const placeholderIndex = matches.indexOf(placeholder)

    if (placeholderIndex === -1) {
        return undefined
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

export const getValuesFromTemplate = (template, value) => {
    const regex = /\$\{[a-zA-Z1-9_]+}/gm
    const values = {}

    const matches = template.match(regex)
    if (matches === null) {
        return values
    }

    const numMatches = matches.length

    let remainingTemplate = template
    let remainingValue = value

    for (let placeholderIndex = 0; placeholderIndex < numMatches; placeholderIndex++) {
        const placeholder = matches[placeholderIndex]
        const field = placeholder.slice(2, -1)

        let placeholderSection = remainingTemplate
        const nextPlaceholder = matches[placeholderIndex + 1]
        if (nextPlaceholder !== undefined) {
            const nextIndex = placeholderSection.indexOf(nextPlaceholder)
            placeholderSection = placeholderSection.slice(0, nextIndex)
        }

        let placeholderValue = remainingValue
        const [startStr, endStr] = placeholderSection.split(placeholder)
        const startPlace = remainingValue.indexOf(startStr) + startStr.length

        if (startPlace > 0) {
            placeholderValue = remainingValue.slice(startPlace)
        }

        if (endStr.length > 0) {
            placeholderValue = placeholderValue.slice(0, placeholderValue.indexOf(endStr))
        }
        values[field] = placeholderValue

        remainingTemplate = remainingTemplate.slice(startStr.length + placeholder.length)
        remainingValue = remainingValue.slice(startPlace + placeholderValue.length)
    }

    return values
}