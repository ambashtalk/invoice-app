import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { FC, useEffect } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    label?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null

    return (
        <div className="rte-toolbar">
            <div className="rte-group">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                    title="Bold"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                    title="Italic"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'is-active' : ''}
                    title="Underline"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>
                </button>
            </div>

            <div className="rte-divider" />

            <div className="rte-group">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                    title="Align Left"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="12" x2="3" y2="12"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                    title="Align Center"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="6"></line><line x1="21" y1="12" x2="3" y2="12"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                    title="Align Right"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
                    title="Justify"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="3" y2="12"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                </button>
            </div>

            <div className="rte-divider" />

            <div className="rte-group">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    title="Bullet List"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    title="Ordered List"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M4 18h2"></path><path d="M4 14a2 2 0 0 1 2 2"></path></svg>
                </button>
            </div>

            <div className="rte-divider" />

            <div className="rte-group">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                    disabled={!editor.can().sinkListItem('listItem')}
                    title="Indent"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 8 17 12 13 16"></polyline><line x1="3" y1="12" x2="17" y2="12"></line></svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                    disabled={!editor.can().liftListItem('listItem')}
                    title="Outdent"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 8 7 12 11 16"></polyline><line x1="21" y1="12" x2="7" y2="12"></line></svg>
                </button>
            </div>
        </div>
    )
}

export const RichTextEditor: FC<RichTextEditorProps> = ({ value, onChange, label }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // Keep it simple for emails
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'rte-content',
                style: 'min-height: 150px; cursor: text; outline: none;',
            },
        },
    })

    // Update content if value changes externally (e.g. template selection)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    return (
        <div className="form-group rte-container">
            {label && <label className="form-label">{label}</label>}
            <div className="rte-wrapper">
                <MenuBar editor={editor} />
                <EditorContent editor={editor} />
            </div>
            <style>{`
                .rte-wrapper {
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-bg-primary);
                    overflow: hidden;
                    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
                }
                .rte-wrapper:focus-within {
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }
                .rte-toolbar {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 8px;
                    background: var(--color-bg-secondary);
                    border-bottom: 1px solid var(--color-border);
                }
                .rte-group {
                    display: flex;
                    gap: 2px;
                }
                .rte-toolbar button {
                    background: transparent;
                    border: 1px solid transparent;
                    color: var(--color-text-primary);
                    padding: 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }
                .rte-toolbar button svg {
                    width: 16px;
                    height: 16px;
                }
                .rte-toolbar button:hover:not(:disabled) {
                    background: var(--color-bg-hover);
                }
                .rte-toolbar button.is-active {
                    background: var(--color-accent);
                    color: white;
                }
                .rte-toolbar button:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                .rte-divider {
                    width: 1px;
                    height: 20px;
                    background: var(--color-border);
                    margin: 0 4px;
                }
                .rte-content {
                    padding: 12px 16px;
                    color: var(--color-text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    line-height: 1.6;
                }
                .rte-content p {
                    margin-bottom: 8px;
                }
                .rte-content ul, .rte-content ol {
                    padding-left: 24px;
                    margin-bottom: 8px;
                }
                .rte-content li p {
                    margin-bottom: 0;
                }
                .rte-content a {
                    color: var(--color-accent);
                    text-decoration: underline;
                }
            `}</style>
        </div>
    )
}
