'use client';

import { useState } from 'react';
import { Check, Copy, ThumbsUp, ThumbsDown, Send, Loader2, Circle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

type ChatStyle = 'minimal' | 'modern' | 'bubble' | 'slack';

interface StyleOption {
  id: ChatStyle;
  name: string;
  description: string;
}

const styles: StyleOption[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Style actuel - Simple et fonctionnel',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Avatars, timestamps, boutons d\'action',
  },
  {
    id: 'bubble',
    name: 'Bubble',
    description: 'Style iMessage - Bulles arrondies colorées',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Dense et professionnel - Noms en gras',
  },
];

// Messages de démonstration
const demoMessages = [
  { role: 'user' as const, content: 'Crée un client Acme Corp avec ICE 123456789', time: '10:42' },
  { role: 'assistant' as const, content: 'J\'ai créé le client "Acme Corp" avec l\'ICE 123456789.\nTu veux que je crée un devis pour ce client ?', time: '10:43' },
  { role: 'user' as const, content: 'Oui, un devis de 5000€ pour conseil stratégique', time: '10:43' },
];

// Étapes de travail démo
const demoSteps = [
  { label: 'Analyse de la demande', status: 'completed' as const },
  { label: 'Recherche du client', status: 'completed' as const },
  { label: 'Création du devis', status: 'in_progress' as const },
];

// Suggestions démo
const demoSuggestions = ['Voir le client', 'Envoyer par email', 'Ajouter une ligne'];

