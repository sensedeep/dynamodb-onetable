import {getValueFromTemplate} from "../src/utils.js";

const fieldsAndValues = [
    {field: 'accountId', expected: 'f51929e3-ea3f-4693-8480-99584adc07d8'},
    {field: 'companyId', expected: '621be599-a4ed-4664-b5c3-2c30a8fde47e'},
    {field: 'productId', expected: 'a82735a9-c088-42eb-93ec-dc14995a258c'},
    {field: 'batchId', expected: '6ebe3440-a11f-4bfb-9fed-6df83867723e'},
]

test.each(fieldsAndValues)('Get value from template', async ({field, expected}) => {
    const template = 'Account#${accountId}:Company#${companyId}:Product#${productId}:Batch#${batchId}'
    const value = 'Account#f51929e3-ea3f-4693-8480-99584adc07d8:Company#621be599-a4ed-4664-b5c3-2c30a8fde47e:Product#a82735a9-c088-42eb-93ec-dc14995a258c:Batch#6ebe3440-a11f-4bfb-9fed-6df83867723e'

    expect(getValueFromTemplate(template, value, field)).toEqual(expected)
})