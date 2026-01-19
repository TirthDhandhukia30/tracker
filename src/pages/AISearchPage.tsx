import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  SentIcon,
  Loading01Icon,
  TradeUpIcon,
  TradeDownIcon,
  MinusSignIcon,
  Calendar01Icon,
  BulbIcon,
  ArrowLeft01Icon,
  Tick01Icon
} from 'hugeicons-react';

interface Metric {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface Highlight {
  date: string;
  title: string;
  description: string;
}

interface AIResponse {
  summary: string;
  details?: string | null;
  metrics?: Metric[];
  highlights?: Highlight[];
  suggestion?: string | null;
  actionExecuted?: boolean;
  actionDate?: string;
  actionError?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AIResponse;
  timestamp: Date;
}

const EXAMPLE_QUERIES = [
  "Log 8000 steps for today",
  "I did a push session today",
  "What workout should I do?",
  "Show my gym activity this month",
  "Mark today's work as done",
];

export function AISearchPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBack = () => {
    haptics.light();
    navigate(-1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    haptics.light();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedInput }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response?.summary || 'No response',
        response: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      haptics.success();
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    haptics.selection();
    setInput(example);
    inputRef.current?.focus();
  };

  const handleDateClick = (dateStr: string) => {
    haptics.light();
    navigate(`/date/${dateStr}`);
  };

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === 'up') return <TradeUpIcon className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TradeDownIcon className="w-4 h-4 text-red-400" />;
    return <MinusSignIcon className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header - Apple style minimal */}
      <header className="sticky top-0 z-50 glass-nav px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <motion.button
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={handleBack}
            className="h-10 w-10 rounded-xl glass-card flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft01Icon className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Assistant</h1>
            <p className="text-[10px] text-muted-foreground">Ask or log anything</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="text-center py-16"
            >
              {/* Apple Intelligence-style rainbow icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-background to-secondary/50 border border-border/50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 via-blue-500 via-cyan-500 to-green-500 blur-xl" />
                </div>
                <svg className="w-10 h-10 relative z-10" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="url(#rainbow)" strokeWidth="1.5" />
                  <path d="M12 6v6l4 2" stroke="url(#rainbow)" strokeWidth="1.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="25%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="75%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">How can I help?</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
                Ask questions, log data, or get workout suggestions
              </p>

              {/* Example queries - pill style */}
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_QUERIES.map((example, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-colors border border-border/50"
                  >
                    {example}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springTransition}
                  className="space-y-3"
                >
                  {/* User message - minimal bubble */}
                  {message.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Response - Card based */}
                  {message.role === 'assistant' && message.response && (
                    <div className="space-y-3">
                      {/* Summary */}
                      <div className="glass-card rounded-2xl p-4">
                        <p className="text-sm leading-relaxed">{message.response.summary}</p>
                        {message.response.details && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {message.response.details}
                          </p>
                        )}
                      </div>

                      {/* Action Confirmation */}
                      {message.response.actionExecuted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Tick01Icon className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-400">Saved</p>
                            <p className="text-xs text-muted-foreground">
                              {message.response.actionDate && new Date(message.response.actionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {message.response.actionError && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <p className="text-sm text-red-400">{message.response.actionError}</p>
                        </div>
                      )}

                      {/* Metrics Grid */}
                      {message.response.metrics && message.response.metrics.length > 0 && (
                        <div className={cn(
                          "grid gap-2",
                          message.response.metrics.length === 1 ? "grid-cols-1" :
                            message.response.metrics.length === 2 ? "grid-cols-2" :
                              "grid-cols-2"
                        )}>
                          {message.response.metrics.map((metric, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="glass-card rounded-xl p-4"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  {metric.label}
                                </span>
                                <TrendIcon trend={metric.trend} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold tabular-nums">{metric.value}</span>
                                {metric.unit && (
                                  <span className="text-xs text-muted-foreground">{metric.unit}</span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Highlights - Tappable cards */}
                      {message.response.highlights && message.response.highlights.length > 0 && (
                        <div className="space-y-2">
                          {message.response.highlights.map((highlight, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              onClick={() => handleDateClick(highlight.date)}
                              className="w-full glass-card rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-secondary/80 transition-colors">
                                  <Calendar01Icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium truncate">{highlight.title}</p>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {new Date(highlight.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {highlight.description}
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}

                      {/* Suggestion */}
                      {message.response.suggestion && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50"
                        >
                          <BulbIcon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {message.response.suggestion}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Fallback text response */}
                  {message.role === 'assistant' && !message.response && (
                    <div className="glass-card rounded-2xl p-4">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading state */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Loading01Icon className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-3/4 bg-secondary/50 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-secondary/50 rounded animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input - Apple style minimal */}
      <div className="sticky bottom-0 glass-nav border-t px-4 py-3 pb-safe">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Log steps, ask questions, get suggestions..."
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-2xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 disabled:opacity-50 transition-all"
              />
            </div>
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loading01Icon className="w-5 h-5 animate-spin" />
              ) : (
                <SentIcon className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}

