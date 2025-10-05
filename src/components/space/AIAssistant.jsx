import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";

export default function AIAssistant({ threats, spaceObjects }) {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m NOVA, your AI defense assistant. 👋 I\'m here to help you understand debris threats, analyze collision risks, and recommend defense strategies. How can I assist you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Listen for object reports from CV system
  useEffect(() => {
    const handleReportObject = (event) => {
      const reportMessage = event.detail;
      setMessages(prev => [...prev, { role: 'user', content: reportMessage }]);
      handleAIResponse(reportMessage);
    };

    window.addEventListener('reportObject', handleReportObject);
    return () => window.removeEventListener('reportObject', handleReportObject);
  }, [threats, spaceObjects]);

  const handleAIResponse = async (userMessage) => {
    setIsLoading(true);

    try {
      const threatSummary = threats.slice(0, 5).map(t => 
        `${t.name} (${t.object_type}) - Threat: ${t.threat_level}, Impact: ${t.time_to_impact?.toFixed(1)}h, Probability: ${(t.collision_probability * 100).toFixed(1)}%`
      ).join('\n');
      
      const context = `You are NOVA, a friendly and helpful Space Defense AI assistant with expertise in orbital mechanics and collision avoidance.

Current Status:
- User Satellite: Altitude 550km, Velocity 7.5km/s
- Total Tracked Objects: ${spaceObjects.length}
- Active Threats: ${threats.length}

Top 5 Threats:
${threatSummary}

Be warm, conversational, and use emojis occasionally. Provide clear, actionable advice. If discussing threats, be informative but reassuring. 
CRITICAL: Do NOT use asterisks ** for bold text or any markdown formatting whatsoever. Use plain text only with emojis for emphasis.
If the user is reporting a new object from the CV system, acknowledge it and provide analysis.`;
      
      const response = await InvokeLLM({
        prompt: `${context}\n\nUser: ${userMessage}\n\nNOVA (respond warmly and helpfully in plain text without any markdown or asterisks):`,
      });

      // Aggressively remove all markdown formatting
      const cleanResponse = response
        .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
        .replace(/\*(.*?)\*/g, '$1')      // Remove italic
        .replace(/__(.*?)__/g, '$1')      // Remove underline
        .replace(/_(.*?)_/g, '$1');        // Remove italic alt

      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Oops! I\'m having trouble accessing my systems right now. 😅 Please try asking again in a moment!' 
      }]);
    }
    
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    
    await handleAIResponse(userMessage);
  };

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="border-b border-[#6366f1]/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide text-sm">
          <div className="relative">
            <Bot className="w-5 h-5 text-[#6366f1]" />
            <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          NOVA AI ASSISTANT
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4" style={{ maxHeight: '300px' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-[#6366f1] text-white rounded-br-none'
                    : 'bg-[#1e293b] text-gray-200 border border-[#6366f1]/20 rounded-bl-none'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-[#6366f1] font-semibold">
                    <Bot className="w-3 h-3" />
                    NOVA
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1e293b] text-gray-200 border border-[#6366f1]/20 p-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#6366f1]" />
                  <span className="text-sm text-gray-400">NOVA is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask NOVA anything about space threats..."
            className="bg-[#1e293b] border-[#6366f1]/30 text-white placeholder:text-gray-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-[#6366f1] hover:bg-[#4f46e5] h-auto"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}