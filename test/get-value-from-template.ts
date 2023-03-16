import {getValueFromTemplate, getValuesFromTemplate} from '../src/utils.js'

describe('getValueFromTemplate', () => {
    const fieldsAndValues = [
        {field: 'accountId', expected: 'f51929e3-ea3f-4693-8480-99584adc07d8'},
        {field: 'companyId', expected: '621be599-a4ed-4664-b5c3-2c30a8fde47e'},
        {field: 'productId', expected: 'a82735a9-c088-42eb-93ec-dc14995a258c'},
        {field: 'batchId', expected: '6ebe3440-a11f-4bfb-9fed-6df83867723e'},
    ]

    test.each(fieldsAndValues)('Get $field value from verbose template', async ({field, expected}) => {
        const template = 'Account#${accountId}:Company#${companyId}:Product#${productId}:Batch#${batchId}'
        const value = 'Account#f51929e3-ea3f-4693-8480-99584adc07d8:Company#621be599-a4ed-4664-b5c3-2c30a8fde47e:Product#a82735a9-c088-42eb-93ec-dc14995a258c:Batch#6ebe3440-a11f-4bfb-9fed-6df83867723e'

        expect(getValueFromTemplate(template, value, field)).toEqual(expected)
    })

    // test.each(fieldsAndValues)('Get $field value from simple template', async ({field, expected}) => {
    //     const template = '${accountId}#${companyId}#${productId}#${batchId}'
    //     const value = 'f51929e3-ea3f-4693-8480-99584adc07d8#621be599-a4ed-4664-b5c3-2c30a8fde47e#a82735a9-c088-42eb-93ec-dc14995a258c#6ebe3440-a11f-4bfb-9fed-6df83867723e'
    //
    //     expect(getValueFromTemplate(template, value, field)).toEqual(expected)
    // })

    test('Get undefined when template has no placeholders', () => {
        const template = 'Account#{accountId}:NoPlaceholder'
        const value = 'Account#{accountId}:NoPlaceholder'

        expect(getValueFromTemplate(template, value, 'accountId')).toBeUndefined()
    })

    test('Get undefined when field not found in template', () => {
        const template = 'Account#${accountId}:Company#${companyId}'
        const value = 'Account#f51929e3-ea3f-4693-8480-99584adc07d8:Company#621be599-a4ed-4664-b5c3-2c30a8fde47e'

        expect(getValueFromTemplate(template, value, 'productId')).toBeUndefined()
    })
})


describe('getValuesFromTemplate', () => {
    const testCases = [
        {
            template: 'Account#${accountId}:Company#${companyId}:Product#${productId}:Batch#${batchId}',
            value: 'Account#f51929e3-ea3f-4693-8480-99584adc07d8:Company#621be599-a4ed-4664-b5c3-2c30a8fde47e:Product#a82735a9-c088-42eb-93ec-dc14995a258c:Batch#6ebe3440-a11f-4bfb-9fed-6df83867723e',
            expected: {
                'accountId': 'f51929e3-ea3f-4693-8480-99584adc07d8',
                'companyId': '621be599-a4ed-4664-b5c3-2c30a8fde47e',
                'productId': 'a82735a9-c088-42eb-93ec-dc14995a258c',
                'batchId': '6ebe3440-a11f-4bfb-9fed-6df83867723e',
            }
        },
        {
            template: '${accountId}#${companyId}#${productId}#${batchId}',
            value: 'f51929e3-ea3f-4693-8480-99584adc07d8#621be599-a4ed-4664-b5c3-2c30a8fde47e#a82735a9-c088-42eb-93ec-dc14995a258c#6ebe3440-a11f-4bfb-9fed-6df83867723e',
            expected: {
                'accountId': 'f51929e3-ea3f-4693-8480-99584adc07d8',
                'companyId': '621be599-a4ed-4664-b5c3-2c30a8fde47e',
                'productId': 'a82735a9-c088-42eb-93ec-dc14995a258c',
                'batchId': '6ebe3440-a11f-4bfb-9fed-6df83867723e',
            }
        },
    ]

    test.each(testCases)('Get values from template', async ({template, value, expected}) => {
        expect(getValuesFromTemplate(template, value)).toEqual(expected)
    })

    test('Get no values when template has no placeholders', () => {
        const template = 'Account#{accountId}:NoPlaceholder'
        const value = 'Account#{accountId}:NoPlaceholder'

        expect(getValuesFromTemplate(template, value)).toEqual({})
    })
})