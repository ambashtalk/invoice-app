import { FC } from 'react'
import { BaseInput } from '../BaseInput'
import { BaseCheckbox } from '../BaseCheckbox'
import { IconTrash } from '../Icons'
import { LineItem } from './types'

interface EditorItemsTableProps {
    items: LineItem[]
    isReadOnly: boolean
    onUpdate: (items: LineItem[]) => void
}

export const EditorItemsTable: FC<EditorItemsTableProps> = ({
    items,
    isReadOnly,
    onUpdate
}) => {
    const handleAddItem = () => {
        onUpdate([...items, { slNo: items.length + 1, description: '', amount: 0, tax_rate: 0.18, show_sgst_cgst: true }])
    }

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, slNo: i + 1 }))
        onUpdate(newItems)
    }

    const handleItemChange = (index: number, updates: Partial<LineItem>) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], ...updates }
        onUpdate(newItems)
    }

    return (
        <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="h2" style={{ margin: 0 }}>Line Items</h2>
                {!isReadOnly && (
                    <button type="button" onClick={handleAddItem} className="btn btn-ghost btn-sm">
                        + Add Item
                    </button>
                )}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>No.</th>
                            <th>Description</th>
                            <th style={{ width: '150px' }}>Tax Details</th>
                            <th style={{ width: '150px' }}>Amount</th>
                            {!isReadOnly && <th style={{ width: '50px' }}></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td>{item.slNo}</td>
                                <td>
                                    <BaseInput
                                        placeholder="Item description..."
                                        value={item.description}
                                        onChange={(v) => handleItemChange(index, { description: v })}
                                        disabled={isReadOnly}
                                        noMargin
                                    />
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <BaseCheckbox
                                            label="Detailed Tax"
                                            checked={item.show_sgst_cgst}
                                            onChange={(v) => handleItemChange(index, { show_sgst_cgst: v })}
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <BaseInput
                                        type="number"
                                        placeholder="0.00"
                                        value={item.amount}
                                        onChange={(v) => handleItemChange(index, { amount: Number(v) })}
                                        disabled={isReadOnly}
                                        noMargin
                                    />
                                </td>
                                {!isReadOnly && (
                                    <td>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveItem(index)}
                                            className="btn btn-ghost btn-icon btn-sm"
                                            style={{ color: 'var(--color-error)' }}
                                            disabled={items.length <= 1}
                                        >
                                            <IconTrash />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
