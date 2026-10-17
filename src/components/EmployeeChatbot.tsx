import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  HelpCircle,
  Lightbulb,
  FileText,
  DollarSign,
  Calendar,
  Shield,
  Phone,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Separator } from './ui/separator';
import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
}

interface SuggestedQuestion {
  id: string;
  text: string;
  category: string;
  icon: any;
}

const suggestedQuestions: SuggestedQuestion[] = [
  {
    id: 'paycheck',
    text: 'When will I receive my last paycheck?',
    category: 'Exit Process',
    icon: DollarSign
  },
  {
    id: 'benefits',
    text: 'What happens to my health insurance?',
    category: 'Benefits',
    icon: Shield
  },
  {
    id: 'pto',
    text: 'Will I be paid for unused vacation days?',
    category: 'Benefits',
    icon: Calendar
  },
  {
    id: 'equipment',
    text: 'When do I need to return company equipment?',
    category: 'Exit Process',
    icon: FileText
  },
  {
    id: 'cobra',
    text: 'How do I sign up for COBRA coverage?',
    category: 'Benefits',
    icon: Shield
  },
  {
    id: 'reference',
    text: 'Can I get a reference letter?',
    category: 'General',
    icon: FileText
  },
  {
    id: 'contact',
    text: 'Who should I contact for questions?',
    category: 'General',
    icon: Phone
  },
  {
    id: 'documents',
    text: 'What documents will I receive?',
    category: 'Exit Process',
    icon: FileText
  }
];

export function EmployeeChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      content: "Hello! I am your AI HR Assistant powered by Gemini. I'm here to provide answers to your questions about exit procedures, final pay, benefits continuation, leave policies, and other HR topics. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (messageContent?: string) => {
    const content = (messageContent || inputValue).trim();
    if (!content || isTyping) return;

    // Create and append user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      // Build conversation history for the LLM
      const history = nextMessages
        .filter(m => m.id !== 'welcome-1')
        .slice(-8)
        .map(m => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.content
        }));

      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestBody = JSON.stringify({
        message: content,
        history,
      });

      let res: Response;
      const targetEndpoint = API_BASE ? `${API_BASE}/api/chat` : '/api/chat';

      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: requestBody,
        });
      } catch (networkError) {
        // Fall back to targetEndpoint or localhost:5000 if direct relative URL failed
        res = await fetch(targetEndpoint !== '/api/chat' ? targetEndpoint : 'http://localhost:5000/api/chat', {
          method: 'POST',
          headers,
          body: requestBody,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || `Server responded with status ${res.status}`;
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const botResponseText = data.reply || data.message || "I apologize, but I could not generate a response.";

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        content: botResponseText,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const isApiKeyError = error?.message?.includes('GEMINI_API_KEY');
      const errorContent = isApiKeyError
        ? "⚠️ The Gemini API key is not yet configured on the server. Please set GEMINI_API_KEY in server/.env to enable live AI responses."
        : `⚠️ Sorry, I encountered an issue: ${error?.message || 'Unable to connect to the server'}. If the issue persists, please reach out to HR at hr@company.com or (555) 123-4567.`;

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        content: errorContent,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleSuggestedQuestion = (question: SuggestedQuestion) => {
    handleSendMessage(question.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const groupedSuggestions = suggestedQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, SuggestedQuestion[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            HR Assistant
            <Sparkles className="h-6 w-6 text-blue-500 inline-block" />
          </h1>
          <p className="text-muted-foreground">
            Get instant, AI-powered answers to your questions about exit procedures, benefits, and HR policies
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Suggested Questions Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Quick Questions
            </CardTitle>
            <CardDescription>
              Click any question to ask the AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedSuggestions).map(([category, questions]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                  {category}
                </h4>
                <div className="space-y-2">
                  {questions.map((question) => (
                    <Button
                      key={question.id}
                      variant="outline"
                      size="sm"
                      disabled={isTyping}
                      className="w-full justify-start text-left h-auto py-2 px-3 hover:border-primary/50 transition-colors"
                      onClick={() => handleSuggestedQuestion(question)}
                    >
                      <question.icon className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                      <span className="text-xs leading-snug">{question.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/20 bg-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  HR Assistant Chat
                </CardTitle>
                <CardDescription>
                  Powered by Gemini LLM • Safe, confidential HR guidance
                </CardDescription>
              </div>
              <div className="ml-auto">
                {isTyping ? (
                  <Badge variant="outline" className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Gemini AI Active
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 flex flex-col">
            {/* Messages Area */}
            <div className="h-[420px] overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-muted text-primary'
                    }>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col max-w-[80%] ${
                    message.sender === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`rounded-xl px-4 py-2.5 text-sm shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Dynamic Typing / Thinking Indicator */}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/80 border border-border/50 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-2.5 shadow-sm">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">AI Assistant is thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            {/* Input Area */}
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={isTyping ? "AI is generating a response..." : "Ask anything about exit processes, benefits, PTO, or company policy..."}
                    className="pr-4"
                    disabled={isTyping}
                  />
                </div>
                <Button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  size="default"
                  className="px-4"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1 sm:inline hidden" />
                      <span>Send</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                <span>Direct HR contact: <a href="mailto:hr@company.com" className="underline hover:text-foreground">hr@company.com</a> or (555) 123-4567</span>
                <span className="hidden sm:inline">Press Enter to send</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5 text-primary" />
            About the AI HR Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1 text-foreground">Live LLM Powered</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Integrated with Google Gemini to understand complex inquiries and provide tailored guidance in real time.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 text-foreground">HR Guidelines Aligned</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Trained on company offboarding procedures, COBRA timelines, equipment checklists, and leave policies.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 text-foreground">Human Support Escalation</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                For confidential inquiries, formal grievances, or personal exceptions, the bot guides you directly to your HR representative.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}