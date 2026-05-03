import { useState, useRef, useEffect } from 'react';
import { chatWithAgent } from '../lib/agent';
import { processFile } from '../lib/fileProcessor';
import { MessageCircle, Send, Bot, User, Loader, ChevronDown, Paperclip, X, FileText, Image } from 'lucide-react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hey! I\'m the PIBA Assistant 🏸 — here to help manage the club. I can:\n\n• **Create events** — "Create event tomorrow at Racing Club"\n• **Add members** — "Add member Jean-Pierre, paid 30€"\n• **Add players** — "Add Marie to today\'s event, paid to Vijay"\n• **List data** — "Show events" or "List members"\n• **Upload files** — CSV, PDF, or images\n\nWhat would you like to do?',
    },
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { type, fileName, content/dataUrl, preview }
  const [processingFile, setProcessingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be picked again

    setProcessingFile(true);
    try {
      const processed = await processFile(file);
      setAttachedFile(processed);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setProcessingFile(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || loading) return;

    // Build user message for display
    let displayContent = text;
    if (attachedFile) {
      displayContent = `${attachedFile.preview}${text ? '\n' + text : ''}`;
    }
    const userDisplayMsg = { role: 'user', content: displayContent };

    // Build user message for LLM history
    let historyContent;
    if (attachedFile?.type === 'text') {
      historyContent = `[File: ${attachedFile.fileName}]\n\n${attachedFile.content}${text ? '\n\nUser message: ' + text : ''}`;
    } else {
      historyContent = text;
    }

    const userHistoryMsg = { role: 'user', content: historyContent };

    setMessages((prev) => [...prev, userDisplayMsg]);
    const updatedHistory = [...history, userHistoryMsg];
    setHistory(updatedHistory);
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    try {
      const response = await chatWithAgent(updatedHistory);

      const assistantMsg = {
        role: 'assistant',
        content: response.content,
        actions: response.actionsPerformed,
        model: response.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev) => [...prev, { role: 'assistant', content: response.content }]);

      if (response.actionsPerformed?.length > 0) {
        window.dispatchEvent(new CustomEvent('shuttle-data-changed'));
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        setProcessingFile(true);
        try {
          const processed = await processFile(file);
          setAttachedFile(processed);
        } catch (err) {
          setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }]);
        } finally {
          setProcessingFile(false);
        }
        return;
      }
    }
  };

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Open assistant">
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="flex items-center gap-sm">
              <Bot size={18} />
              <span className="font-semibold">PIBA Assistant</span>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label="Minimize">
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-msg-avatar">
                  {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="chat-msg-content">
                  {msg.actions?.length > 0 && (
                    <div className="chat-action-badge">
                      ✓ {msg.actions.map((a) => a.replace(/_/g, ' ')).join(', ')}
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-msg-avatar"><Bot size={14} /></div>
                <div className="chat-msg-content chat-typing">
                  <Loader size={14} className="spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached file preview */}
          {attachedFile && (
            <div className="chat-file-preview">
              {attachedFile.type === 'image' ? <Image size={14} /> : <FileText size={14} />}
              <span className="chat-file-name">{attachedFile.fileName}</span>
              <button className="chat-file-remove" onClick={() => setAttachedFile(null)} aria-label="Remove file">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="chat-input-bar">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.pdf,image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || processingFile}
              aria-label="Attach file"
              title="Attach CSV, PDF, or image"
            >
              {processingFile ? <Loader size={16} className="spin" /> : <Paperclip size={16} />}
            </button>
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder={attachedFile ? 'Add a message or just send...' : 'e.g. "Add event tomorrow at UCPA"'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={loading || (!input.trim() && !attachedFile)}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatMessage(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}
