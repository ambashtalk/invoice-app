import { FC } from 'react'
import { IconChevronLeft, IconClock, IconCopy, IconTrash } from '../Icons'

interface EditorHeaderProps {
    invoiceNo: string | null
    invoiceStatus: string
    isEditing: boolean
    isReadOnly: boolean
    saving: boolean
    onBack: () => void
    onDuplicate: () => void
    onDelete: () => void
    onPreview: () => void
    canDelete: boolean
}

export const EditorHeader: FC<EditorHeaderProps> = ({
    invoiceNo,
    invoiceStatus,
    isEditing,
    isReadOnly,
    saving,
    onBack,
    onDuplicate,
    onDelete,
    onPreview,
    canDelete
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={onBack} className="btn btn-ghost btn-icon" data-tooltip="Back">
                    <IconChevronLeft />
                </button>
                <div>
                    <h1 className="h1" style={{ margin: 0 }}>
                        {isEditing ? (invoiceNo || 'Loading...') : 'Create Invoice'}
                    </h1>
                    {isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span className={`badge badge-${invoiceStatus.toLowerCase()}`}>
                                {invoiceStatus}
                            </span>
                            {isReadOnly && (
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <IconClock /> Read Only
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                {isEditing && (
                    <>
                        <button onClick={onDuplicate} className="btn btn-secondary btn-icon" data-tooltip="Clone Invoice" data-tooltip-align="right">
                            <IconCopy />
                        </button>
                        {canDelete && (
                            <button onClick={onDelete} className="btn btn-secondary btn-icon" style={{ color: 'var(--color-error)' }} data-tooltip="Delete Draft" data-tooltip-align="right">
                                <IconTrash />
                            </button>
                        )}
                    </>
                )}
                {!isReadOnly && (
                    <button onClick={onPreview} className="btn btn-secondary" disabled={saving}>
                        Preview PDF
                    </button>
                )}
            </div>
        </div>
    )
}