// ============================================
// STYLE 1: MINIMAL (actuel)
// ============================================
function MinimalChat() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {demoMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Working Block Minimal */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="text-xs">▾</span>
            <span>En cours</span>
            <span className="text-xs text-gray-500">(2/3)</span>
          </div>
          <div className="space-y-1 text-sm">
            {demoSteps.map((step, i) => (
              <div key={i} className={`flex items-center gap-2 ${step.status === 'completed' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {step.status === 'completed' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-blue-600 animate-pulse">●</span>
                )}
                <span className={step.status === 'completed' ? 'line-through' : ''}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions Minimal */}
        <div className="flex flex-wrap gap-2">
          {demoSuggestions.map((s, i) => (
            <span key={i} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 cursor-pointer transition-colors">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Input Minimal */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Votre message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            readOnly
          />
          <Button size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STYLE 2: MODERN (avec avatars, timestamps, actions)
// ============================================
function ModernChat() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {demoMessages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
            }`}>
              {msg.role === 'user' ? 'SJ' : 'V'}
            </div>

            {/* Message + Meta */}
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              <div
                className={`group relative rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-card border border-border text-foreground rounded-bl-md shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {/* Actions pour assistant */}
                {msg.role === 'assistant' && (
                  <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setCopiedIndex(i)}
                    >
                      {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
            </div>
          </div>
        ))}

        {/* Working Block Modern */}
        <div className="ml-11 mt-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-foreground">En cours</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">2/3</span>
            </div>
            <div className="p-3 space-y-2">
              {demoSteps.map((step, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-sm ${step.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {step.status === 'completed' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : step.status === 'in_progress' ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={step.status === 'completed' ? 'line-through' : ''}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestions Modern */}
        <div className="ml-11 flex flex-wrap gap-2 mt-4">
          {demoSuggestions.map((s, i) => (
            <button
              key={i}
              className="px-3.5 py-2 text-sm bg-muted hover:bg-muted/80 border border-border hover:border-foreground/20 rounded-xl text-foreground transition-all hover:shadow-sm"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Modern */}
      <div className="border-t border-border p-4 bg-card">
        <div className="relative">
          <textarea
            placeholder="Écrivez votre message..."
            className="w-full px-4 py-3 pr-12 text-sm border-2 border-border rounded-2xl bg-background text-foreground focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
            rows={1}
            readOnly
          />
          <button className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STYLE 3: BUBBLE (iMessage-like)
// ============================================
function BubbleChat() {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {demoMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-[20px] px-4 py-2.5 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-[4px]'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-[4px]'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {/* Working Block Bubble */}
        <div className="flex justify-start">
          <div className="bg-white dark:bg-gray-800 rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm max-w-[75%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-500">En cours...</span>
            </div>
            <div className="space-y-1.5 text-sm">
              {demoSteps.map((step, i) => (
                <div key={i} className={`flex items-center gap-2 ${step.status === 'completed' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {step.status === 'completed' ? '✓' : step.status === 'in_progress' ? '◐' : '○'}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestions Bubble */}
        <div className="flex justify-center flex-wrap gap-2 pt-2">
          {demoSuggestions.map((s, i) => (
            <button
              key={i}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full shadow-sm text-blue-600 dark:text-blue-400 font-medium transition-all hover:scale-105"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bubble */}
      <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="iMessage"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
            readOnly
          />
          <button className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STYLE 4: SLACK (dense, professionnel)
// ============================================
function SlackChat() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {demoMessages.map((msg, i) => (
          <div key={i} className="flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded transition-colors">
            {/* Avatar Slack */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
              msg.role === 'user'
                ? 'bg-green-600 text-white'
                : 'bg-purple-600 text-white'
            }`}>
              {msg.role === 'user' ? 'SJ' : 'V'}
            </div>

            {/* Content Slack */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {msg.role === 'user' ? 'Simon J.' : 'Verifolio Bot'}
                </span>
                <span className="text-xs text-gray-500">{msg.time}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-0.5">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Working Block Slack */}
        <div className="flex gap-3 -mx-2 px-2 py-1">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Verifolio Bot</span>
              <span className="text-xs text-gray-500">10:43</span>
            </div>
            <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Traitement en cours
              </div>
              {demoSteps.map((step, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm py-0.5 ${step.status === 'completed' ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                  {step.status === 'completed' ? (
                    <span className="text-green-600">✓</span>
                  ) : step.status === 'in_progress' ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : (
                    <span className="text-gray-400">○</span>
                  )}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestions Slack */}
        <div className="flex gap-2 ml-12">
          {demoSuggestions.map((s, i) => (
            <button
              key={i}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Slack */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <textarea
            placeholder="Envoyer un message à #général"
            className="w-full px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
            rows={1}
            readOnly
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-1">
              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500">
                <span className="text-lg">📎</span>
              </button>
              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500">
                <span className="text-lg">😊</span>
              </button>
            </div>
            <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors">
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function ChatStylesPage() {
  const [selectedStyle, setSelectedStyle] = useState<ChatStyle>('minimal');
  const currentStyle = styles.find((s) => s.id === selectedStyle) || styles[0];

  const renderPreview = () => {
    switch (selectedStyle) {
      case 'minimal':
        return <MinimalChat />;
      case 'modern':
        return <ModernChat />;
      case 'bubble':
        return <BubbleChat />;
      case 'slack':
        return <SlackChat />;
      default:
        return <MinimalChat />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Styles de Chat</h1>
        <p className="text-muted-foreground mt-1">
          Comparez et choisissez le style d&apos;interface de chat qui vous convient
        </p>
      </div>

      {/* Style Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              ${selectedStyle === style.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-border hover:border-muted-foreground/50 bg-card'
              }
            `}
          >
            {selectedStyle === style.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="text-lg font-semibold block text-foreground">
              {style.name}
            </span>
            <span className="text-xs text-muted-foreground mt-1 block">
              {style.id === 'minimal' ? '(actuel)' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{currentStyle.name}:</span> {currentStyle.description}
        </p>
      </div>

      {/* Preview Area */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Preview Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <span className="text-sm font-medium text-muted-foreground">APERÇU EN DIRECT</span>
        </div>

        {/* Chat Preview */}
        <div className="h-[600px]">
          {renderPreview()}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="default"
          className="px-6"
          onClick={() => {
            alert(`Style sélectionné: ${currentStyle.name}\n\nPour appliquer ce style, il faudra modifier le composant ContextualChat.tsx`);
          }}
        >
          Appliquer {currentStyle.name}
        </Button>
      </div>
    </div>
  );
}
