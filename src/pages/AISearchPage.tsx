import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAISearch } from '@/hooks/useAISearch';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Send, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const EXAMPLE_QUERIES = [
  "What was my best day this month?",
  "When did I last go to the gym?",
  "How many steps did I walk last week?",
  "Show me days where I completed all habits",
  "What's my weight trend?",
  "When did I feel sick or had a bad day?",
];

export function AISearchPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { query: askAI, isLoading } = useAISearch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fadeInUp = prefersReducedMotion
    ? { initial: {}, animate: {} }
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
    };

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBack = () => {
    haptics.light();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    haptics.light();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await askAI(trimmedInput);

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      haptics.success();
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      haptics.error();
    }
  };

  const handleExampleClick = (example: string) => {
    haptics.selection();
    setInput(example);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-nav px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <motion.button
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={handleBack}
            className="h-10 w-10 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">AI Search</h1>
              <p className="text-[10px] text-muted-foreground">Ask anything about your journal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          {messages.length === 0 ? (
            <motion.div
              {...fadeInUp}
              transition={springTransition}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Ask me anything</h2>
              <p className="text-sm text-muted-foreground mb-6">
                I can help you search through your journal entries
              </p>

              {/* Example queries */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_QUERIES.slice(0, 4).map((example, i) => (
                    <motion.button
                      key={i}
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleExampleClick(example)}
                      className="text-xs px-3 py-2 rounded-full glass-card hover:bg-secondary/50 transition-colors text-left"
                    >
                      {example}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={springTransition}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "glass-card rounded-bl-md"
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground">AI</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="sticky bottom-0 glass-nav border-t px-4 py-3 pb-safe">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your journal..."
                disabled={isLoading}
                className="w-full h-12 px-4 pr-12 rounded-2xl glass-card border-0 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25"
                  : "glass-card text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
